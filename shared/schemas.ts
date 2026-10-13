import { z } from "zod";
import { nicknamePattern } from "./nickname";
import { avatarIds } from './avatar';
export const nickname = z.string().trim().min(2).max(20).regex(nicknamePattern);
export const settingsSchema = z
  .object({
    turnSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]),
    maxActions: z.union([z.literal(60), z.literal(120), z.literal(180)]),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    nickname,
    avatar: z.enum(avatarIds).optional(),
    settings: settingsSchema,
    serverCode: z
      .string()
      .regex(/^[A-Z2-9]{6}$/)
      .optional(),
  }),
  z.object({
    type: z.literal("join"),
    nickname,
    avatar: z.enum(avatarIds).optional(),
    code: z.string().regex(/^[A-Z2-9]{6}$/),
  }),
  z.object({
    type: z.literal("resume"),
    code: z.string().regex(/^[A-Z2-9]{6}$/),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({ type: z.literal("ready"), ready: z.boolean() }),
  z.object({ type: z.literal("start") }),
  z.object({
    type: z.literal("request"),
    target: z.string().uuid(),
    card: z.string().regex(/^[RIASEC][1-6]$/),
    version: z.number().int().nonnegative(),
    actionId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("draw"),
    version: z.number().int().nonnegative(),
    actionId: z.string().uuid(),
  }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("again") }),
]);
export type Command = z.infer<typeof commandSchema>;
