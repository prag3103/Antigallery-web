import { photoUrl } from '../../lib/supabase.js';

// A square photo, or the first frame of a video.
// With `size` it's a fixed square; without it, it fills whatever box it's in.
export default function Thumb({ photo, size }) {
  const src = photoUrl(photo.path);
  const style = size ? { width: size, height: size } : { width: '100%', height: '100%' };

  if (photo.kind === 'video') {
    return <video src={`${src}#t=0.1`} style={style} muted playsInline preload="metadata" />;
  }
  return <img src={src} style={style} alt="" loading="lazy" draggable={false} />;
}