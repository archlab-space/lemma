/**
 * Router for Lemma Edge API
 */

import { RouteHandler, Middleware, RequestContext } from '../types';

export interface Route {
	method: string;
	path: string | RegExp;
	handler: RouteHandler;
	middleware?: Middleware[];
}

export class Router {
	private routes: Route[] = [];
	private globalMiddleware: Middleware[] = [];

	// Add global middleware (applied to all routes)
	use(middleware: Middleware): void {
		this.globalMiddleware.push(middleware);
	}

	// Add route with specific method
	addRoute(method: string, path: string | RegExp, handler: RouteHandler, middleware: Middleware[] = []): void {
		this.routes.push({
			method: method.toUpperCase(),
			path,
			handler,
			middleware,
		});
	}

	// Convenience methods for HTTP methods
	get(path: string | RegExp, handler: RouteHandler, middleware: Middleware[] = []): void {
		this.addRoute('GET', path, handler, middleware);
	}

	post(path: string | RegExp, handler: RouteHandler, middleware: Middleware[] = []): void {
		this.addRoute('POST', path, handler, middleware);
	}

	put(path: string | RegExp, handler: RouteHandler, middleware: Middleware[] = []): void {
		this.addRoute('PUT', path, handler, middleware);
	}

	delete(path: string | RegExp, handler: RouteHandler, middleware: Middleware[] = []): void {
		this.addRoute('DELETE', path, handler, middleware);
	}

	patch(path: string | RegExp, handler: RouteHandler, middleware: Middleware[] = []): void {
		this.addRoute('PATCH', path, handler, middleware);
	}

	options(path: string | RegExp, handler: RouteHandler, middleware: Middleware[] = []): void {
		this.addRoute('OPTIONS', path, handler, middleware);
	}

	// Match path against route pattern
	private matchPath(pattern: string | RegExp, path: string): boolean {
		if (typeof pattern === 'string') {
			// Simple string matching with wildcard support
			if (pattern.includes('*')) {
				const regexPattern = pattern.replace(/\*/g, '.*');
				return new RegExp(`^${regexPattern}$`).test(path);
			}
			return pattern === path;
		}
		return pattern.test(path);
	}

	// Find matching route
	private findRoute(method: string, path: string): Route | null {
		return this.routes.find(route => 
			route.method === method.toUpperCase() && 
			this.matchPath(route.path, path)
		) || null;
	}

	// Execute middleware chain
	private async executeMiddleware(
		middleware: Middleware[],
		request: Request,
		context: RequestContext,
		handler: RouteHandler
	): Promise<Response> {
		let index = 0;

		const next = async (): Promise<Response> => {
			if (index < middleware.length) {
				const currentMiddleware = middleware[index++];
				return await currentMiddleware(request, context, next);
			} else {
				// All middleware executed, call the handler
				return await handler(request, context);
			}
		};

		return await next();
	}

	// Handle incoming request
	async handle(request: Request, context: RequestContext): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;
		const path = url.pathname;

		// Find matching route
		const route = this.findRoute(method, path);

		if (!route) {
			return new Response(
				JSON.stringify({
					message: 'Route not found',
					error_code: 'NOT_FOUND',
					method,
					path,
				}),
				{
					status: 404,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
		}

		// Combine global middleware with route-specific middleware
		const allMiddleware = [...this.globalMiddleware, ...(route.middleware || [])];

		try {
			// Execute middleware chain and handler
			return await this.executeMiddleware(allMiddleware, request, context, route.handler);
		} catch (error) {
			console.error('Route handler error:', error);
			
			return new Response(
				JSON.stringify({
					message: 'Internal server error',
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
	}
}