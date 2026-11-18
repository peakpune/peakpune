import { submitInterest } from '../_lib/birthdays-api.js';
export const onRequestPost = ({ request, env }) => submitInterest(request, env);
