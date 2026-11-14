import { markGoing } from '../_lib/api.js';
export const onRequestPost = ({ request, env }) => markGoing(request, env);
