export const avatarIds = ['cat', 'rabbit', 'robot', 'student', 'student-girl'] as const;
export type AvatarId = (typeof avatarIds)[number];
export function validAvatar(value: unknown): value is AvatarId {
  return typeof value === 'string' && (avatarIds as readonly string[]).includes(value);
}
