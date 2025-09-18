/**
 * Rate Limiting Middleware for Lemma Edge API
 * Using Cloudflare KV for persistent, distributed rate limiting
 */

import { Middleware, RateLimitConfig, RequestContext } from '../types';

interface RateLimitData {
	count: number;
	resetTime: number;
}

function getClientIP(request: Request): string {
	return request.headers.get('CF-Connecting-IP') ||
		   request.headers.get('X-Forwarded-For') ||
		   request.headers.get('X-Real-IP') ||
		   'unknown';
}

function getUserKey(request: Request, context: RequestContext): string {
	// Use user ID if authenticated, otherwise use IP
	if (context.user?.id) {
		return `user:${context.user.id}`;
	}
	return `ip:${getClientIP(request)}`;
}

export function createRateLimitMiddleware(config: RateLimitConfig): Middleware {
	const { windowMs, maxRequests, keyGenerator = getUserKey } = config;

	return async (request, context, next) => {
		// Skip rate limiting if KV is not available (development mode)
		if (!context.env.RATE_LIMIT_KV) {
			console.warn('Rate limiting disabled: RATE_LIMIT_KV not available');
			return next();
		}

		const userKey = keyGenerator(request, context);
		const key = `rate_limit:${userKey}`;
		const now = Date.now();

		try {
			// Get current rate limit data from KV
			const stored = await context.env.RATE_LIMIT_KV.get(key, 'json') as RateLimitData | null;
			
			let rateLimitData: RateLimitData = stored || {
				count: 0,
				resetTime: now + windowMs,
			};

			// Reset if window has expired
			if (now > rateLimitData.resetTime) {
				rateLimitData = {
					count: 0,
					resetTime: now + windowMs,
				};
			}

			// Check if rate limit exceeded
			if (rateLimitData.count >= maxRequests) {
				const resetInSeconds = Math.ceil((rateLimitData.resetTime - now) / 1000);
				
				return new Response(
					JSON.stringify({
						message: 'Rate limit exceeded',
						error_code: 'RATE_LIMIT_EXCEEDED',
						retryAfter: resetInSeconds,
						requestId: context.requestId,
					}),
					{
						status: 429,
						headers: {
							'Content-Type': 'application/json',
							'Retry-After': resetInSeconds.toString(),
							'X-RateLimit-Limit': maxRequests.toString(),
							'X-RateLimit-Remaining': '0',
							'X-RateLimit-Reset': Math.ceil(rateLimitData.resetTime / 1000).toString(),
						},
					}
				);
			}

			// Increment counter
			rateLimitData.count++;

			// Store back to KV with TTL
			const ttlSeconds = Math.ceil(windowMs / 1000);
			await context.env.RATE_LIMIT_KV.put(
				key,
				JSON.stringify(rateLimitData),
				{ expirationTtl: ttlSeconds }
			);

			// Process request
			const response = await next();

			// Add rate limit headers to response
			const remaining = Math.max(0, maxRequests - rateLimitData.count);
			const newHeaders = new Headers(response.headers);
			newHeaders.set('X-RateLimit-Limit', maxRequests.toString());
			newHeaders.set('X-RateLimit-Remaining', remaining.toString());
			newHeaders.set('X-RateLimit-Reset', Math.ceil(rateLimitData.resetTime / 1000).toString());

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			});

		} catch (error) {
			console.error('Rate limiting error:', error);
			// Continue without rate limiting if KV fails
			return next();
		}
	};
}

// Pre-configured rate limit middleware
export const apiRateLimit = createRateLimitMiddleware({
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxRequests: 100, // 100 requests per 15 minutes
});

export const streamingRateLimit = createRateLimitMiddleware({
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 10, // 10 streaming requests per minute
});