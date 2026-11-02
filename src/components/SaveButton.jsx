import { useEffect, useRef, useState } from 'react';
import { isAppleDevice, fetchAsFile, canShareFile, downloadDirect } from '../lib/save.js';

const LABELS = {
  idle: '↓ save',
  preparing: 'preparing…',
  ready: 'tap again to save',
  done: 'saved ✓',
  error: "couldn't save, try again",
};

export default function SaveButton({ photo, className = 'fb-save', labels = LABELS }) {
  const [state, setState] = useState('idle');
  const fileRef = useRef(null);       // the downloaded File, kept so a second tap is instant

  // A different photo → forget the old file
  useEffect(() => {
    fileRef.current = null;
    setState('idle');
  }, [photo.id]);

  // "saved ✓" goes back to "↓ save" after 2.5s
  useEffect(() => {
    if (state !== 'done') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  async function openShareSheet(file) {
    try {
      // files ONLY: adding a title/text makes iOS hide "Save Image"
      await navigator.share({ files: [file] });
      setState('done');
    } catch (err) {
      if (err.name === 'AbortError') setState('idle');          // they closed the sheet
      else if (err.name === 'NotAllowedError') setState('ready'); // Safari: tap took too long → tap again
      else throw err;
    }
  }

  async function handleClick() {
     // Android, Windows, Linux, or an older browser with no share menu: plain download
    if (!isAppleDevice() || !navigator.share) {
      downloadDirect(photo);
      setState('done');
      return;
    }

    // iPhone / iPad: share sheet → "Save Image" / "Save Video"
    try {
      if (fileRef.current) {
        await openShareSheet(fileRef.current);
        return;
      }
      setState('preparing');
      const file = await fetchAsFile(photo);
      fileRef.current = file;

      if (!canShareFile(file)) {          // very old iOS: fall back to a download
        downloadDirect(photo);
        setState('done');
        return;
      }
      await openShareSheet(file);
    } catch (err) {
      console.error('save failed:', err);
      setState('error');
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={state === 'preparing'}
      aria-label="save to your device"
    >
    {labels[state]}
    </button>
  );
}