export function buildInvitationRedirectUrl(configuredAppUrl: string | undefined, requestOrigin: string): string {
  const source = String(configuredAppUrl || '').trim() || requestOrigin;
  let url: URL;
  try { url = new URL(source); } catch { throw new Error('APP_URL must be an absolute http:// or https:// URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('APP_URL must be an absolute http:// or https:// URL');
  url.pathname = '/accept-invitation'; url.search = ''; url.hash = '';
  return url.toString();
}
