export const nicknamePattern = /^[\p{L}\p{N} ._-]+$/u;
export function validNickname(value: string): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= 20 && nicknamePattern.test(name);
}
