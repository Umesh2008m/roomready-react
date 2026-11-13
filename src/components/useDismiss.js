import { useEffect } from 'react';

/**
 * Closes a menu when the user clicks or taps anywhere outside it, or presses Escape.
 * `ref` is the element that holds the button and its menu; clicks inside it are left alone.
 */
export default function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;

    function onPointer(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }

    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onClose]);
}