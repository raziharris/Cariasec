import React from 'react';
import { avatarIds, type AvatarId } from '../../../shared/avatar';
import { avatarNames, avatarUrl } from '../avatars';
import { useI18n } from '../i18n';
export function Avatar({ id = 'cat' }: { id?: AvatarId }) {
  return <img className="character-avatar" src={avatarUrl(id)} alt="" aria-hidden="true" width="48" height="48" />;
}
export function AvatarPicker({ value, onChange }: { value: AvatarId; onChange: (id: AvatarId) => void }) {
  const { t } = useI18n();
  return <fieldset className="avatar-picker"><legend>{t('Pilih watak anda')}</legend><div>
    {avatarIds.map(id => <label key={id} className={value === id ? 'chosen' : ''}>
      <input type="radio" name="avatar" value={id} checked={value === id} onChange={() => onChange(id)} aria-label={t(avatarNames[id])} />
      <Avatar id={id} /><span>{t(avatarNames[id])}</span>
    </label>)}
  </div></fieldset>;
}
