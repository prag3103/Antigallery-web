import Thumb from './Thumb.jsx';
import SaveButton from '../SaveButton.jsx';

// The big photo next to each flower, now with its own save button.
export default function FeaturedPhotoCard({ photo, position, total, onOpen }) {
  const date = new Date(photo.taken_at).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="fb-card">
      <button type="button" className="fb-card-open" onClick={onOpen} aria-label="open photo">
        <div className="fb-card-photo" key={photo.id}>
          <Thumb photo={photo} />
          {photo.kind === 'video' && <span className="fb-play">▶</span>}
        </div>
      </button>

      <span>{date}</span>
      {photo.uploader && <span className="fb-muted">by {photo.uploader}</span>}

      <span className="fb-card-meta">
        <span className="fb-muted">{position} / {total}</span>
        <SaveButton photo={photo} />
      </span>
    </div>
  );
}