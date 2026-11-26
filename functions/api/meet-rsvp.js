import { meetCount, submitMeetRsvp } from '../_lib/meet-api.js';
export const onRequestGet = ({ request, env }) => meetCount(request, env);
export const onRequestPost = ({ request, env }) => submitMeetRsvp(request, env);
