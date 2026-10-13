import React from 'react';
import { ArrowRight, Trophy, Wifi, WifiOff, Check } from 'lucide-react';
import type { Category, View } from '../../../shared/game';
import { useI18n } from '../i18n';
import { assetUrl, colors } from '../cards/presentation';
import { PlayerMark } from './PlayerMark';

export function GameControls({ room, target, family, requested, busy, online, onTarget, onFamily, onCard, onSubmit, onPreview }: {
  room: View; target: string; family: Category; requested: string; busy: boolean; online: boolean;
  onTarget: (id: string) => void; onFamily: (id: Category) => void; onCard: (id: string) => void;
  onSubmit: () => void; onPreview: (id: string) => void;
}) {
  const { t, cards, cardById, categories } = useI18n();
  const me = room.players.find(p => p.id === room.you)!;
  const available = cards.filter(c => c.category === family && !room.hand.includes(c.id));
  const opponents = room.players.filter(p => p.id !== room.you);
  const current = room.players.find(p => p.id === target);
  const actionable = online && !busy && room.turn === room.you && !room.paused && (!target || !!requested);
  return <div className="play-controls">
    <section className="collection-strip" aria-label={t('Koleksi RIASEC anda')}>
      {categories.map(c => {
        const complete = me.families.includes(c.code);
        const count = complete ? 6 : room.hand.filter(id => cardById[id].category === c.code).length;
        return <button key={c.code} className={`collection-badge ${complete ? 'completed' : ''} ${family === c.code ? 'selected' : ''}`} aria-label={`${c.name}: ${count}/6`} aria-pressed={family === c.code} disabled={!count || complete}
          style={{ '--family-color': colors[c.code] } as React.CSSProperties} onClick={() => onFamily(c.code)}>
          <b>{complete ? <Trophy size={18} /> : c.code}</b><span>{c.name}<small>{complete ? t('Lengkap') : `${count}/6 ${t('kad')}`}</small></span>
        </button>;
      })}
    </section>
    <section className="tap-selection" aria-label={t('Rancang permintaan anda')}>
      <div className="selection-heading"><span>1</span><h3>{t('Pilih rakan')}</h3><small>{t('Tap untuk memilih')}</small></div>
      <div className="target-choices">
        {opponents.map(p => <button key={p.id} className={`target-choice ${target === p.id ? 'selected' : ''} ${room.turn === p.id ? 'active-turn' : ''}`} aria-label={t('Pilih {name}', { name: p.name })} aria-pressed={target === p.id} disabled={!p.count} onClick={() => onTarget(p.id)}>
          <PlayerMark name={p.name} /><span><b>{p.name}</b><small>{p.count} {t('kad')} · {p.families.length} <Trophy size={11} /></small></span>{p.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
        </button>)}
      </div>
      <div className="selection-heading"><span>2</span><h3>{t('Pilih keluarga')}</h3></div>
      <div className="family-choices">
        {categories.filter(c => room.hand.some(id => cardById[id].category === c.code)).map(c => <button key={c.code} aria-pressed={family === c.code} className={family === c.code ? 'selected' : ''} style={{ '--family-color': colors[c.code] } as React.CSSProperties} onClick={() => onFamily(c.code)}><b>{c.code}</b>{c.name}</button>)}
        {!room.hand.length && <p>{t('Tangan kosong. Ambil kad pada giliran anda.')}</p>}
      </div>
      <div className="selection-heading"><span>3</span><h3>{t('Pilih kad untuk diminta')}</h3><small>{t('Kad yang belum anda miliki')}</small></div>
      <div className="request-card-choices">
        {available.map(c => <div className="request-card-option" key={c.id}>
          <button className={`request-card ${requested === c.id ? 'selected' : ''}`} aria-label={t('Minta {title}', { title: c.title })} aria-pressed={requested === c.id} onClick={() => onCard(c.id)} data-sound="card" style={{ '--family-color': colors[c.category] } as React.CSSProperties}>
            <span className="request-family">{c.category}{requested === c.id && <Check size={14} />}</span><img src={assetUrl(c.artwork)} alt="" /><b>{c.title}</b>
          </button>
          <button className="card-preview-button" onClick={() => onPreview(c.id)} aria-label={t('Lihat {title}', { title: c.title })}>{t('Lihat kad')}</button>
        </div>)}
      </div>
      <details className="advanced-selection" data-testid="advanced-selection"><summary>{t('Pilihan dropdown')}</summary>
        <div className="request-panel">
          <div><label htmlFor="family">{t('Keluarga')}</label><select id="family" value={family} onChange={e => onFamily(e.target.value as Category)}>{categories.filter(c => room.hand.some(id => cardById[id].category === c.code)).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
          <div><label htmlFor="target">{t('Pemain')}</label><select id="target" value={target} onChange={e => onTarget(e.target.value)}>{opponents.filter(p => p.count).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label htmlFor="requested">{t('Kad')}</label><select id="requested" value={requested} onChange={e => onCard(e.target.value)}>{available.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        </div>
      </details>
    </section>
    <div className="request-dock">
      <div><small>{room.paused ? t('Menunggu sambungan rakan') : room.turn === room.you ? t('Permintaan anda') : t('Rancang langkah anda.')}</small><strong>{target && requested ? t('Minta {card} daripada {name}', { card: cardById[requested]?.title ?? '', name: current?.name ?? '' }) : t('Ambil satu kad.')}</strong></div>
      <button className="primary" data-sound="none" disabled={!actionable} onClick={onSubmit}>{room.turn === room.you ? target ? t('Minta kad') : t('Ambil kad') : t('Menunggu giliran')}<ArrowRight size={18} /></button>
    </div>
  </div>;
}
