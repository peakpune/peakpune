import { publicImage } from '../../_lib/api.js';
export const onRequestGet = ({ request, env, params }) => publicImage(request, env, params.id);
