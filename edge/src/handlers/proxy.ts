/**
 * Proxy handlers for Lemma Edge API
 */

import { RouteHandler } from '../types';
import { proxyToBackend, streamProxyToBackend, ProxyError } from '../utils/proxy';

export const apiProxyHandler: RouteHandler = async (request, context) => {
	const { env } = context;
	
	if (!env.BACKEND_URL) {
		return new Response(
			JSON.stringify({
				message: 'Backend service not configured',
				error_code: 'BACKEND_NOT_CONFIGURED',
			}),
			{
				status: 503,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}

	try {
		return await proxyToBackend(request, context, {
			endpoint: request.url,
			method: request.method as any,
			requireAuth: true,
			isStreaming: false,
		});
	} catch (error) {
		console.error('Unexpected proxy error:', error);
		return new Response(
			JSON.stringify({
				message: 'Proxy service error',
				error_code: 'INTERNAL_ERROR',
				requestId: context.requestId,
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}
};

export const streamingProxyHandler: RouteHandler = async (request, context) => {
	const { env } = context;
	
	if (!env.BACKEND_URL) {
		// Return error as SSE format for streaming endpoints
		const errorStream = new ReadableStream({
			start(controller) {
				const errorData = JSON.stringify({
					type: 'error',
					message: 'Backend service not configured',
					error_code: 'BACKEND_NOT_CONFIGURED',
					timestamp: Date.now(),
				});
				controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
				controller.close();
			},
		});

		return new Response(errorStream, {
			status: 503,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
			},
		});
	}

	try {
		return await streamProxyToBackend(request, context, {
			endpoint: request.url,
			method: request.method as any,
			requireAuth: true,
			isStreaming: true,
		});
	} catch (error) {
		console.error('Streaming proxy error:', error);
		
		// Return error as SSE format
		const errorStream = new ReadableStream({
			start(controller) {
				const errorData = JSON.stringify({
					type: 'error',
					message: error instanceof Error ? error.message : 'Unknown streaming error',
					error_code: 'STREAMING_ERROR',
					timestamp: Date.now(),
					requestId: context.requestId,
				});
				controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
				controller.close();
			},
		});

		return new Response(errorStream, {
			status: 502,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
			},
		});
	}
};