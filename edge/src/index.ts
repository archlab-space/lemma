/**
 * Lemma Edge API - Cloudflare Worker
 * Production-ready architecture with itty-router, JWT auth, KV rate limiting
 */

import { Router } from 'itty-router';
import { Env, RequestContext } from './types';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { apiRateLimit, streamingRateLimit } from './middleware/rateLimit';
import { healthHandler, backendHealthHandler } from './handlers/health';
import { apiProxyHandler, streamingProxyHandler } from './handlers/proxy';

// Create itty-router instance
const router = Router();

// Middleware wrapper to adapt itty-router to our middleware interface
function adaptMiddleware(middleware: any) {
	return async (request: Request, env: Env, ctx: ExecutionContext) => {
		const context: RequestContext = {
			env,
			ctx,
			requestId: '', // Will be set by logging middleware
			startTime: Date.now(),
		};
		
		// Store context on request for handler access
		(request as any).context = context;
		
		return middleware(request, context, async () => {
			// Continue to next middleware/handler
			return new Response('Continue');
		});
	};
}

// Handler wrapper to adapt our handlers to itty-router
function adaptHandler(handler: any) {
	return async (request: Request, env: Env, ctx: ExecutionContext) => {
		const context: RequestContext = (request as any).context || {
			env,
			ctx,
			requestId: crypto.randomUUID(),
			startTime: Date.now(),
		};
		
		return handler(request, context);
	};
}

// Apply global middleware using itty-router's middleware system
router
	.all('*', adaptMiddleware(loggingMiddleware))
	.all('*', adaptMiddleware(corsMiddleware))
	.all('*', adaptMiddleware(authMiddleware))

// Health check routes
router
	.get('/', adaptHandler(healthHandler))
	.get('/health', adaptHandler(healthHandler))
	.get('/api/v1/health', adaptMiddleware(apiRateLimit), adaptHandler(backendHealthHandler))

// Streaming endpoints with specific rate limiting
router
	.get('/api/v1/streaming/*', adaptMiddleware(streamingRateLimit), adaptHandler(streamingProxyHandler))
	.post('/api/v1/streaming/*', adaptMiddleware(streamingRateLimit), adaptHandler(streamingProxyHandler))

// Other API endpoints with general rate limiting
router
	.get('/api/*', adaptMiddleware(apiRateLimit), adaptHandler(apiProxyHandler))
	.post('/api/*', adaptMiddleware(apiRateLimit), adaptHandler(apiProxyHandler))
	.put('/api/*', adaptMiddleware(apiRateLimit), adaptHandler(apiProxyHandler))
	.patch('/api/*', adaptMiddleware(apiRateLimit), adaptHandler(apiProxyHandler))
	.delete('/api/*', adaptMiddleware(apiRateLimit), adaptHandler(apiProxyHandler))

// Catch-all for 404s
router
	.all('*', () => new Response(
		JSON.stringify({
			message: 'Endpoint not found',
			error_code: 'NOT_FOUND',
			available_endpoints: [
				'/health',
				'/api/v1/health',
				'/api/v1/streaming/*',
				'/api/*'
			]
		}),
		{
			status: 404,
			headers: {
				'Content-Type': 'application/json',
			},
		}
	));

// Default export for Cloudflare Workers
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			return await router.fetch(request, env, ctx);
		} catch (error) {
			console.error('Worker error:', error);
			
			return new Response(
				JSON.stringify({
					message: 'Internal server error',
					error_code: 'WORKER_ERROR',
					timestamp: new Date().toISOString(),
					requestId: crypto.randomUUID(),
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
		}
	},
} satisfies ExportedHandler<Env>;
