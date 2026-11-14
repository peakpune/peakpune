import { submitPlan, listPlans } from '../_lib/api.js';
export const onRequestGet = ({ request, env }) => listPlans(request, env);
export const onRequestPost = ({ request, env }) => submitPlan(request, env);
