import { reportPlan } from '../_lib/api.js';
export const onRequestPost = ({ request, env }) => reportPlan(request, env);
