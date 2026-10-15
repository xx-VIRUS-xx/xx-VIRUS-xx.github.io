// Cloudflare Pages: send www to the bare domain with a permanent redirect.
export function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'www.latenightstack.com') {
    url.hostname = 'latenightstack.com';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
