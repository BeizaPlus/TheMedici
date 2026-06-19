import { useEffect, useRef } from 'react';
import interact from 'interactjs';
import { clampPinAwayFromUi } from '../lib/scenePinPlacement.js';

/** Drag placed order pins to reposition on the patient scene (free + zone modes). */
export function usePinReposition({ sceneRef, enabled, pinCount = 0, onMovePin }) {
  const onMovePinRef = useRef(onMovePin);
  onMovePinRef.current = onMovePin;

  useEffect(() => {
    if (!enabled) return undefined;
    const scene = sceneRef.current;
    if (!scene) return undefined;

    interact('.pin.pin-draggable').draggable({
      inertia: false,
      listeners: {
        start(event) {
          event.target.classList.add('pin-dragging');
        },
        move(event) {
          const el = event.target;
          const x = (parseFloat(el.getAttribute('data-x')) || 0) + event.dx;
          const y = (parseFloat(el.getAttribute('data-y')) || 0) + event.dy;
          el.style.transform = `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`;
          el.setAttribute('data-x', x);
          el.setAttribute('data-y', y);
        },
        end(event) {
          const el = event.target;
          const ivId = el.dataset.ivId;
          el.classList.remove('pin-dragging');
          if (!ivId || !scene) return;

          const rect = scene.getBoundingClientRect();
          if (!rect.width || !rect.height) return;

          const insideScene =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;

          if (!insideScene) {
            el.style.transition = 'transform 0.25s ease';
            el.style.transform = 'translate(-50%, -100%)';
            el.setAttribute('data-x', '0');
            el.setAttribute('data-y', '0');
            setTimeout(() => {
              el.style.transition = '';
            }, 280);
            return;
          }

          const rawCx = (event.clientX - rect.left) / rect.width;
          const rawCy = (event.clientY - rect.top) / rect.height;
          const { cx, cy } = clampPinAwayFromUi(rawCx, rawCy, scene);
          el.style.left = `${cx * 100}%`;
          el.style.top = `${cy * 100}%`;
          el.style.transform = 'translate(-50%, -100%)';
          el.setAttribute('data-x', '0');
          el.setAttribute('data-y', '0');
          onMovePinRef.current?.(ivId, { cx, cy, zoneId: 'zone-custom-1' });
        },
      },
    });

    return () => {
      interact('.pin.pin-draggable').unset();
    };
  }, [enabled, sceneRef, pinCount]);
}
