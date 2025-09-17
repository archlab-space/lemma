/**
 * Health check handlers for Lemma Edge API
 */

import { RouteHandler } from '../types';

export const healthHandler: RouteHandler = async (request, context) => {
	const { env } = context;
	
	return new Response(
		JSON.stringify({
			message: 'Lemma Edge API',
			status: 'healthy',
			timestamp: new Date().toISOString(),
			requestId: context.requestId,
			environment: {
				hasBackendUrl: !!env.BACKEND_URL,
				hasSupabaseUrl: !!env.SUPABASE_URL,
				hasSupabaseKey: !!env.SUPABASE_ANON_KEY,
				hasServiceKey: !!env.SUPABASE_SERVICE_KEY,
				hasJwtSigningKey: !!env.JWT_SIGNING_KEY,
				hasJwtSecret: !!env.JWT_SECRET,
				hasBucket: !!env.DOCUMENTS_BUCKET,
				hasRateLimitKV: !!env.RATE_LIMIT_KV,
			},
			user: context.user ? {
				id: context.user.id,
				email: context.user.email,
				role: context.user.role,
			} : null,
		}),
		{
			headers: {
				'Content-Type': 'application/json',
			},
		}
	);
};

export const backendHealthHandler: RouteHandler = async (request, context) => {
	const { env } = context;
	
	if (!env.BACKEND_URL) {
		return new Response(
			JSON.stringify({
				message: 'Backend URL not configured',
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
		const backendResponse = await fetch(`${env.BACKEND_URL}/api/v1/health`, {
			method: 'GET',
			headers: {
				'X-Request-ID': context.requestId,
			},
		});

		const backendData = await backendResponse.json();

		return new Response(
			JSON.stringify({
				message: 'Backend health check',
				edge: {
					status: 'healthy',
					timestamp: new Date().toISOString(),
					requestId: context.requestId,
				},
				backend: {
					status: backendResponse.ok ? 'healthy' : 'unhealthy',
					statusCode: backendResponse.status,
					data: backendData,
				},
			}),
			{
				status: backendResponse.ok ? 200 : 502,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				message: 'Backend health check failed',
				error_code: 'BACKEND_UNREACHABLE',
				error: error instanceof Error ? error.message : 'Unknown error',
				requestId: context.requestId,
			}),
			{
				status: 502,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}
};