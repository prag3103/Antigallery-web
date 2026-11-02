import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useSession } from '../lib/useSession.js';
import { newGalleryId } from '../lib/ids.js';
import SignIn from '../components/SignIn.jsx';

export default function Home() {
  const { user, loading } = useSession();

  if (loading) {
    return <main className="page center"><p className="small muted">loading…</p></main>;
  }
  if (!user) return <SignIn />;
  return <Library user={user} />;
}

// Your library of galleries (only shown when signed in)
function Library({ user }) {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // The security rules only return YOUR galleries
    supabase
      .from('galleries')
      .select('id, name, link_access, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setGalleries(data);
      });
  }, []);

  async function createGallery(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    setError('');
    const id = newGalleryId();
    const { error } = await supabase.from('galleries').insert({ id, name: trimmed });
    setCreating(false);

    if (error) setError(error.message);
    else navigate(`/g/${id}`);          // open the new gallery
  }

  return (
    <main className="page">
      <header className="library-header">
        <div>
          <h1 className="wordmark">Antigallery</h1>
          <p className="small">your library of galleries</p>
        </div>
        <div className="small muted" style={{ textAlign: 'right' }}>
          {user.email}
          <br />
          <button className="text-button" onClick={() => supabase.auth.signOut()}>sign out</button>
        </div>
      </header>

      <form onSubmit={createGallery} className="row" style={{ margin: '32px 0' }}>
        <input
          className="field"
          placeholder="new gallery name, e.g. Diwali 26'"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <button className="pill" type="submit" disabled={creating}>
          {creating ? 'creating…' : '+ create'}
        </button>
      </form>

      {error && <p className="small error">{error}</p>}

      {galleries.length === 0 ? (
        <p className="small muted">no galleries yet — make your first one above.</p>
      ) : (
        <div className="tiles">
          {galleries.map((gallery) => (
            <Link key={gallery.id} to={`/g/${gallery.id}`} className="tile">
              <div className="tile-cover" />
              <span className="small">{gallery.name}</span>
              <span className="small muted">
                {gallery.link_access === 'private' ? 'private'
                  : gallery.link_access === 'view' ? 'shared · view'
                  : 'shared · can add'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}