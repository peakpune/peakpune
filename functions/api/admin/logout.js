import { json, isAdmin } from '../../_lib/api.js';
export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'forbidden' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  return json({ ok: true }, 200, { 'set-cookie': 'pp_admin=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict' });
}
