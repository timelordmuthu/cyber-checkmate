import { useEffect, useRef } from 'react';
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';
export default function FuzzyText({ text, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let interval;
    const original = text.split('');
    const scramble = () => {
      el.innerText = original.map((ch, i) => {
        if (ch === ' ') return ' ';
        if (i < frame) return ch;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      frame++;
      if (frame > original.length) { el.innerText = text; clearInterval(interval); }
    };
    interval = setInterval(scramble, 40);
    return () => clearInterval(interval);
  }, [text]);
  return <span ref={ref} className={className}>{text}</span>;
}
