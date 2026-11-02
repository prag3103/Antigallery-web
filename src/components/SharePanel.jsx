import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const OPTIONS = [
  { value: 'private',    label: 'off — only you' },
  { value: 'view',       label: 'anyone with the link can view' },
  { value: 'contribute', label: 'anyone with the link can add photos' },
];

export default function SharePanel({ gallery }) {
  const [access, setAccess] = useState(gallery.link_access);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const link = `${window.location.origin}/g/${gallery.id}`;
  const canNativeShare = typeof navigator.share === 'function'; // phones + Safari

  async function changeAccess(value) {
    const previous = access;
    setAccess(value);          // update the dropdown straight away…
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('galleries')
      .update({ link_access: value })
      .eq('id', gallery.id);

    setSaving(false);
    if (error) {
      setAccess(previous);     // …and undo it if saving failed
      setError(error.message);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);  // "copied ✓" for 2 seconds
  }

  async function shareLink() {
    try {
      await navigator.share({
        title: gallery.name,
        text: `add your photos to "${gallery.name}" on Antigallery`,
        url: link,
      });
    } catch {
      // they closed the share sheet — nothing to do
    }
  }

  return (
    <section className="card stack" style={{ textAlign: 'left' }}>
      <strong>share</strong>

      <label className="small muted" htmlFor="access">link access</label>
      <select
        id="access"
        className="field"
        value={access}
        onChange={(e) => changeAccess(e.target.value)}
        disabled={saving}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {access !== 'private' && (
        <>
          <input className="field small" readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="row">
            <button className="pill small" onClick={copyLink}>
              {copied ? 'copied ✓' : 'copy link'}
            </button>
            {canNativeShare && (
              <button className="pill small" onClick={shareLink}>share…</button>
            )}
          </div>
        </>
      )}

      {error && <p className="small error">{error}</p>}
    </section>
  );
}