import { photoUrl } from '../lib/supabase.js';

// Simple grid so we can see uploads working. The Flowerbed replaces this in session 4.
export default function PhotoGrid({ photos }) {
  if (photos.length === 0) {
    return <p className="small muted" style={{ textAlign: 'center' }}>no photos yet 🌱</p>;
  }

  const newestFirst = [...photos].sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at));

  return (
    <div className="photo-grid">
      {newestFirst.map((photo) => (
        <figure key={photo.id} className="thumb">
          {photo.kind === 'video' ? (
            <>
              {/* #t=0.1 makes phones show the first frame instead of black */}
              <video src={`${photoUrl(photo.path)}#t=0.1`} muted playsInline preload="metadata" />
              <span className="play-badge">▶</span>
            </>
          ) : (
            <img src={photoUrl(photo.path)} alt="" loading="lazy" />
          )}
          {photo.uploader && <figcaption className="small muted">{photo.uploader}</figcaption>}
        </figure>
      ))}
    </div>
  );
}