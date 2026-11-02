import { useEffect, useRef, useState } from 'react';
import { uploadOne } from '../lib/uploads.js';

// The browser remembers a guest's name between visits.
// try/catch because private browsing can block localStorage.
function savedName() {
  try { return localStorage.getItem('antigallery-name') || ''; } catch { return ''; }
}
function saveName(name) {
  try { localStorage.setItem('antigallery-name', name); } catch { /* ignore */ }
}

export default function UploadButton({ galleryId, onUploaded }) {
  const inputRef = useRef(null);                  // handle to the hidden file picker
  const [name, setName] = useState(savedName);
  const [progress, setProgress] = useState(null); // { done, total, stage } while uploading
  const [failures, setFailures] = useState([]);

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';                      // so picking the same files again still works
    if (files.length === 0) return;

    saveName(name.trim());
    setFailures([]);
    setProgress({ done: 0, total: files.length, stage: 'starting' });

    const failed = [];
    for (const [index, file] of files.entries()) {
      try {
        // uploadOne calls this with 'converting', 'compressing video 40%', 'uploading', etc.
        await uploadOne(file, galleryId, name.trim(), (stage) =>
          setProgress({ done: index, total: files.length, stage })
        );
      } catch (err) {
        failed.push(`${file.name}: ${err.message}`);
      }
      setProgress({ done: index + 1, total: files.length, stage: 'uploading' });
    }

    setFailures(failed);
    setProgress(null);
    onUploaded();                                 // tell the gallery to reload its photos
  }

  const busy = progress !== null;

  // While uploading, closing or leaving the page makes the browser ask "leave site?"
  useEffect(() => {
    if (!busy) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  return (
    <section className="card stack" style={{ margin: '0 auto', textAlign: 'left' }}>
      <strong>add to this gallery</strong>

      <input
        className="field"
        placeholder="your name (shown on your photos)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        disabled={busy}
      />

      {/* The real file picker is hidden; the pill button opens it */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,video/*,.mov,.mp4,.m4v"
        multiple
        hidden
        onChange={handleFiles}
      />
      <button className="pill" onClick={() => inputRef.current.click()} disabled={busy}>
        {busy
          ? `${Math.min(progress.done + 1, progress.total)} / ${progress.total} · ${progress.stage}…`
          : 'add photos'}
      </button>

      <p className="small muted">
        JPEG, PNG, HEIC photos and videos · videos shrink to 720p (up to ~7 min) ·
        location data removed · keep this page open while uploading
      </p>

      {failures.length > 0 && (
        <ul className="small error" style={{ paddingLeft: 18, margin: 0 }}>
          {failures.map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}
    </section>
  );
}