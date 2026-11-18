import { adminDecideBirthday } from '../../_lib/birthdays-api.js';
export const onRequestPost = ({ request, env }) => adminDecideBirthday(request, env, new Date());
