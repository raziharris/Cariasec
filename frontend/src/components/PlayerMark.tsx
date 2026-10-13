export function PlayerMark({ name = '' }: { name?: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <span className="player-mark" aria-hidden="true">{initials || '–'}</span>;
}
