/**
 * Chat handlers for Lemma Edge API
 * Handles conversation management and streaming Q&A operations
 */

import { RouteHandler } from '../types';
import { proxyToBackend, streamProxyToBackend } from '../utils/proxy';

/**
 * Create a new chat conversation
 * POST /api/v1/chat/conversations
 */
export const createConversationHandler: RouteHandler = async (request, context) => {
	return proxyToBackend(request, context, {
		endpoint: '/api/v1/chat/conversations',
		method: 'POST',
		requireAuth: true,
	});
};

/**
 * List user's conversations with pagination
 * GET /api/v1/chat/conversations
 */
export const listConversationsHandler: RouteHandler = async (request, context) => {
	return proxyToBackend(request, context, {
		endpoint: '/api/v1/chat/conversations',
		method: 'GET',
		requireAuth: true,
	});
};

/**
 * Get conversation history with messages
 * GET /api/v1/chat/conversations/{id}
 */
export const getConversationHistoryHandler: RouteHandler = async (request, context) => {
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/');
	const conversationId = pathParts[pathParts.length - 1];
	
	if (!conversationId || conversationId === 'conversations') {
		return new Response(
			JSON.stringify({
				message: 'Conversation ID is required',
				error_code: 'MISSING_CONVERSATION_ID',
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}

	return proxyToBackend(request, context, {
		endpoint: `/api/v1/chat/conversations/${conversationId}`,
		method: 'GET',
		requireAuth: true,
	});
};

/**
 * Delete a conversation
 * DELETE /api/v1/chat/conversations/{id}
 */
export const deleteConversationHandler: RouteHandler = async (request, context) => {
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/');
	const conversationId = pathParts[pathParts.length - 1];
	
	if (!conversationId || conversationId === 'conversations') {
		return new Response(
			JSON.stringify({
				message: 'Conversation ID is required',
				error_code: 'MISSING_CONVERSATION_ID',
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}

	return proxyToBackend(request, context, {
		endpoint: `/api/v1/chat/conversations/${conversationId}`,
		method: 'DELETE',
		requireAuth: true,
	});
};

/**
 * Session-based streaming Q&A
 * POST /api/v1/chat/sessions/{session_id}/ask
 */
export const sessionStreamingChatHandler: RouteHandler = async (request, context) => {
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/');
	const sessionId = pathParts[pathParts.indexOf('sessions') + 1];
	
	if (!sessionId || sessionId === 'ask') {
		return new Response(
			JSON.stringify({
				message: 'Session ID is required',
				error_code: 'MISSING_SESSION_ID',
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}

	// This is a streaming endpoint, use streaming proxy
	return streamProxyToBackend(request, context, {
		endpoint: `/api/v1/chat/sessions/${sessionId}/ask`,
		method: 'POST',
		requireAuth: true,
		isStreaming: true,
	});
};

/**
 * Legacy streaming Q&A (without session)
 * POST /api/v1/chat/ask
 */
export const streamingChatHandler: RouteHandler = async (request, context) => {
	return streamProxyToBackend(request, context, {
		endpoint: '/api/v1/chat/ask',
		method: 'POST',
		requireAuth: true,
		isStreaming: true,
	});
};

/**
 * Synchronous Q&A with context
 * POST /api/v1/chat/ask-sync
 */
export const syncChatHandler: RouteHandler = async (request, context) => {
	return proxyToBackend(request, context, {
		endpoint: '/api/v1/chat/ask-sync',
		method: 'POST',
		requireAuth: true,
	});
};

/**
 * Generate document summary
 * POST /api/v1/chat/summary
 */
export const documentSummaryHandler: RouteHandler = async (request, context) => {
	return proxyToBackend(request, context, {
		endpoint: '/api/v1/chat/summary',
		method: 'POST',
		requireAuth: true,
	});
};

/**
 * Get suggested questions for a document
 * POST /api/v1/chat/suggest-questions
 */
export const suggestQuestionsHandler: RouteHandler = async (request, context) => {
	return proxyToBackend(request, context, {
		endpoint: '/api/v1/chat/suggest-questions',
		method: 'POST',
		requireAuth: true,
	});
};

/**
 * Submit message feedback
 * POST /api/v1/chat/feedback
 */
export const messageFeedbackHandler: RouteHandler = async (request, context) => {
	return proxyToBackend(request, context, {
		endpoint: '/api/v1/chat/feedback',
		method: 'POST',
		requireAuth: true,
	});
};

/**
 * Chat service health check
 * GET /api/v1/chat/health
 */
export const chatHealthHandler: RouteHandler = async (request, context) => {
	return proxyToBackend(request, context, {
		endpoint: '/api/v1/chat/health',
		method: 'GET',
		requireAuth: false, // Health checks typically don't require auth
	});
};