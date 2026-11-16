import { feedResponse } from '../_lib/feed.js';
export const onRequestGet = ({ request }) => feedResponse(request);
