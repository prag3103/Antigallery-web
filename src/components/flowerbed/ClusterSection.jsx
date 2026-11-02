import { useEffect, useRef, useState } from 'react';
import FlowerView, { PETAL_ANGLES } from './FlowerView.jsx';
import FeaturedPhotoCard from './FeaturedPhotoCard.jsx';

// One row: heading, flower and the big photo, on alternating sides.
export default function ClusterSection({ cluster, flowerSrc, flowerOnLeft, scale, delay, onOpen }) {
  const { photos } = cluster;
  const [index, setIndex] = useState(0);
  const [bloomed, setBloomed] = useState(false);
  const ref = useRef(null);

  // Bloom when the row scrolls into view
  useEffect(() => {
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBloomed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const safeIndex = Math.min(index, photos.length - 1);
  const current = photos[safeIndex];

  const flower = (
    <FlowerView
      photos={photos}
      flowerSrc={flowerSrc}
      index={safeIndex}
      onIndexChange={setIndex}
      scale={scale}
    />
  );
  const card = (
    <FeaturedPhotoCard
      photo={current}
      position={safeIndex + 1}
      total={photos.length}
      onOpen={() => onOpen(current, photos, safeIndex)}
    />
  );

  return (
    <section
      ref={ref}
      className={`fb-cluster ${flowerOnLeft ? 'left' : 'right'}${bloomed ? ' is-bloomed' : ''}`}
      style={{ '--delay': `${delay}s`, '--s': scale }}
    >
      <div className="fb-group">
        <h2 className="fb-title fb-fade">{cluster.title}</h2>
        {cluster.subtitle && <p className="fb-subtitle fb-fade">{cluster.subtitle}</p>}

        <div className="fb-row">
          {flowerOnLeft ? <>{flower}{card}</> : <>{card}{flower}</>}
        </div>

              {photos.length > 1 && (
        <p className="fb-hint fb-fade">
          {photos.length > PETAL_ANGLES.length
            ? 'spin the flower to explore ↻'
            : 'spin the flower or tap a photo ↻'}
        </p>
      )}
      </div>
    </section>
  );
}