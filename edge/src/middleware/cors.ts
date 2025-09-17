/**
 * CORS Middleware for Lemma Edge API
 */

import { Middleware } from '../types';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-Requested-With',
	'Access-Control-Max-Age': '86400',
	'Access-Control-Allow-Credentials': 'true',
};

export const corsMiddleware: Middleware = async (request, context, next) => {
	// Handle preflight requests
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}

	// Process the actual request
	const response = await next();

	// Add CORS headers to the response
	const newHeaders = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders)) {
		newHeaders.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
};