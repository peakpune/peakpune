import { submitPool, listPools } from '../_lib/pools-api.js';
export const onRequestGet = ({ request, env }) => listPools(request, env);
export const onRequestPost = ({ request, env }) => submitPool(request, env);
