import { useRef, useEffect, useState } from 'react';
export default function ScrollBand({ items, speed = 40 }) {
  const trackRef = useRef(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let pos = 0;
    let animId;
    const w = track.scrollWidth / 2;
    const tick = () => { pos -= speed / 60; if (Math.abs(pos) >= w) pos = 0; track.style.transform = `translateX(${pos}px)`; animId = requestAnimationFrame(tick); };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [speed]);
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden w-full py-2 border-y border-cc-glow/20 my-4">
      <div ref={trackRef} className="flex gap-8 whitespace-nowrap" style={{ willChange: 'transform' }}>
        {doubled.map((item, i) => (
          <span key={i} className="text-cc-glow text-sm font-mono opacity-70">{item}</span>
        ))}
      </div>
    </div>
  );
}
