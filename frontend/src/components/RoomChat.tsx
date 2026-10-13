import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MessageSquare, Send } from 'lucide-react';
import { CHAT_LIMIT, type ChatInput, type ChatMessage, type ChatReply } from '../../../shared/chat';
import { createActionId } from '../actionId';
import { useI18n } from '../i18n';
import { useSound } from '../audio/SoundProvider';
import './room-chat.css';

export function RoomChat({ messages, you, online, historyError, onRefresh, onSend }: {
  messages: ChatMessage[]; you: string; online: boolean; historyError: string;
  onRefresh: () => void; onSend: (input: ChatInput) => Promise<ChatReply>;
}) {
  const { t, message: translateMessage, language } = useI18n();
  const { playSound } = useSound();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [readThrough, setReadThrough] = useState(0);
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const pending = useRef<ChatInput | null>(null);
  const sendingRef = useRef(false);
  const last = messages.at(-1)?.sequence ?? 0;
  const clock = useMemo(() => new Intl.DateTimeFormat(language === 'ms' ? 'ms-MY' : 'en-MY', { hour: '2-digit', minute: '2-digit' }), [language]);
  const unread = messages.filter(item => item.sequence > readThrough && item.playerId !== you).length;
  useEffect(() => {
    if (!open) return;
    setReadThrough(last);
    if (log.current && nearBottom.current) log.current.scrollTop = log.current.scrollHeight;
  }, [open, last]);
  async function send() {
    if (!draft.trim() || !online || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError('');
    // Reuse the message ID if an acknowledgement is lost and the user retries.
    const input = pending.current ?? { id: createActionId(), text: draft };
    pending.current = input;
    try {
      const reply = await onSend(input);
      if (reply.ok) {
        setDraft(''); pending.current = null; nearBottom.current = true;
        playSound('confirm');
      } else { setError(reply.error); playSound('error'); }
    } catch { setError('Mesej belum dihantar. Cuba lagi.'); playSound('error'); }
    finally { sendingRef.current = false; setSending(false); }
  }
  return <section className={`room-chat ${open ? 'is-open' : ''}`} aria-label={t('Chat bilik')}>
    <button className="chat-toggle" aria-expanded={open} aria-controls="room-chat-panel" onClick={() => { nearBottom.current = true; setOpen(!open); }}>
      <MessageSquare size={18} /><b>{t('Chat bilik')}</b>
      {!open && unread > 0 && <span className="chat-unread" aria-label={t('{count} mesej belum dibaca', { count: unread })}>{unread > 9 ? '9+' : unread}</span>}
      <small>{online ? t('Untuk pemain bilik ini') : t('Menyambung semula...')}</small><ChevronDown size={18} />
    </button>
    {open && <div id="room-chat-panel" className="chat-panel">
      <div className="chat-log" role="log" tabIndex={0} aria-label={t('Mesej bilik')} aria-live="polite" aria-relevant="additions" ref={log}
        onScroll={() => { const element = log.current!; nearBottom.current = element.scrollHeight - element.clientHeight - element.scrollTop < 40; }}>
        {!messages.length && <p className="chat-empty">{t('Sapa rakan anda 👋')}</p>}
        {messages.map(item => <article key={item.id} className={`chat-message ${item.playerId === you ? 'mine' : ''}`} data-message-id={item.id}>
          <header><b>{item.name}{item.playerId === you ? ` · ${t('Anda')}` : ''}</b><time dateTime={new Date(item.sentAt).toISOString()}>{clock.format(item.sentAt)}</time></header>
          <p>{item.text}</p>
        </article>)}
      </div>
      {(error || historyError) && <p className="chat-error" role="alert">{translateMessage(error || historyError)}{historyError && <button onClick={onRefresh} disabled={!online}>{t('Cuba lagi')}</button>}</p>}
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label htmlFor="chat-draft">{t('Tulis mesej')}</label>
        <textarea id="chat-draft" rows={1} maxLength={CHAT_LIMIT} placeholder={t('Tulis mesej...')} value={draft} disabled={!online || sending}
          onChange={event => { pending.current = null; setDraft(event.target.value); setError(''); }}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
        <button type="submit" data-sound="none" aria-label={t('Hantar mesej')} disabled={!online || sending || !draft.trim()}><Send size={18} /></button>
      </form>
      <div className="chat-note"><span>{t('Hormati rakan. Mesej untuk bilik ini sahaja.')}</span><span>{draft.length}/{CHAT_LIMIT}</span></div>
    </div>}
  </section>;
}
