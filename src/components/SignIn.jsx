import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function sendLink(event) {
    event.preventDefault();               // stop the browser reloading the page
    setError('');
    setSending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }, // come back to this site
    });

    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="page center">
      <h1 className="wordmark">Antigallery</h1>
      <p className="small">creative galleries to store your memories</p>

      {sent ? (
        <p className="small" style={{ marginTop: 32, maxWidth: 320 }}>
          check your inbox ✉️ — tap the link in the email from Supabase to sign in.
        </p>
      ) : (
        <form onSubmit={sendLink} className="stack" style={{ marginTop: 32 }}>
          <input
            className="field"
            type="email"
            required
            placeholder="your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="pill" type="submit" disabled={sending}>
            {sending ? 'sending…' : 'sign in'}
          </button>
          <p className="small muted">to create galleries. guests don't need an account.</p>
        </form>
      )}

      {error && <p className="small error">{error}</p>}
    </main>
  );
}