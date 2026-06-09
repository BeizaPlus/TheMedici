import { useEffect, useRef } from 'react';
import { bindExclusiveAudioPlayback } from '../lib/exclusiveAudioPlayback.js';

export default function ExclusiveAudio({
  src,
  className = 'diff-recording-audio',
  preload = 'metadata',
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    return bindExclusiveAudioPlayback(ref.current);
  }, [src]);

  if (!src) return null;

  return (
    <audio
      ref={ref}
      controls
      preload={preload}
      src={src}
      className={className}
      {...props}
    />
  );
}
