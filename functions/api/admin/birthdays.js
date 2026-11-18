import { adminListBirthdays } from '../../_lib/birthdays-api.js';
export const onRequestGet = ({ request, env }) => adminListBirthdays(request, env, new Date());
