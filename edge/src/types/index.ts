/**
 * Type definitions for Lemma Edge API
 */

export interface Env {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	SUPABASE_SERVICE_KEY?: string;
	BACKEND_URL: string;
	DOCUMENTS_BUCKET?: R2Bucket;
	RATE_LIMIT_KV?: KVNamespace;
	JWT_SIGNING_KEY?: string; // JWT signing key (JWK for ES256, secret for HS256)
	JWT_ALGORITHM?: string; // Algorithm: ES256 (default), HS256 (fallback)
	JWT_SECRET?: string; // Fallback for backward compatibility
}

export interface RequestContext {
	env: Env;
	ctx: ExecutionContext;
	user?: User;
	requestId: string;
	startTime: number;
}

export interface User {
	id: string;
	email: string;
	role: string;
	iat: number;
	exp: number;
}

export interface RouteHandler {
	(request: Request, context: RequestContext): Promise<Response>;
}

export interface Middleware {
	(request: Request, context: RequestContext, next: () => Promise<Response>): Promise<Response>;
}

export interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
	keyGenerator?: (request: Request) => string;
}

export interface LogEvent {
	level: 'info' | 'warn' | 'error';
	message: string;
	timestamp: string;
	requestId: string;
	method?: string;
	path?: string;
	status?: number;
	duration?: number;
	userAgent?: string;
	ip?: string;
	userId?: string;
	metadata?: Record<string, unknown>;
}