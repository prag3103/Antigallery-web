import { useEffect, useMemo, useRef, useState } from 'react';
import { groupIntoClusters } from '../../lib/clusters.js';
import { photoUrl } from '../../lib/supabase.js';
import ClusterSection from './ClusterSection.jsx';

const FLOWERS = ['/flowers/flower1.png', '/flowers/flower2.png', '/flowers/flower3.png'];

// ---- layout rules (all sizes are "at scale 1") ----
const FLOWER = 300;              // flower size
const CARD = 170;                // card width
const GAP_NARROW = 24;           // gap between flower and card on phones
const GAP_WIDE = 56;             // gap on tablets/laptops
const NARROW_BELOW = 520;        // px of usable width that counts as "phone"
const SIDE_PADDING = 32;         // 16px each side of a row
const MAX_FLOWER_HEIGHT = 0.45;  // a flower may use at most 45% of the window height
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.3;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Pure maths: given the flowerbed width and window height → scale + gap
function layoutFor(width, windowHeight) {
  const available = width - SIDE_PADDING;
  const gap = available < NARROW_BELOW ? GAP_NARROW : GAP_WIDE;

  const byWidth = available / (FLOWER + gap + CARD);            // row must fit across
  const byHeight = (windowHeight * MAX_FLOWER_HEIGHT) / FLOWER; // flower must fit down

  return { scale: clamp(Math.min(byWidth, byHeight), MIN_SCALE, MAX_SCALE), gap };
}

// Watches both: the flowerbed's width (ResizeObserver) and the window's height (resize event)
function useLayout(ref) {
  const [width, setWidth] = useState(() => window.innerWidth);
  const [height, setHeight] = useState(() => window.innerHeight);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return layoutFor(width, height);
}

// The Flowerbed theme: one group per time cluster, newest first, zig-zagging.
export default function Flowerbed({ photos, onOpen }) {
  const ref = useRef(null);
  const clusters = useMemo(() => groupIntoClusters(photos), [photos]);
  const { scale, gap } = useLayout(ref);

  const open = onOpen || ((photo) => window.open(photoUrl(photo.path), '_blank'));

  return (
    // --gap is a CSS variable every row inside can read
    <div className="flowerbed" ref={ref} style={{ '--gap': gap }}>
      {photos.length === 0 && <p className="small muted fb-empty">no photos yet 🌱</p>}

      {clusters.map((cluster, i) => (
        <ClusterSection
          key={cluster.key}
          cluster={cluster}
          flowerSrc={FLOWERS[i % FLOWERS.length]}
          flowerOnLeft={i % 2 === 0}
          scale={scale}
          delay={Math.min(i * 0.15, 0.45)}
          onOpen={open}
        />
      ))}
    </div>
  );
}