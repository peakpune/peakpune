import { reportPool } from '../_lib/pools-api.js';
export const onRequestPost = ({ request, env }) => reportPool(request, env);
