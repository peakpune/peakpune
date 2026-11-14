import { adminDecide } from '../../_lib/api.js';
export const onRequestPost = ({ request, env }) => adminDecide(request, env, new Date());
