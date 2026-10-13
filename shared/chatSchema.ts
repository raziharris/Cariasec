import { z } from 'zod';
import { CHAT_LIMIT } from './chat';
export const chatSchema = z.object({
  id: z.string().uuid(),
  text: z.string().max(CHAT_LIMIT)
    .transform(text => text.normalize('NFC').replace(/\s+/gu, ' ').trim())
    .pipe(z.string().min(1).max(CHAT_LIMIT).regex(/^[^\p{Cc}\u200B\u202A-\u202E\u2066-\u2069]*$/u)),
}).strict();
