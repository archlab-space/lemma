/**
 * Proxy handlers for Lemma Edge API
 */

import { RouteHandler } from '../types';
import { proxyRequest, proxyStreamingRequest, ProxyError } from '../utils/proxy';

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
		return await proxyRequest(request, env.BACKEND_URL, context);
	} catch (error) {
		if (error instanceof ProxyError) {
			return new Response(
				JSON.stringify({
					message: error.message,
					error_code: 'PROXY_ERROR',
					requestId: context.requestId,
				}),
				{
					status: error.status,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
		}

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
		return await proxyStreamingRequest(request, env.BACKEND_URL, context);
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