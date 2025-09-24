/**
 * Lemma Edge API - Cloudflare Worker
 * Production-ready architecture with itty-router, JWT auth, KV rate limiting
 */

import { Router, cors, json, error } from 'itty-router';
import { Env, RequestContext, Middleware, RouteHandler } from './types';
import { authMiddleware, requireAuth } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { 
  apiRateLimit, 
  streamingRateLimit, 
  chatRateLimit, 
  conversationRateLimit, 
  chatStreamingRateLimit, 
  feedbackRateLimit 
} from './middleware/rateLimit';
import { healthHandler, backendHealthHandler } from './handlers/health';
import { apiProxyHandler, streamingProxyHandler } from './handlers/proxy';
import { generatePresignedUrlHandler } from './handlers/upload';
import { 
  checkDuplicateHandler,
  createDocumentHandler, 
  getDocumentsHandler, 
  getDocumentHandler,
  deleteDocumentHandler,
  updateDocumentStatusHandler
} from './handlers/documents';
import {
  createConversationHandler,
  listConversationsHandler,
  getConversationHistoryHandler,
  deleteConversationHandler,
  sessionStreamingChatHandler,
  streamingChatHandler,
  syncChatHandler,
  documentSummaryHandler,
  suggestQuestionsHandler,
  messageFeedbackHandler,
  chatHealthHandler
} from './handlers/chat';

// Create CORS configuration
const { preflight, corsify } = cors({
	origin: ['http://localhost:3000'], // Frontend origins
	credentials: true,
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	allowHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
	maxAge: 86400, // 24 hours
});

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
				return new Response('__CONTINUE__', { 
					status: 200,
					headers: { 'X-Continue': 'true' }
				});
			});
			
			// If middleware returns the continue marker, proceed to next
			if (response.status === 200 && response.headers.get('X-Continue') === 'true') {
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

// Apply CORS preflight handler for OPTIONS requests
router.all('*', preflight)

// Apply global middleware using itty-router's middleware system
router
	.all('*', adaptMiddleware(loggingMiddleware))
	.all('*', adaptMiddleware(authMiddleware))

// Health check routes
router
	.get('/', adaptHandler(healthHandler))
	.get('/health', adaptHandler(healthHandler))
	.get('/api/v1/health', adaptMiddleware(apiRateLimit), adaptHandler(backendHealthHandler))

// Upload endpoints (require authentication)
router
	.post('/api/v1/upload/presigned-url', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(generatePresignedUrlHandler))

// Document endpoints (require authentication)
router
	.post('/api/v1/documents/check-duplicate', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(checkDuplicateHandler))
	.post('/api/v1/documents', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(createDocumentHandler))
	.get('/api/v1/documents', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(getDocumentsHandler))
	.get('/api/v1/documents/:id', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(getDocumentHandler))
	.delete('/api/v1/documents/:id', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(deleteDocumentHandler))
	.patch('/api/v1/documents/:id/status', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(updateDocumentStatusHandler))
	.post('/api/v1/documents/:id/process', adaptMiddleware(requireAuth), adaptMiddleware(apiRateLimit), adaptHandler(apiProxyHandler))

// Chat endpoints (require authentication)
router
	// Conversation management
	.post('/api/v1/chat/conversations', adaptMiddleware(requireAuth), adaptMiddleware(conversationRateLimit), adaptHandler(createConversationHandler))
	.get('/api/v1/chat/conversations', adaptMiddleware(requireAuth), adaptMiddleware(conversationRateLimit), adaptHandler(listConversationsHandler))
	.get('/api/v1/chat/conversations/:id', adaptMiddleware(requireAuth), adaptMiddleware(conversationRateLimit), adaptHandler(getConversationHistoryHandler))
	.delete('/api/v1/chat/conversations/:id', adaptMiddleware(requireAuth), adaptMiddleware(conversationRateLimit), adaptHandler(deleteConversationHandler))
	
	// Session-based streaming Q&A (most specific route first)
	.post('/api/v1/chat/sessions/:sessionId/ask', adaptMiddleware(requireAuth), adaptMiddleware(chatStreamingRateLimit), adaptHandler(sessionStreamingChatHandler))
	
	// Q&A endpoints
	.post('/api/v1/chat/ask', adaptMiddleware(requireAuth), adaptMiddleware(chatStreamingRateLimit), adaptHandler(streamingChatHandler))
	.post('/api/v1/chat/ask-sync', adaptMiddleware(requireAuth), adaptMiddleware(chatRateLimit), adaptHandler(syncChatHandler))
	
	// Document analysis endpoints
	.post('/api/v1/chat/summary', adaptMiddleware(requireAuth), adaptMiddleware(chatRateLimit), adaptHandler(documentSummaryHandler))
	.post('/api/v1/chat/suggest-questions', adaptMiddleware(requireAuth), adaptMiddleware(chatRateLimit), adaptHandler(suggestQuestionsHandler))
	
	// Feedback endpoints
	.post('/api/v1/chat/feedback', adaptMiddleware(requireAuth), adaptMiddleware(feedbackRateLimit), adaptHandler(messageFeedbackHandler))
	
	// Chat health check
	.get('/api/v1/chat/health', adaptHandler(chatHealthHandler))

// Streaming endpoints with specific rate limiting
router
	.get('/api/v1/streaming/*', adaptMiddleware(streamingRateLimit), adaptHandler(streamingProxyHandler))
	.post('/api/v1/streaming/*', adaptMiddleware(streamingRateLimit), adaptHandler(streamingProxyHandler))

// Other API endpoints with general rate limiting (catch-all for backend proxy)
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
				'/api/v1/upload/presigned-url',
				'/api/v1/documents',
				'/api/v1/chat/conversations',
				'/api/v1/chat/ask',
				'/api/v1/chat/sessions/:sessionId/ask',
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
			return router
				.fetch(request, env, ctx)
				.then(json)
				.catch(error)
				.then((response) => corsify(response, request));
		} catch (err) {
			console.error('Worker error:', err);
			
			const errorResponse = new Response(
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
			
			return corsify(errorResponse, request);
		}
	},
} satisfies ExportedHandler<Env>;
