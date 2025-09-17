/**
 * Logging Middleware for Lemma Edge API
 */

import { Middleware, LogEvent } from '../types';

function generateRequestId(): string {
	return crypto.randomUUID();
}

function getClientIP(request: Request): string {
	return request.headers.get('CF-Connecting-IP') ||
		   request.headers.get('X-Forwarded-For') ||
		   request.headers.get('X-Real-IP') ||
		   'unknown';
}

function log(event: LogEvent): void {
	const logMessage = {
		...event,
		source: 'lemma-edge',
	};
	
	// In development, log to console
	console.log(JSON.stringify(logMessage, null, 2));
	
	// In production, you might want to send logs to a service like:
	// - Cloudflare Analytics Engine
	// - External logging service (Datadog, LogFlare, etc.)
	// - Custom webhook endpoint
}

export const loggingMiddleware: Middleware = async (request, context, next) => {
	const startTime = Date.now();
	const requestId = generateRequestId();
	const url = new URL(request.url);
	
	// Add request ID to context
	context.requestId = requestId;
	context.startTime = startTime;
	
	// Log incoming request
	log({
		level: 'info',
		message: 'Incoming request',
		timestamp: new Date().toISOString(),
		requestId,
		method: request.method,
		path: url.pathname,
		userAgent: request.headers.get('User-Agent') || 'unknown',
		ip: getClientIP(request),
		userId: context.user?.id,
		metadata: {
			query: url.search,
			origin: request.headers.get('Origin'),
			referer: request.headers.get('Referer'),
		},
	});

	try {
		const response = await next();
		const duration = Date.now() - startTime;

		// Log successful response
		log({
			level: 'info',
			message: 'Request completed',
			timestamp: new Date().toISOString(),
			requestId,
			method: request.method,
			path: url.pathname,
			status: response.status,
			duration,
			userId: context.user?.id,
			metadata: {
				contentType: response.headers.get('Content-Type'),
				contentLength: response.headers.get('Content-Length'),
			},
		});

		// Add request ID header to response
		const newHeaders = new Headers(response.headers);
		newHeaders.set('X-Request-ID', requestId);

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders,
		});

	} catch (error) {
		const duration = Date.now() - startTime;
		
		// Log error
		log({
			level: 'error',
			message: 'Request failed',
			timestamp: new Date().toISOString(),
			requestId,
			method: request.method,
			path: url.pathname,
			duration,
			userId: context.user?.id,
			metadata: {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			},
		});

		// Re-throw the error
		throw error;
	}
};