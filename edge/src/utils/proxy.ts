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
		
		// Add user context if available
		if (context.user) {
			headers.set('X-User-ID', context.user.id);
			headers.set('X-User-Email', context.user.email);
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