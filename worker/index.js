import { handleApiRequest } from './routes/api.js';

const productionFrontendOrigin = 'https://startechafrica.co.ke';
const currentFrontendOrigin = 'https://changara.startechafrica.co.ke';
const pagesProjectOriginPattern = /^https:\/\/(?:[a-z0-9-]+\.)?changara-connect\.pages\.dev$/;

const getCorsHeaders = (request, env) => {
  const requestOrigin = request.headers.get('Origin');
  const isLocalDevelopmentOrigin = env.ENVIRONMENT !== 'production' &&
    requestOrigin &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
  const isProductionFrontendOrigin = requestOrigin === productionFrontendOrigin ||
    requestOrigin === currentFrontendOrigin;
  const isPagesProjectOrigin = requestOrigin && pagesProjectOriginPattern.test(requestOrigin);
  const allowedOrigin = isProductionFrontendOrigin ||
    isPagesProjectOrigin ||
    requestOrigin === env.FRONTEND_URL ||
    isLocalDevelopmentOrigin
    ? requestOrigin
    : null;
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  });
  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
  return { headers, isAllowed: !requestOrigin || Boolean(allowedOrigin) };
};

const jsonResponse = (payload, status, headers) => {
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(payload), { status, headers });
};

export default {
  async fetch(request, env) {
    const cors = getCorsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: cors.isAllowed ? 204 : 403, headers: cors.headers });
    }
    if (!cors.isAllowed) {
      return jsonResponse({ success: false, message: 'Origin is not allowed.' }, 403, cors.headers);
    }
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return jsonResponse({ success: true, message: 'Changara Connect API is running.' }, 200, cors.headers);
    }

    try {
      return await handleApiRequest(request, env, cors.headers);
    } catch (error) {
      console.error('[worker]', error && error.message ? error.message : error);
      return jsonResponse(
        { success: false, message: 'Something went wrong. Please try again.' },
        500,
        cors.headers
      );
    }
  }
};
