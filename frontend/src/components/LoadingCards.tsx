import { useI18n } from '../i18n';
export function LoadingCards({ progress }: { progress?: number }) {
  const { t } = useI18n();
  return <div className="board-loading" role="status"><div className="loading-card-stack" aria-hidden="true"><i>R</i><i>I</i><i>A</i></div><strong>{t('Menyusun kad anda...')}</strong><span>{t('Papan permainan sedang disediakan.')}</span>{progress !== undefined && <progress aria-label={t('Memuatkan papan')} value={progress} max={1} />}</div>;
}
