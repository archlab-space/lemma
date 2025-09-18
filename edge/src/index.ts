/**
 * Lemma Edge API - Cloudflare Worker
 * Production-ready architecture with itty-router, JWT auth, KV rate limiting
 */

import { Router } from 'itty-router';
import { Env, RequestContext, Middleware, RouteHandler } from './types';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { apiRateLimit, streamingRateLimit } from './middleware/rateLimit';
import { healthHandler, backendHealthHandler } from './handlers/health';
import { apiProxyHandler, streamingProxyHandler } from './handlers/proxy';

// Create itty-router instance
const router = Router();

// Middleware wrapper to adapt itty-router to our middleware interface
function adaptMiddleware(middleware: Middleware) {
	return async (request: Request, env: Env, ctx: ExecutionContext) => {
		try {
			// Get or create context
			let context: RequestContext = (request as any).context;
			if (!context) {
				context = {
					env,
					ctx,
					requestId: crypto.randomUUID(),
					startTime: Date.now(),
				};
				(request as any).context = context;
			}
			
			// Call middleware with proper next function
			const response = await middleware(request, context, async () => {
				// Return a marker response to indicate continuation
				return new Response('__CONTINUE__', { status: 200 });
			});
			
			// If middleware returns the continue marker, proceed to next
			if (response.status === 200 && await response.text() === '__CONTINUE__') {
				return; // Let itty-router continue to next handler
			}
			
			return response;
		} catch (error) {
			console.error('Middleware error:', error);
			return new Response(
				JSON.stringify({
					message: 'Middleware error',
					error_code: 'MIDDLEWARE_ERROR',
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}
	};
}

// Handler wrapper to adapt our handlers to itty-router
function adaptHandler(handler: RouteHandler) {
	return async (request: Request, env: Env, ctx: ExecutionContext) => {
		try {
			const context: RequestContext = (request as any).context || {
				env,
				ctx,
				requestId: crypto.randomUUID(),
				startTime: Date.now(),
			};
			
			return await handler(request, context);
		} catch (error) {
			console.error('Handler error:', error);
			return new Response(
				JSON.stringify({
					message: 'Handler error',
					error_code: 'HANDLER_ERROR',
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}
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
