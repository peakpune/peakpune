import { joinPool } from '../_lib/pools-api.js';
export const onRequestPost = ({ request, env }) => joinPool(request, env);
