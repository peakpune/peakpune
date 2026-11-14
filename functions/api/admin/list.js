import { adminList } from '../../_lib/api.js';
export const onRequestGet = ({ request, env }) => adminList(request, env, new Date());
