// API utility for making authenticated requests

const API_BASE = "/api";

interface RequestOptions extends RequestInit {
	requiresAuth?: boolean;
}

export async function apiRequest<T>(
	endpoint: string,
	options: RequestOptions = {}
): Promise<T> {
	const { requiresAuth = true, headers = {}, ...rest } = options;

	const requestHeaders: HeadersInit = {
		"Content-Type": "application/json",
		...headers,
	};

	if (requiresAuth) {
		const token = localStorage.getItem("token");
		if (token) {
			(requestHeaders as Record<string, string>)[
				"Authorization"
			] = `Bearer ${token}`;
		}
	}

	const response = await fetch(`${API_BASE}${endpoint}`, {
		headers: requestHeaders,
		...rest,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			errorText || `Request failed with status ${response.status}`
		);
	}

	// Handle empty responses
	const text = await response.text();
	if (!text) {
		return {} as T;
	}

	return JSON.parse(text);
}

export const api = {
	get: <T>(endpoint: string, options?: RequestOptions) =>
		apiRequest<T>(endpoint, { method: "GET", ...options }),

	post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
		apiRequest<T>(endpoint, {
			method: "POST",
			body: data ? JSON.stringify(data) : undefined,
			...options,
		}),

	put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
		apiRequest<T>(endpoint, {
			method: "PUT",
			body: data ? JSON.stringify(data) : undefined,
			...options,
		}),

	delete: <T>(endpoint: string, options?: RequestOptions) =>
		apiRequest<T>(endpoint, { method: "DELETE", ...options }),
};
