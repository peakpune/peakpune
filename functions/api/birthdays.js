import { submitBirthday, listBirthdays } from '../_lib/birthdays-api.js';
export const onRequestGet = ({ request, env }) => listBirthdays(request, env);
export const onRequestPost = ({ request, env }) => submitBirthday(request, env);
