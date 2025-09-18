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

async function validateJWT(token: string, key: string | any, algorithm: string = 'ES256'): Promise<User | null> {
	try {
		let verificationKey = key;
		
		// Handle string keys that might be JWK JSON
		if (typeof key === 'string' && key.startsWith('{') && key.includes('"kty"')) {
			try {
				verificationKey = JSON.parse(key);
			} catch (parseError) {
				console.error('Failed to parse JWK string, using as regular secret:', parseError);
				verificationKey = key;
			}
		}
		
		// Verify JWT with appropriate key
		const isValid = await jwt.verify(token, verificationKey, {
			algorithm: algorithm as any,
		});
		
		if (!isValid) {
			return null;
		}

		// Decode and validate payload
		const decoded = jwt.decode(token);
		if (!decoded.payload) {
			return null;
		}

		const payload = decoded.payload as JWTPayload;

		// Validate required fields
		if (!payload.sub || !payload.email) {
			console.warn('JWT missing required fields (sub, email)');
			return null;
		}

		// Check expiration
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
			// Use consolidated validation function
			const user = await validateJWT(token, signingKey, algorithm);
			
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