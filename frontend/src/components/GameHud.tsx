import { useEffect, useRef, useState } from 'react';
import type { View } from '../../../shared/game';
import { useI18n } from '../i18n';
import { Avatar } from './AvatarPicker';
export function GameHud({ room, now, reduced }: { room: View; now: number; reduced: boolean }) {
  const { t, logText } = useI18n();
  const active = room.players.find(p => p.id === room.turn);
  const mine = room.turn === room.you;
  const remaining = Math.min(room.settings.turnSeconds, Math.max(0, Math.ceil(((room.deadline ?? now) - now) / 1000)));
  const previous = useRef<string | null>(null);
  const [announce, setAnnounce] = useState(false);
  useEffect(() => {
    if (room.turn !== previous.current && mine && !room.paused) {
      setAnnounce(true);
      const timer = setTimeout(() => setAnnounce(false), 2200);
      previous.current = room.turn;
      return () => clearTimeout(timer);
    }
    previous.current = room.turn;
    setAnnounce(false);
  }, [room.turn, room.paused, mine]);
  return <div className={`game-hud ${mine ? 'my-turn' : ''} ${reduced ? 'motion-reduced' : ''}`}>
    <div className="turn-avatar"><Avatar id={active?.avatar} /><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" /><circle className="timer-progress" cx="32" cy="32" r="29" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - remaining / room.settings.turnSeconds * 100} /></svg></div>
    <div className="turn-message"><small>{room.paused ? t('DIJEDA') : t('PUSINGAN AKTIF')}</small><h2 aria-live="polite" aria-atomic="true" className={announce && !reduced ? 'turn-announcement' : ''}>{room.paused ? t('Menunggu rakan.') : mine ? t('Giliran anda!') : t('Giliran {name}', { name: active?.name ?? '' })}</h2><span>{room.paused ? t('Menunggu sambungan rakan') : t('{count} saat', { count: remaining })}</span></div>
    <div className="table-top"><span>{room.actions} / {room.settings.maxActions}</span><small>{t('tindakan')}</small></div>
    <p className="recent-play" role="status">{logText(room.log.at(-1), room)}</p>
  </div>;
}
