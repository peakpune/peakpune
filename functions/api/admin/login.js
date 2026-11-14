import { adminLogin } from '../../_lib/api.js';
export const onRequestPost = ({ request, env }) => adminLogin(request, env, new Date());
