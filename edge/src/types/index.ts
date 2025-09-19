/**
 * Type definitions for Lemma Edge API
 */

export interface Env {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	SUPABASE_SERVICE_KEY?: string;
	BACKEND_URL: string;
	WORKER_SECRET: string; // Secret for backend communication
	DOCUMENTS_BUCKET?: R2Bucket; // R2 bucket binding for file storage
	RATE_LIMIT_KV?: KVNamespace;
	JWT_SIGNING_KEY?: string; // JWT signing key (JWK for ES256, secret for HS256)
	JWT_ALGORITHM?: string; // Algorithm: ES256 (default), HS256 (fallback)
	JWT_SECRET?: string; // Fallback for backward compatibility
	R2_ACCESS_KEY_ID?: string; // R2 access key ID for presigned URLs
	R2_SECRET_ACCESS_KEY?: string; // R2 secret access key for presigned URLs
	R2_ACCOUNT_ID?: string; // R2 account ID for presigned URLs
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