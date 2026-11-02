import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useSession } from '../lib/useSession.js';
import SharePanel from '../components/SharePanel.jsx';
import UploadButton from '../components/UploadButton.jsx';
import Flowerbed from '../components/flowerbed/FlowerBed.jsx';
import ViewToggle, { useViewMode } from '../components/ViewToggle.jsx';
import GridView from '../components/GridView.jsx';

export default function GalleryPage() {
  const { galleryId } = useParams();
  const { user } = useSession();
  const [gallery, setGallery] = useState(null);
  const [status, setStatus] = useState('loading');       // 'loading' | 'ready' | 'missing'
  const [photos, setPhotos] = useState([]);
  const [photosVersion, setPhotosVersion] = useState(0); // bump this to reload photos
  const [view, setView] = useViewMode();                 // NEW: 'flowers' | 'grid', remembered

  // 1. Load the gallery (only works if the link allows it, or you're the owner)
  useEffect(() => {
    supabase.rpc('get_gallery', { gid: galleryId }).then(({ data, error }) => {
      if (error || !data || data.length === 0) {
        setStatus('missing');
      } else {
        setGallery(data[0]);
        setStatus('ready');
      }
    });
  }, [galleryId, user?.id]);

  // 2. Load its photos, and again whenever photosVersion changes
  useEffect(() => {
    if (status !== 'ready') return;
    supabase.rpc('get_photos', { gid: galleryId }).then(({ data, error }) => {
      if (!error) setPhotos(data);
    });
  }, [galleryId, status, photosVersion]);

  // ---- everything above this line is hooks; early returns only from here down ----

  if (status === 'loading') {
    return <main className="page center"><p className="small muted">loading…</p></main>;
  }

  if (status === 'missing') {
    return (
      <main className="page center">
        <h1 className="wordmark">Antigallery</h1>
        <p className="small" style={{ maxWidth: 320 }}>
          this gallery isn't available. the link may be switched off, or it doesn't exist.
        </p>
      </main>
    );
  }

  const isOwner = user && user.id === gallery.owner_id;
  const canAdd = isOwner || gallery.link_access === 'contribute';

  return (
    <main className="page">
      {isOwner && <Link to="/" className="small muted">← your library</Link>}

      <header style={{ textAlign: 'center', margin: '24px 0 32px' }}>
        <h1 className="wordmark">{gallery.name}</h1>
        <p className="small muted">
          {view === 'grid' ? 'all photos' : 'the flowerbed of memories'} · {photos.length} memories
          {isOwner ? ' · you own this gallery' : canAdd ? ' · you can add photos' : ''}
        </p>
      </header>

      <div className="gallery-tools">
        {isOwner && <SharePanel gallery={gallery} />}
        {canAdd && (
          <UploadButton
            galleryId={gallery.id}
            onUploaded={() => setPhotosVersion((v) => v + 1)}
          />
        )}
      </div>

      {/* NEW: the switch, then whichever view is picked */}
      {photos.length > 0 && <ViewToggle mode={view} onChange={setView} />}
      {view === 'grid' ? <GridView photos={photos} /> : <Flowerbed photos={photos} />}
    </main>
  );
}