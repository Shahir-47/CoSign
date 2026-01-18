// API utility for making authenticated requests
import { toast } from "react-toastify";

const API_BASE = "/api";

// Global logout handler - will be set by AuthContext
let globalLogoutHandler: ((message?: string) => void) | null = null;

export function setGlobalLogoutHandler(handler: (message?: string) => void) {
	globalLogoutHandler = handler;
}

interface RequestOptions extends RequestInit {
	requiresAuth?: boolean;
	showErrorToast?: boolean; // Default true - show toast on error
}

// Parse error response - handles both JSON and plain text
function parseErrorResponse(text: string): string {
	if (!text) return "";

	try {
		const json = JSON.parse(text);
		// Spring Boot default error format: { timestamp, status, error, message, path }
		// Custom error format might have: { message, error }
		return json.message || json.error || JSON.stringify(json);
	} catch {
		// Not JSON, return as plain text
		return text;
	}
}

// Map technical error messages to user-friendly ones
export function getUserFriendlyMessage(
	error: string,
	status: number,
	endpoint: string,
): string {
	// First parse the error if it's JSON
	const parsedError = parseErrorResponse(error);

	// Clean up Java exception prefixes from Spring Boot errors
	const cleanedError = parsedError
		.replace(/^(java\.lang\.\w+:\s*)/i, "")
		.replace(/^(org\.springframework\.\w+(\.\w+)*:\s*)/i, "")
		.replace(/^(Exception:\s*)/i, "")
		.replace(/^(RuntimeException:\s*)/i, "")
		.trim();

	// If we have a reasonable message from the backend, use it directly
	if (
		cleanedError &&
		cleanedError.length > 0 &&
		cleanedError.length < 300 &&
		!cleanedError.includes("{") &&
		!cleanedError.includes("<!DOCTYPE") &&
		!cleanedError.includes("<html")
	) {
		return cleanedError;
	}

	// Fallback for cases where backend didn't provide a useful message
	// (e.g., network errors, HTML error pages, empty responses)

	if (status === 401) {
		if (endpoint.includes("/auth/login")) {
			return "Invalid email or password. Please check your credentials and try again.";
		}
		return "Your session has expired. Please log in again.";
	}

	if (status === 403) {
		return "You don't have permission to perform this action.";
	}

	if (status === 404) {
		return "The requested resource could not be found.";
	}

	if (status === 409) {
		return "This action conflicts with existing data.";
	}

	if (status >= 500) {
		return "Something went wrong on our end. Please try again in a moment.";
	}

	return "An unexpected error occurred. Please try again.";
}

export async function apiRequest<T>(
	endpoint: string,
	options: RequestOptions = {},
): Promise<T> {
	const {
		requiresAuth = true,
		showErrorToast = true,
		headers = {},
		...rest
	} = options;

	const requestHeaders: HeadersInit = {
		"Content-Type": "application/json",
		...headers,
	};

	if (requiresAuth) {
		const token = localStorage.getItem("token");
		if (token) {
			(requestHeaders as Record<string, string>)["Authorization"] =
				`Bearer ${token}`;
		}
	}

	const response = await fetch(`${API_BASE}${endpoint}`, {
		headers: requestHeaders,
		...rest,
	});

	if (!response.ok) {
		const errorText = await response.text();
		const userFriendlyMessage = getUserFriendlyMessage(
			errorText,
			response.status,
			endpoint,
		);

		// Handle 401 or 403 - token expired or invalid
		if (
			(response.status === 401 || response.status === 403) &&
			!endpoint.includes("/auth/")
		) {
			if (globalLogoutHandler) {
				globalLogoutHandler("Your session has expired. Please log in again.");
			}
			throw new Error(userFriendlyMessage);
		}

		// Show error toast if enabled
		if (showErrorToast) {
			toast.error(userFriendlyMessage);
		}

		throw new Error(userFriendlyMessage);
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
