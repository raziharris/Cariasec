import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Trophy, Wifi, WifiOff, Check, X } from 'lucide-react';
import type { Category, View } from '../../../shared/game';
import { useI18n } from '../i18n';
import { assetUrl, colors } from '../cards/presentation';
import { PlayerMark } from './PlayerMark';

export function GameControls({ room, target, family, requested, busy, online, onTarget, onFamily, onCard, onSubmit, onPreview }: {
  room: View; target: string; family: Category; requested: string; busy: boolean; online: boolean;
  onTarget: (id: string) => void; onFamily: (id: Category) => void; onCard: (id: string) => void;
  onSubmit: () => Promise<boolean>; onPreview: (id: string) => void;
}) {
  const { t, cards, cardById, categories } = useI18n();
  const [step, setStep] = useState(1);
  const [confirmedCard, setConfirmedCard] = useState<string | null>(null);
  const [collection, setCollection] = useState<Category | null>(null);
  const me = room.players.find(p => p.id === room.you)!;
  const available = cards.filter(c => c.category === family && !room.hand.includes(c.id));
  const opponents = room.players.filter(p => p.id !== room.you);
  const current = room.players.find(p => p.id === target);
  const haveFamily = room.hand.some(id => cardById[id].category === family);
  const actionable = online && !busy && room.turn === room.you && !room.paused && (!target || (step === 3 && haveFamily && current?.count && confirmedCard === requested && available.some(c => c.id === requested)));
  useEffect(() => {
    setConfirmedCard(null);
    if (!room.hand.some(id => cardById[id].category === family)) setStep(currentStep => currentStep === 3 ? 2 : currentStep);
  }, [target, family, room.hand.join(',')]);
  function chooseFamily(id: Category) { onFamily(id); setConfirmedCard(null); setStep(3); setCollection(null); }
  function chooseCard(id: string) { onCard(id); setConfirmedCard(id); }
  async function submit() { if (await onSubmit()) { setStep(1); setConfirmedCard(null); } }
  const countFor = (code: Category) => me.families.includes(code) ? 6 : room.hand.filter(id => cardById[id].category === code).length;
  const detail = categories.find(c => c.code === collection);
  const headings = [t('Pilih rakan'), t('Pilih keluarga'), t('Pilih kad untuk diminta')];
  return <div className="play-controls focus-controls">
    <section className="collection-strip" aria-label={t('Koleksi RIASEC anda')}>
      {categories.map(c => <button key={c.code} className={`collection-badge ${me.families.includes(c.code) ? 'completed' : ''}`} aria-label={`${c.name}: ${countFor(c.code)}/6`} aria-expanded={collection === c.code} aria-controls="collection-detail"
        style={{ '--family-color': colors[c.code] } as React.CSSProperties} onClick={() => setCollection(collection === c.code ? null : c.code)}>
        <b>{c.code}</b><span>{countFor(c.code)}/6{me.families.includes(c.code) && <Trophy size={10} />}</span>
      </button>)}
    </section>
    {detail && <div className="collection-detail" id="collection-detail" role="region" aria-label={detail.name}>
      <div><b>{detail.name}</b><span>{countFor(detail.code)}/6 · {me.families.includes(detail.code) ? t('Lengkap') : t('Koleksi RIASEC anda')}</span></div>
      <button disabled={!countFor(detail.code) || me.families.includes(detail.code)} onClick={() => { if (target) chooseFamily(detail.code); else { onFamily(detail.code); setStep(1); setCollection(null); } }}>{t('Pilih keluarga')}<ArrowRight size={14} /></button>
      <button className="collection-close" aria-label={t('Tutup koleksi')} onClick={() => setCollection(null)}><X size={16} /></button>
    </div>}
    <section className="tap-selection" aria-label={t('Rancang permintaan anda')} data-step={step}>
      {target ? <>
        <nav className="request-steps" aria-label={t('Langkah permintaan')}>
          {[t('Rakan'), t('Keluarga'), t('Kad')].map((label, index) => <button key={label} disabled={index + 1 > step} aria-current={step === index + 1 ? 'step' : undefined} onClick={() => setStep(index + 1)}><i>{index + 1 < step ? <Check size={12} /> : index + 1}</i><span>{label}</span></button>)}
        </nav>
        <div className="selection-heading"><div><small>{t('Permintaan kad')} · {step}/3</small><h3>{headings[step - 1]}</h3></div>{step > 1 && <button className="step-back" aria-label={t('Langkah sebelumnya')} onClick={() => setStep(step - 1)}><ArrowLeft size={18} /></button>}</div>
        {step === 1 && <div className="target-choices">
          {opponents.map(p => <button key={p.id} className={`target-choice ${target === p.id ? 'selected' : ''}`} aria-label={t('Pilih {name}', { name: p.name })} aria-pressed={target === p.id} disabled={!p.count} onClick={() => { onTarget(p.id); setConfirmedCard(null); setStep(2); }}>
            <PlayerMark name={p.name} /><span><b>{p.name}</b><small>{p.count} {t('kad')} · {p.families.length} <Trophy size={11} /></small></span>{p.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          </button>)}
        </div>}
        {step === 2 && <div className="family-choices">
          {categories.filter(c => room.hand.some(id => cardById[id].category === c.code)).map(c => <button key={c.code} aria-pressed={family === c.code} className={family === c.code ? 'selected' : ''} style={{ '--family-color': colors[c.code] } as React.CSSProperties} onClick={() => chooseFamily(c.code)}><b>{c.code}</b><span>{c.name}</span><small>{countFor(c.code)}/6</small></button>)}
          {!room.hand.length && <p>{t('Tangan kosong. Ambil kad pada giliran anda.')}</p>}
        </div>}
        {step === 3 && <div className="request-card-choices">
          {available.map(c => <div className="request-card-option" key={c.id}>
            <button className={`request-card ${confirmedCard === c.id ? 'selected' : ''}`} aria-label={t('Minta {title}', { title: c.title })} aria-pressed={confirmedCard === c.id} onClick={() => chooseCard(c.id)} data-sound="card" style={{ '--family-color': colors[c.category] } as React.CSSProperties}>
              <span className="request-family">{c.category}{confirmedCard === c.id && <Check size={14} />}</span><img src={assetUrl(c.artwork)} alt="" /><b>{c.title}</b>
            </button>
            <button className="card-preview-button" onClick={() => onPreview(c.id)} aria-label={t('Lihat {title}', { title: c.title })}>{t('Lihat kad')}</button>
          </div>)}
        </div>}
      </> : <p className="draw-prompt">{t('Tangan kosong. Ambil kad pada giliran anda.')}</p>}
      <details className="advanced-selection" data-testid="advanced-selection"><summary>{t('Pilihan dropdown')}</summary>
        <div className="request-panel">
          <div><label htmlFor="family">{t('Keluarga')}</label><select id="family" value={family} onChange={e => chooseFamily(e.target.value as Category)}>{categories.filter(c => room.hand.some(id => cardById[id].category === c.code)).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
          <div><label htmlFor="target">{t('Pemain')}</label><select id="target" value={target} onChange={e => { onTarget(e.target.value); setConfirmedCard(null); }}>{opponents.filter(p => p.count).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label htmlFor="requested">{t('Kad')}</label><select id="requested" value={requested} onChange={e => { chooseCard(e.target.value); setStep(3); }}>{available.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        </div>
      </details>
    </section>
    <div className="request-dock">
      <div><small>{room.paused ? t('Menunggu sambungan rakan') : room.turn === room.you ? t('Permintaan anda') : t('Rancang langkah anda.')}</small><strong>{target ? confirmedCard && requested ? t('Minta {card} daripada {name}', { card: cardById[requested]?.title ?? '', name: current?.name ?? '' }) : headings[step - 1] : t('Ambil satu kad.')}</strong></div>
      <button className="primary" data-sound="none" disabled={!actionable} onClick={() => void submit()}>{room.turn === room.you ? target ? t('Minta kad') : t('Ambil kad') : t('Menunggu giliran')}<ArrowRight size={18} /></button>
    </div>
  </div>;
}
