import { useEffect, useRef, useState } from 'react';

/**
 * A slim scrollbar drawn by the app, for the page itself. The browser's own bar is hidden there with
 * the `has-thumb` class. It exists because browsers do not let a page change the cursor over their own scrollbar:
 * this one shows a hand, can be dragged, and a click on its track jumps there. Wheel, keys and
 * touch keep scrolling the page natively; this bar only follows and drives scrollTop.
 */
export default function ScrollThumb() {
  const trackRef = useRef(null);
  const drag = useRef(null);
  const [bar, setBar] = useState({ show: false, size: 0, top: 0 });

  const elementOf = () => document.scrollingElement;
  const viewOf = () => window.innerHeight;

  useEffect(() => {
    const el = elementOf();
    if (!el) return undefined;
    document.documentElement.classList.add('has-thumb');

    function measure() {
      const track = trackRef.current?.clientHeight ?? 0;
      const view = viewOf();
      const total = el.scrollHeight;
      const room = total - view;
      if (room <= 1 || !track) { setBar((b) => (b.show ? { ...b, show: false } : b)); return; }
      const size = Math.max(40, Math.round((track * view) / total));
      const top = Math.round(((track - size) * el.scrollTop) / room);
      setBar((b) => (b.show && b.size === size && b.top === top ? b : { show: true, size, top }));
    }

    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const sizes = new ResizeObserver(measure);
    sizes.observe(document.body);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      sizes.disconnect();
      document.documentElement.classList.remove('has-thumb');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = elementOf();
    drag.current = { y: e.clientY, scroll: el.scrollTop };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDrag(e) {
    if (!drag.current) return;
    const el = elementOf();
    const track = trackRef.current.clientHeight;
    const perPixel = (el.scrollHeight - viewOf()) / Math.max(1, track - bar.size);
    el.scrollTop = drag.current.scroll + (e.clientY - drag.current.y) * perPixel;
  }

  function endDrag() { drag.current = null; }

  // a click on the empty track brings the thumb's middle to that point
  function jump(e) {
    const el = elementOf();
    const rect = trackRef.current.getBoundingClientRect();
    const share = (e.clientY - rect.top - bar.size / 2) / Math.max(1, rect.height - bar.size);
    el.scrollTo({ top: Math.min(1, Math.max(0, share)) * (el.scrollHeight - viewOf()), behavior: 'smooth' });
  }

  return (
    <div ref={trackRef} className={`scroll-track is-page${bar.show ? '' : ' is-idle'}`}
      onPointerDown={jump} aria-hidden="true">
      <div className="scroll-thumb" style={{ height: bar.size, transform: `translateY(${bar.top}px)` }}
        onPointerDown={startDrag} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
    </div>
  );
}