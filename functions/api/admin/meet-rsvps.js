import { adminMeetRsvps } from '../../_lib/meet-api.js';
export const onRequestGet = ({ request, env }) => adminMeetRsvps(request, env, new Date());
