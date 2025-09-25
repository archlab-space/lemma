/**
 * Proxy utilities for Lemma Edge API
 */

import { RequestContext } from '../types';

export interface ProxyOptions {
	timeout?: number;
	preserveHeaders?: boolean;
	transformRequest?: (request: Request) => Promise<Request>;
	transformResponse?: (response: Response) => Promise<Response>;
}

// Headers to exclude when proxying
const EXCLUDED_HEADERS = [
	'host',
	'cf-ray',
	'cf-connecting-ip',
	'cf-ipcountry',
	'cf-visitor',
	'x-forwarded-proto',
	'x-real-ip',
];

export class ProxyError extends Error {
	constructor(
		message: string,
		public status: number = 502,
		public originalError?: Error
	) {
		super(message);
		this.name = 'ProxyError';
	}
}

export async function proxyRequest(
	request: Request,
	targetUrl: string,
	context: RequestContext,
	options: ProxyOptions = {}
): Promise<Response> {
	const {
		timeout = 30000,
		preserveHeaders = true,
		transformRequest,
		transformResponse,
	} = options;

	try {
		// Build target URL
		const url = new URL(request.url);
		const target = new URL(url.pathname + url.search, targetUrl);

		// Prepare headers
		const headers = new Headers();
		
		if (preserveHeaders) {
			for (const [key, value] of request.headers.entries()) {
				if (!EXCLUDED_HEADERS.includes(key.toLowerCase())) {
					headers.set(key, value);
				}
			}
		}

		// Add request ID for tracing
		headers.set('X-Request-ID', context.requestId);
		
		// Add worker secret for backend authentication
		if (context.env.WORKER_SECRET) {
			headers.set('X-Worker-Secret', context.env.WORKER_SECRET);
		}
		
		// Add user context if available
		if (context.user) {
			headers.set('X-User-ID', context.user.id);
			headers.set('X-User-Email', context.user.email);
			headers.set('X-User-Role', context.user.role);
		}

		// Create proxy request
		let proxyRequest = new Request(target.toString(), {
			method: request.method,
			headers,
			body: request.body,
		});

		// Transform request if needed
		if (transformRequest) {
			proxyRequest = await transformRequest(proxyRequest);
		}

		// Set up timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			// Make the request
			const response = await fetch(proxyRequest, {
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			// Transform response if needed
			if (transformResponse) {
				return await transformResponse(response);
			}

			return response;

		} catch (fetchError) {
			clearTimeout(timeoutId);
			
			if (fetchError instanceof Error && fetchError.name === 'AbortError') {
				throw new ProxyError('Request timeout', 504);
			}
			
			throw new ProxyError(
				'Failed to proxy request',
				502,
				fetchError instanceof Error ? fetchError : undefined
			);
		}

	} catch (error) {
		if (error instanceof ProxyError) {
			throw error;
		}

		throw new ProxyError(
			'Proxy setup failed',
			500,
			error instanceof Error ? error : undefined
		);
	}
}

export async function proxyStreamingRequest(
	request: Request,
	targetUrl: string,
	context: RequestContext,
	options: ProxyOptions = {}
): Promise<Response> {
	try {
		const response = await proxyRequest(request, targetUrl, context, {
			...options,
			timeout: options.timeout || 60000, // Longer timeout for streaming
		});

		if (!response.ok) {
			throw new ProxyError(
				`Backend returned ${response.status}: ${response.statusText}`,
				response.status
			);
		}

		// For streaming responses, we need to handle the stream properly
		if (response.body) {
			const { readable, writable } = new TransformStream();

			// Pipe the response through
			response.body.pipeTo(writable).catch((error) => {
				console.error('Streaming proxy error:', error);
			});

			return new Response(readable, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
		}

		return response;

	} catch (error) {
		if (error instanceof ProxyError) {
			// Return error as Server-Sent Events format for streaming endpoints
			const errorStream = new ReadableStream({
				start(controller) {
					const errorData = JSON.stringify({
						type: 'error',
						message: error.message,
						timestamp: Date.now(),
					});
					controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
					controller.close();
				},
			});

			return new Response(errorStream, {
				status: error.status,
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
				},
			});
		}

		throw error;
	}
}

// Simplified proxy options interface
interface SimpleProxyOptions {
	endpoint: string;
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	requireAuth?: boolean;
	isStreaming?: boolean;
	timeout?: number;
}

/**
 * Simplified proxy function for backend API calls
 */
export async function proxyToBackend(
	request: Request,
	context: RequestContext,
	options: SimpleProxyOptions
): Promise<Response> {
	const backendUrl = context.env.BACKEND_URL || 'http://localhost:8000';
	
	try {
		const response = await proxyRequest(request, backendUrl, context, {
			timeout: options.timeout || 30000,
			preserveHeaders: true,
		});
		
		// Create new response with mutable headers to avoid CORS issues
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: new Headers(response.headers)
		});
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
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}
		throw error;
	}
}

/**
 * Simplified streaming proxy function for backend API calls
 */
export async function streamProxyToBackend(
	request: Request,
	context: RequestContext,
	options: SimpleProxyOptions
): Promise<Response> {
	const backendUrl = context.env.BACKEND_URL || 'http://localhost:8000';
	
	try {
		return await proxyStreamingRequest(request, backendUrl, context, {
			timeout: options.timeout || 60000, // Longer timeout for streaming
			preserveHeaders: true,
		});
	} catch (error) {
		if (error instanceof ProxyError) {
			// Return streaming error format
			const errorStream = new ReadableStream({
				start(controller) {
					const errorData = JSON.stringify({
						type: 'error',
						message: error.message,
						error_code: 'STREAMING_PROXY_ERROR',
						requestId: context.requestId,
						timestamp: Date.now(),
					});
					controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
					controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
					controller.close();
				},
			});

			return new Response(errorStream, {
				status: error.status === 502 ? 200 : error.status, // Return 200 for streaming errors to avoid client issues
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
				},
			});
		}
		throw error;
	}
}