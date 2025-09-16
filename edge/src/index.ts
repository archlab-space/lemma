/**
 * Lemma Edge API - Cloudflare Worker
 * Handles streaming requests and proxies to FastAPI backend
 */

interface Env {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	BACKEND_URL: string;
	SUPABASE_SERVICE_KEY?: string;
	DOCUMENTS_BUCKET?: R2Bucket;
}

// CORS headers for all responses
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
	'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight requests
function handleCors(request: Request): Response | null {
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}
	return null;
}

// Stream proxy function
async function proxyStreamToBackend(
	request: Request,
	backendUrl: string,
	path: string
): Promise<Response> {
	try {
		// Build the backend URL
		const url = new URL(request.url);
		const backendRequest = new URL(path, backendUrl);
		
		// Copy query parameters
		backendRequest.search = url.search;
		
		// Forward headers (especially Authorization)
		const headers = new Headers();
		for (const [key, value] of request.headers.entries()) {
			if (key.toLowerCase() !== 'host') {
				headers.set(key, value);
			}
		}
		
		// Make request to backend
		const backendResponse = await fetch(backendRequest.toString(), {
			method: request.method,
			headers,
			body: request.body,
		});
		
		// Create response with CORS headers
		const response = new Response(backendResponse.body, {
			status: backendResponse.status,
			statusText: backendResponse.statusText,
		});
		
		// Copy backend headers and add CORS
		for (const [key, value] of backendResponse.headers.entries()) {
			response.headers.set(key, value);
		}
		
		// Add CORS headers
		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}
		
		return response;
		
	} catch (error) {
		console.error('Backend proxy error:', error);
		
		return new Response(
			JSON.stringify({
				message: 'Backend service unavailable',
				error_code: 'BACKEND_ERROR',
				details: { error: error instanceof Error ? error.message : 'Unknown error' }
			}),
			{
				status: 502,
				headers: {
					'Content-Type': 'application/json',
					...corsHeaders,
				},
			}
		);
	}
}

// Enhanced streaming proxy with better error handling
async function streamingProxy(
	request: Request,
	backendUrl: string,
	path: string
): Promise<Response> {
	try {
		const url = new URL(request.url);
		const backendRequest = new URL(path, backendUrl);
		backendRequest.search = url.search;
		
		// Forward headers
		const headers = new Headers();
		for (const [key, value] of request.headers.entries()) {
			if (!['host', 'cf-ray', 'cf-connecting-ip'].includes(key.toLowerCase())) {
				headers.set(key, value);
			}
		}
		
		// Add timeout for streaming requests
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
		
		const backendResponse = await fetch(backendRequest.toString(), {
			method: request.method,
			headers,
			body: request.body,
			signal: controller.signal,
		});
		
		clearTimeout(timeoutId);
		
		if (!backendResponse.ok) {
			throw new Error(`Backend returned ${backendResponse.status}: ${backendResponse.statusText}`);
		}
		
		// Create streaming response
		const { readable, writable } = new TransformStream();
		
		// Stream the response
		(async () => {
			try {
				if (!backendResponse.body) {
					throw new Error('No response body from backend');
				}
				
				await backendResponse.body.pipeTo(writable);
			} catch (error) {
				console.error('Streaming error:', error);
				// Try to write error to stream if possible
				try {
					const writer = writable.getWriter();
					const errorData = JSON.stringify({
						type: 'error',
						message: 'Streaming error occurred',
						timestamp: Date.now()
					});
					await writer.write(new TextEncoder().encode(`data: ${errorData}\n\n`));
					await writer.close();
				} catch {
					// If we can't write to stream, just close it
				}
			}
		})();
		
		return new Response(readable, {
			status: backendResponse.status,
			headers: {
				'Content-Type': backendResponse.headers.get('Content-Type') || 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				...corsHeaders,
			},
		});
		
	} catch (error) {
		console.error('Streaming proxy error:', error);
		
		// Return error as SSE format
		const errorStream = new ReadableStream({
			start(controller) {
				const errorData = JSON.stringify({
					type: 'error',
					message: error instanceof Error ? error.message : 'Unknown streaming error',
					timestamp: Date.now()
				});
				controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
				controller.close();
			}
		});
		
		return new Response(errorStream, {
			status: 502,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				...corsHeaders,
			},
		});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Handle CORS preflight
		const corsResponse = handleCors(request);
		if (corsResponse) return corsResponse;
		
		const url = new URL(request.url);
		const path = url.pathname;
		
		// Health check for the edge worker itself
		if (path === '/' || path === '/health') {
			return new Response(
				JSON.stringify({
					message: 'Lemma Edge API',
					status: 'healthy',
					timestamp: new Date().toISOString(),
					environment: env.BACKEND_URL ? 'configured' : 'unconfigured',
				}),
				{
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders,
					},
				}
			);
		}
		
		// Route streaming endpoints with enhanced proxy
		if (path.startsWith('/api/v1/streaming/')) {
			return streamingProxy(request, env.BACKEND_URL, path);
		}
		
		// Route other API endpoints with basic proxy
		if (path.startsWith('/api/')) {
			return proxyStreamToBackend(request, env.BACKEND_URL, path);
		}
		
		// Default 404 response
		return new Response(
			JSON.stringify({
				message: 'Endpoint not found',
				error_code: 'NOT_FOUND',
				available_endpoints: [
					'/health',
					'/api/v1/health/*',
					'/api/v1/streaming/*'
				]
			}),
			{
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					...corsHeaders,
				},
			}
		);
	},
} satisfies ExportedHandler<Env>;
