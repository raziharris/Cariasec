export function Celebration({ reduced }: { reduced: boolean }) {
  if (reduced) return null;
  return <div className="win-confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#eac568', '#82b9a8', '#d991a5', '#95b7de'][i % 4], animationDelay: `${(i % 6) * 80}ms`, rotate: `${i * 19}deg` }} />)}</div>;
}
