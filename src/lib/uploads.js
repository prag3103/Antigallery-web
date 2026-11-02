import exifr from 'exifr';
import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

// ---------- limits ----------
const MAX_UPLOAD_BYTES   = 50 * 1024 * 1024; // Supabase free plan: 50 MB per file
const VIDEO_TARGET_BYTES = 45 * 1024 * 1024; // aim a bit under, for safety
const VIDEO_MAX_SIDE     = 1280;             // 720p (long side)
const VIDEO_MAX_BITRATE  = 3_000_000;        // 3 Mbps = good-looking 720p
const VIDEO_MIN_BITRATE  = 700_000;          // below this it looks bad → "too long"
const AUDIO_BUDGET       = 256_000;          // bits/sec we leave for the sound

// ---------- what kind of file is this? ----------
function kindOf(file) {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  if (type.startsWith('video/') || /\.(mov|mp4|m4v|webm)$/.test(name)) return 'video';
  if (type === 'image/heic' || type === 'image/heif' || /\.(heic|heif)$/.test(name)) return 'heic';
  if (type === 'image/jpeg' || type === 'image/png' || /\.(jpe?g|png)$/.test(name)) return 'image';
  return null;
}

// ---------- dates ----------
function fileDate(file) {
  return new Date(file.lastModified || Date.now()).toISOString();
}

async function readPhotoDate(file) {
  try {
    const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
    const date = exif?.DateTimeOriginal || exif?.CreateDate;
    if (date instanceof Date && !isNaN(date)) return date.toISOString();
  } catch {
    // no EXIF (screenshots, PNGs), so fall through
  }
  return fileDate(file);
}

// ---------- photos ----------
async function heicToJpeg(file) {
  const { heicTo } = await import('heic-to');
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
}

async function compressPhoto(file) {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  });
}

// ---------- videos ----------
// returns { blob, recordedAt } (recordedAt can be null)
async function compressVideo(file, onStage) {
  const {
    Input, Output, Conversion, BlobSource, BufferTarget,
    Mp4OutputFormat, ALL_FORMATS, Quality,
  } = await import('mediabunny');

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('could not read this video');

  // NEW: the date the video was recorded, from the file's own metadata
  let recordedAt = null;
  try {
    const tags = await input.getMetadataTags();
    const d = tags.date || tags.creationTime;
    if (d instanceof Date && !isNaN(d) && d.getFullYear() > 2000) recordedAt = d.toISOString();
  } catch {
    // no tags: we'll fall back to the file date
  }

  const duration = await track.computeDuration();
  const width    = await track.getDisplayWidth();
  const height   = await track.getDisplayHeight();

  const affordable = Math.floor((VIDEO_TARGET_BYTES * 8) / duration) - AUDIO_BUDGET;
  const bitrate = Math.min(VIDEO_MAX_BITRATE, affordable);
  if (bitrate < VIDEO_MIN_BITRATE) {
    const maxMinutes = Math.floor((VIDEO_TARGET_BYTES * 8) / (VIDEO_MIN_BITRATE + AUDIO_BUDGET) / 60);
    throw new Error(`this video is too long, clips up to about ${maxMinutes} minutes please`);
  }

  const scale = Math.min(1, VIDEO_MAX_SIDE / Math.max(width, height));
  const even = (n) => Math.max(2, Math.round(n / 2) * 2);

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({
    input,
    output,
    video: {
      width: even(width * scale),
      height: even(height * scale),
      fit: 'contain',
      codec: 'avc',
      quality: new Quality({ bitrate }),
    },
  });

  if (!conversion.isValid) throw new Error('this browser cannot convert this video');

  conversion.onProgress = (p) => onStage(`compressing video ${Math.round(p * 100)}%`);
  await conversion.execute();

  return { blob: new Blob([output.target.buffer], { type: 'video/mp4' }), recordedAt };
}

// ---------- the main upload ----------
export async function uploadOne(file, galleryId, uploader, onStage = () => {}) {
  const kind = kindOf(file);
  if (!kind) throw new Error('only HEIC, PNG and JPEG photos (and videos) are supported');

  let body, ext, contentType, takenAt;

  if (kind === 'video') {
    takenAt = fileDate(file);
    try {
      onStage('preparing video');
      const result = await compressVideo(file, onStage);
      body = result.blob;
      if (result.recordedAt) takenAt = result.recordedAt;
      ext = 'mp4';
      contentType = 'video/mp4';
    } catch (err) {
      console.warn('video compression failed:', err);
      if (file.size > MAX_UPLOAD_BYTES) throw err;
      body = file;
      ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
      contentType = file.type || 'video/mp4';
    }
    if (body.size > MAX_UPLOAD_BYTES) {
      throw new Error('still over 50 MB after compressing, try a shorter clip');
    }
  } else {
    takenAt = await readPhotoDate(file);
    let source = file;
    if (kind === 'heic') {
      onStage('converting');
      source = await heicToJpeg(file);
    }
    onStage('compressing');
    body = await compressPhoto(source);
    ext = 'jpg';
    contentType = 'image/jpeg';
  }

  onStage('uploading');
  const id = crypto.randomUUID();
  const path = `${galleryId}/${id}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('photos')
    .upload(path, body, { contentType, cacheControl: '31536000', upsert: false });
  if (upErr) throw upErr;

  const { error: dbErr } = await supabase.from('photos').insert({
    id,
    gallery_id: galleryId,
    path,
    taken_at: takenAt,
    uploader,
    kind: kind === 'video' ? 'video' : 'photo',
  });
  if (dbErr) throw dbErr;
}