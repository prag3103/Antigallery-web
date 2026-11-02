import { useMemo } from 'react';
import { groupIntoClusters } from '../lib/clusters.js';
import { photoUrl } from '../lib/supabase.js';
import Thumb from './flowerbed/Thumb.jsx';
import SaveButton from './SaveButton.jsx';

const COMPACT_LABELS = { idle: '↓', preparing: '…', ready: 'tap', done: '✓', error: '!' };

// iPhone-Photos-style grid, grouped by the same time clusters as the Flowerbed
export default function GridView({ photos, onOpen }) {
  const clusters = useMemo(() => groupIntoClusters(photos), [photos]);
  const open = onOpen || ((photo) => window.open(photoUrl(photo.path), '_blank'));

  if (photos.length === 0) return <p className="small muted">no photos yet 🌱</p>;

  return (
    <div className="grid-view">
      {clusters.map((cluster) => {
        const newestFirst = [...cluster.photos].reverse();

        return (
          <section key={cluster.key} className="grid-section">
            {/* sticky header: stays at the top while you scroll through this group */}
            <div className="grid-header">
              <h2 className="grid-title">{cluster.title}</h2>
              <span className="grid-subtitle">
                {cluster.subtitle ? `${cluster.subtitle} · ` : ''}
                {newestFirst.length} {newestFirst.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="grid-tiles">
              {newestFirst.map((photo, i) => (
                <div key={photo.id} className="grid-tile">
                  <button
                    type="button"
                    className="grid-open"
                    onClick={() => open(photo, newestFirst, i)}
                    aria-label="open photo"
                  >
                    <Thumb photo={photo} />
                  </button>

                  {photo.kind === 'video' && <span className="grid-video">▶</span>}
                  <SaveButton photo={photo} className="grid-save" labels={COMPACT_LABELS} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}