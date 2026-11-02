import { supabase } from './supabase.js';

// Any Apple device: iPhone, iPad, iPod or Mac.
// These all have a share menu with "Save Image"/"Save Video" (iPhone/iPad) or "Photos" (Mac).
// (New iPads call themselves "Macintosh" too, which is fine: same answer.)
export function isAppleDevice() {
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}

const pad = (n) => String(n).padStart(2, '0');

// e.g. antigallery_2026-11-02_2015_a3f9.jpg (sorts nicely by date in Files/Downloads)
export function fileNameFor(photo) {
  const ext = photo.path.split('.').pop();
  const d = new Date(photo.taken_at);
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `antigallery_${stamp}_${photo.id.slice(0, 4)}.${ext}`;
}

function guessType(photo) {
  const ext = photo.path.split('.').pop().toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';
  return 'application/octet-stream';
}

// Download the file into memory and wrap it as a File (needed for the share sheet)
export async function fetchAsFile(photo) {
  const { publicUrl } = supabase.storage.from('photos').getPublicUrl(photo.path).data;
  const res = await fetch(publicUrl);
  if (!res.ok) throw new Error('could not download this file');
  const blob = await res.blob();
  return new File([blob], fileNameFor(photo), { type: blob.type || guessType(photo) });
}

// Can this browser put this file in the share sheet?
export function canShareFile(file) {
  return Boolean(navigator.canShare && navigator.canShare({ files: [file] }));
}

// Normal download (Android → Gallery's Download album, laptop → Downloads folder).
// Supabase adds a header that says "download this, don't open it".
export function downloadDirect(photo) {
  const { publicUrl } = supabase.storage
    .from('photos')
    .getPublicUrl(photo.path, { download: fileNameFor(photo) }).data;

  const a = document.createElement('a');
  a.href = publicUrl;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}