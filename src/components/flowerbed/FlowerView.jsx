import { useEffect, useRef, useState } from 'react';
import Thumb from './Thumb.jsx';

// Petal directions in degrees, clockwise, 0 = straight up (same as iOS)
export const PETAL_ANGLES = [0, 72, 144, 216, 288];
const PETALS = PETAL_ANGLES.length;
const STEP = 360 / PETALS;
const TAP_SLOP = 4;   // if the finger moved less than 4° in total, it was a tap, not a spin

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// A ring-shaped touch area (circle with a hole), like RingShape in Swift.
function ringClipPath(size, holeFraction) {
  const c = size / 2;
  const circle = (r) =>
    `M ${c - r} ${c} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  return `path(evenodd, "${circle(size / 2)} ${circle((size * holeFraction) / 2)}")`;
}

export default function FlowerView({ photos, flowerSrc, index, onIndexChange, scale = 1 }) {
  // ---- sizes (your tuned iOS numbers) ----
  const flowerSize = 300 * scale;
  const tileSize = 48 * scale;
  const radius = 95 * scale;
  const frameSize = flowerSize;

  const last = Math.max(photos.length - 1, 0);
  const maxRotation = last * STEP;

  // ---- spin state ----
  const [raw, setRawState] = useState(index * STEP);
  const rawRef = useRef(raw);
  const setRaw = (v) => { rawRef.current = v; setRawState(v); };

  const dragRef = useRef(null);
  const animRef = useRef(0);
  const reportedRef = useRef(index);

  // Rubber band: past the first/last photo it only moves 30% as much
  const rotation =
    raw < 0 ? raw * 0.3 :
    raw > maxRotation ? maxRotation + (raw - maxRotation) * 0.3 :
    raw;

  const liveIndex = clamp(Math.round(rotation / STEP), 0, last);

  // ---- smooth animation to a target rotation ----
  function animateTo(target) {
    cancelAnimationFrame(animRef.current);
    const from = rawRef.current;
    const startTime = performance.now();
    const duration = 500;

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setRaw(from + (target - from) * eased);
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // Tell the parent which photo is on top
  useEffect(() => {
    reportedRef.current = liveIndex;
    onIndexChange(liveIndex);
    if (dragRef.current && navigator.vibrate) navigator.vibrate(4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveIndex]);

  // If the index is changed from outside (the full-screen viewer), spin to match
  useEffect(() => {
    if (index !== reportedRef.current && !dragRef.current) animateTo(index * STEP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // ---- the reel: which photo sits on which petal ----
  const lowest = liveIndex - Math.floor(PETALS / 2);
  const slots = PETAL_ANGLES.map((petalAngle, petal) => {
    const photoIndex = lowest + mod(-petal - lowest, PETALS);
    if (photoIndex < 0 || photoIndex > last) return null;
    const a = ((petalAngle + rotation) * Math.PI) / 180;
    return {
      photo: photos[photoIndex],
      photoIndex,                         // NEW: needed for tap-to-jump
      active: photoIndex === liveIndex,
      x: Math.sin(a) * radius,
      y: -Math.cos(a) * radius,
    };
  }).filter(Boolean);

  // ---- the gesture ----
  function pointerInfo(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    return {
      dx,
      dy,
      angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
      dist: Math.hypot(dx, dy),
    };
  }

  function handleDown(e) {
    cancelAnimationFrame(animRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      lastAngle: pointerInfo(e).angle,
      moved: 0,                                       // NEW: total degrees turned
      samples: [{ t: e.timeStamp, r: rawRef.current }],
    };
  }

  function handleMove(e) {
    const drag = dragRef.current;
    if (!drag) return;

    const { angle, dist } = pointerInfo(e);
    if (dist < flowerSize * 0.15) {
      drag.lastAngle = null;
      return;
    }
    if (drag.lastAngle !== null) {
      let diff = angle - drag.lastAngle;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      drag.moved += Math.abs(diff);
      setRaw(rawRef.current + diff);
    }
    drag.lastAngle = angle;

    drag.samples.push({ t: e.timeStamp, r: rawRef.current });
    drag.samples = drag.samples.filter((s) => e.timeStamp - s.t < 100);
  }

  function handleUp(e) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    // NEW: a tap (barely moved) on a petal photo → spin straight to that photo
    if (drag.moved < TAP_SLOP) {
      const { dx, dy } = pointerInfo(e);
      const hit = slots.find(
        (s) => Math.hypot(dx - s.x, dy - s.y) < tileSize * 0.75
      );
      animateTo((hit ? hit.photoIndex : liveIndex) * STEP);
      return;
    }

    const first = drag.samples[0];
    const latest = drag.samples[drag.samples.length - 1];
    const seconds = (e.timeStamp - first.t) / 1000;
    const velocity = seconds > 0 ? (latest.r - first.r) / seconds : 0;

    const coast = clamp(velocity * 0.25, -15 * STEP, 15 * STEP);
    const target = clamp(Math.round((rawRef.current + coast) / STEP), 0, last) * STEP;
    animateTo(target);
  }

  function handleKey(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      animateTo(Math.min(liveIndex + 1, last) * STEP);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      animateTo(Math.max(liveIndex - 1, 0) * STEP);
    }
  }

  const offset = (frameSize - flowerSize) / 2;

  return (
    <div className="fb-flower" style={{ width: frameSize, height: frameSize }}>
      <div className="fb-bloom">
        <div
          className="fb-spin"
          style={{
            width: flowerSize,
            height: flowerSize,
            left: offset,
            top: offset,
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <img src={flowerSrc} alt="" draggable={false} />
          <div
            className="fb-glow"
            style={{ WebkitMaskImage: `url(${flowerSrc})`, maskImage: `url(${flowerSrc})` }}
          >
            <div className="fb-wedge" style={{ transform: `rotate(${-liveIndex * STEP}deg)` }} />
          </div>
        </div>
      </div>

      <div className="fb-thumbs">
        {slots.map(({ photo, active, x, y }) => (
          <div
            key={photo.id}
            className={`fb-thumb${active ? ' active' : ''}`}
            style={{
              width: tileSize,
              height: tileSize,
              left: frameSize / 2 + x - tileSize / 2,
              top: frameSize / 2 + y - tileSize / 2,
            }}
          >
            <Thumb photo={photo} size={tileSize} />
          </div>
        ))}
      </div>

      <div
        className="fb-ring"
        style={{ clipPath: ringClipPath(frameSize, 0.3) }}
        role="slider"
        tabIndex={0}
        aria-label="spin to move through photos"
        aria-valuemin={1}
        aria-valuemax={photos.length}
        aria-valuenow={liveIndex + 1}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onKeyDown={handleKey}
      />
    </div>
  );
}