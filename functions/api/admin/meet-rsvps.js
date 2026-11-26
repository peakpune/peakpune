import { adminMeetRsvps, updateMeetRsvpAdmin } from '../../_lib/meet-api.js';
export const onRequestGet = ({ request, env }) => adminMeetRsvps(request, env, new Date());
export const onRequestPost = ({ request, env }) => updateMeetRsvpAdmin(request, env, new Date());
