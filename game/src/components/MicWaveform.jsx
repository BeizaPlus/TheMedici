import { useEffect, useRef } from 'react';

const BAR_COUNT = 28;

export default function MicWaveform({ stream, active = false, className = '' }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!active || !stream) return undefined;

    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const setup = async () => {
      const audioCtx = new AudioContext();
      try {
        await audioCtx.resume();
      } catch {
        void audioCtx.close();
        return;
      }
      if (cancelled) {
        void audioCtx.close();
        return;
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      audioRef.current = { audioCtx, source, analyser };

      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      const g = canvas.getContext('2d');
      if (!g) return;

      const draw = () => {
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(draw);

        const w = canvas.width;
        const h = canvas.height;
        analyser.getByteFrequencyData(data);

        g.clearRect(0, 0, w, h);
        const gap = 2;
        const barWidth = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
        const step = Math.max(1, Math.floor(bufferLength / BAR_COUNT));

        for (let i = 0; i < BAR_COUNT; i += 1) {
          const level = data[i * step] / 255;
          const barHeight = Math.max(4, level * h * 0.9);
          const x = i * (barWidth + gap);
          const y = (h - barHeight) / 2;
          g.fillStyle = `rgba(62, 207, 142, ${0.25 + level * 0.75})`;
          if (typeof g.roundRect === 'function') {
            g.beginPath();
            g.roundRect(x, y, barWidth, barHeight, 2);
            g.fill();
          } else {
            g.fillRect(x, y, barWidth, barHeight);
          }
        }
      };

      draw();
    };

    void setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const audio = audioRef.current;
      if (audio) {
        audio.source.disconnect();
        void audio.audioCtx.close();
        audioRef.current = null;
      }
    };
  }, [active, stream]);

  return (
    <canvas
      ref={canvasRef}
      className={`mic-waveform ${className}`.trim()}
      width={280}
      height={44}
      aria-hidden="true"
    />
  );
}
