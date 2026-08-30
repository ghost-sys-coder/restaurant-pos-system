export type AuthRoute = 'invitation' | 'sign-up' | 'sign-in' | 'landing';

function isRoute(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function authRouteForPath(pathname: string): AuthRoute {
  if (isRoute(pathname, '/accept-invitation')) return 'invitation';
  if (isRoute(pathname, '/sign-up')) return 'sign-up';
  if (isRoute(pathname, '/sign-in')) return 'sign-in';
  return 'landing';
}
