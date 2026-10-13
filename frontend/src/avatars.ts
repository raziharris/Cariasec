import type { AvatarId } from '../../shared/avatar';
export const avatarNames: Record<AvatarId, string> = { cat: 'Kucing', rabbit: 'Arnab', robot: 'Robot', student: 'Pelajar lelaki', 'student-girl': 'Pelajar perempuan' };
export function avatarSvg(id: AvatarId = 'cat'): string {
  const heads: Record<AvatarId, string> = {
    cat: '<path d="M22 40 19 15 38 29M58 29 77 15 74 40" fill="#efb17e"/><ellipse cx="48" cy="51" rx="30" ry="27" fill="#f6c89e"/><path d="m17 53 16 4m-14 5 14-1m30-4 16-4m-16 8 14 1" stroke="#173b32" stroke-width="2"/><path d="m43 58 5 4 5-4" fill="#c86877"/>',
    rabbit: '<ellipse cx="33" cy="27" rx="9" ry="23" fill="#fff8ed"/><ellipse cx="63" cy="27" rx="9" ry="23" fill="#fff8ed"/><path d="M33 13v22m30-22v22" stroke="#edb2bc" stroke-width="6"/><ellipse cx="48" cy="56" rx="29" ry="25" fill="#fff8ed"/><path d="m44 62 4 3 4-3" fill="#cb7185"/>',
    robot: '<path d="M48 14v10" stroke="#173b32" stroke-width="3"/><circle cx="48" cy="12" r="5" fill="#f9d36e"/><rect x="17" y="28" width="62" height="49" rx="15" fill="#a9d6ce"/><rect x="24" y="35" width="48" height="32" rx="10" fill="#eaf7eb"/><path d="M35 73h26" stroke="#173b32" stroke-width="3"/>',
    student: '<path d="M16 81q32-29 64 0" fill="#6aa89f"/><ellipse cx="48" cy="47" rx="26" ry="29" fill="#f1bd93"/><path d="M21 42q-6-32 25-30 31-6 29 30L61 25q-17 18-40 17" fill="#52372f"/>',
    'student-girl': '<path d="M18 74q-7-60 30-62 37 2 30 62" fill="#52372f"/><path d="M16 86q32-29 64 0" fill="#c68bb4"/><ellipse cx="48" cy="48" rx="25" ry="28" fill="#f1bd93"/><path d="M23 39q12-31 27-17l23 18q-23-1-29-12-5 11-21 11" fill="#52372f"/><path d="m68 29 7-8 5 12-12-4" fill="#f8d16e"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#f9e6b9"/>${heads[id]}<g fill="#173b32"><circle cx="37" cy="50" r="3"/><circle cx="59" cy="50" r="3"/></g><g fill="#eb9da5" opacity=".7"><ellipse cx="28" cy="58" rx="5" ry="3"/><ellipse cx="68" cy="58" rx="5" ry="3"/></g><path d="M41 67q7 6 14 0" fill="none" stroke="#173b32" stroke-width="2.5" stroke-linecap="round"/></svg>`;
}
export const avatarUrl = (id: AvatarId = 'cat') => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(id))}`;
