/**
 * JWT Authentication Middleware for Lemma Edge API
 * Using JWT signing keys for production authentication (ES256 JWK support)
 */

import jwt from '@tsndr/cloudflare-worker-jwt';
import { Middleware, User } from '../types';
import supabaseJWKData from '../config/supabase-jwk.json';

// Use the library's built-in JWK type or treat as any for now
const supabaseJWK = supabaseJWKData as any;

interface JWTPayload {
	sub: string;
	email: string;
	role: string;
	iat: number;
	exp: number;
	iss?: string; // issuer
	aud?: string; // audience
}

async function validateJWTWithSigningKey(token: string, signingKey: string, algorithm: string = 'ES256'): Promise<User | null> {
	try {
		// For ES256, the signingKey might be a JWK string or regular secret
		let key = signingKey;
		
		// If it looks like a JWK, parse it
		if (signingKey.startsWith('{') && signingKey.includes('"kty"')) {
			try {
				const jwk = JSON.parse(signingKey);
				// For ES256 JWK verification, we need to use the JWK directly
				const isValid = await jwt.verify(token, jwk, {
					algorithm: algorithm as any,
				});
				
				if (!isValid) {
					return null;
				}
				
				// Continue with payload parsing...
				const decoded = jwt.decode(token);
				if (!decoded.payload) {
					return null;
				}
				
				const payload = decoded.payload as JWTPayload;
				
				// Additional validation
				if (!payload.sub || !payload.email) {
					console.warn('JWT missing required fields (sub, email)');
					return null;
				}
				
				// Check expiration manually for better error handling
				if (payload.exp && Date.now() >= payload.exp * 1000) {
					console.warn('JWT token expired');
					return null;
				}
				
				return {
					id: payload.sub,
					email: payload.email,
					role: payload.role || 'user',
					iat: payload.iat,
					exp: payload.exp,
				};
			} catch (jwkError) {
				console.error('JWK parsing failed, trying as regular secret:', jwkError);
				// Fall through to regular verification
			}
		}
		
		// Regular secret verification (HS256 or legacy)
		const isValid = await jwt.verify(token, signingKey, {
			algorithm: algorithm as any, // ES256, HS256, etc.
		});
		
		if (!isValid) {
			return null;
		}

		// Decode payload safely
		const decoded = jwt.decode(token);
		if (!decoded.payload) {
			return null;
		}

		const payload = decoded.payload as JWTPayload;

		// Additional validation
		if (!payload.sub || !payload.email) {
			console.warn('JWT missing required fields (sub, email)');
			return null;
		}

		// Check expiration manually for better error handling
		if (payload.exp && Date.now() >= payload.exp * 1000) {
			console.warn('JWT token expired');
			return null;
		}

		return {
			id: payload.sub,
			email: payload.email,
			role: payload.role || 'user',
			iat: payload.iat,
			exp: payload.exp,
		};
	} catch (error) {
		console.error('JWT validation failed:', error);
		return null;
	}
}

async function validateJWTWithJWK(token: string, jwk: any, algorithm: string = 'ES256'): Promise<User | null> {
	try {
		// Direct JWK verification
		const isValid = await jwt.verify(token, jwk, {
			algorithm: algorithm as any,
		});
		
		if (!isValid) {
			return null;
		}

		// Decode payload safely
		const decoded = jwt.decode(token);
		if (!decoded.payload) {
			return null;
		}

		const payload = decoded.payload as JWTPayload;

		// Additional validation
		if (!payload.sub || !payload.email) {
			console.warn('JWT missing required fields (sub, email)');
			return null;
		}

		// Check expiration manually for better error handling
		if (payload.exp && Date.now() >= payload.exp * 1000) {
			console.warn('JWT token expired');
			return null;
		}

		return {
			id: payload.sub,
			email: payload.email,
			role: payload.role || 'user',
			iat: payload.iat,
			exp: payload.exp,
		};
	} catch (error) {
		console.error('JWT JWK validation failed:', error);
		return null;
	}
}

export const authMiddleware: Middleware = async (request, context, next) => {
	const authHeader = request.headers.get('Authorization');
	
	if (authHeader?.startsWith('Bearer ')) {
		const token = authHeader.substring(7);
		
		// Use ES256 by default (Supabase ECC), fallback to HS256 for backward compatibility
		const algorithm = context.env.JWT_ALGORITHM || 'ES256';
		
		// Try different key sources in order of preference
		let signingKey: string | any | undefined;
		
		if (algorithm === 'ES256') {
			// For ES256, prefer built-in JWK, then env var, then Supabase service key
			signingKey = supabaseJWK || context.env.JWT_SIGNING_KEY || context.env.SUPABASE_SERVICE_KEY;
		} else {
			// For HS256, use environment variables
			signingKey = context.env.JWT_SIGNING_KEY || context.env.SUPABASE_SERVICE_KEY;
		}
		
		if (signingKey) {
			let user: User | null = null;
			
			// Handle JWK object vs string
			if (typeof signingKey === 'object' && signingKey !== null) {
				// Direct JWK object (from import)
				user = await validateJWTWithJWK(token, signingKey, algorithm);
			} else if (typeof signingKey === 'string') {
				// String (could be JWK string or regular secret)
				user = await validateJWTWithSigningKey(token, signingKey, algorithm);
			}
			
			if (user) {
				context.user = user;
				
				// Log successful authentication (without sensitive data)
				console.log('User authenticated:', {
					userId: user.id,
					email: user.email,
					role: user.role,
					algorithm,
					keySource: typeof signingKey === 'object' ? 'jwk-file' : 'env-var',
					requestId: context.requestId,
				});
			} else {
				// Log authentication failure for monitoring
				console.warn('JWT authentication failed:', {
					hasToken: true,
					hasSigningKey: !!signingKey,
					algorithm,
					requestId: context.requestId,
				});
			}
		} else {
			console.warn('No JWT signing key configured');
		}
	}

	return next();
};

export const requireAuth: Middleware = async (request, context, next) => {
	if (!context.user) {
		return new Response(
			JSON.stringify({
				message: 'Authentication required',
				error_code: 'UNAUTHORIZED',
			}),
			{
				status: 401,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}

	return next();
};