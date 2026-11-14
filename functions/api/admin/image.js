import { adminImage } from '../../_lib/api.js';
export const onRequestGet = ({ request, env }) => adminImage(request, env, new Date());
