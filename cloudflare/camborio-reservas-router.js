const PUBLIC_PREFIX = '/reservas-camborio';
const APP_ORIGIN = 'https://camborio-reservas-v4.pages.dev';
const LEGAL_ORIGIN = 'https://decelife-web.pages.dev';

const LEGAL_PATHS = new Map([
  ['/reservas-camborio/politica-privacidad-camborio.html', '/politica-privacidad-camborio.html'],
  ['/reservas-camborio/terminos-camborio.html', '/terminos-camborio.html'],
]);

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const pathname = incomingUrl.pathname;

    if (pathname === PUBLIC_PREFIX) {
      const redirectUrl = new URL(request.url);
      redirectUrl.pathname = `${PUBLIC_PREFIX}/`;
      return Response.redirect(redirectUrl.toString(), 301);
    }

    if (!pathname.startsWith(`${PUBLIC_PREFIX}/`)) {
      return new Response('Not Found', { status: 404 });
    }

    // The legal pages already live in the main Decelife Pages site. Proxy them
    // internally so they remain publicly available under the Camborio path.
    const legalPath = LEGAL_PATHS.get(pathname);
    if (legalPath) {
      const upstreamUrl = new URL(LEGAL_ORIGIN);
      upstreamUrl.pathname = legalPath;
      upstreamUrl.search = incomingUrl.search;
      return fetch(new Request(upstreamUrl.toString(), request));
    }

    // Everything else under /reservas-camborio/ belongs to the V4 static app.
    // Strip only the public prefix; the browser keeps the public URL unchanged.
    const upstreamUrl = new URL(APP_ORIGIN);
    upstreamUrl.pathname = pathname.slice(PUBLIC_PREFIX.length) || '/';
    upstreamUrl.search = incomingUrl.search;

    return fetch(new Request(upstreamUrl.toString(), request));
  },
};
