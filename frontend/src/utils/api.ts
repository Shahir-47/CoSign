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

// Map technical error messages to user-friendly ones
function getUserFriendlyMessage(
	error: string,
	status: number,
	endpoint: string
): string {
	const lowerError = error.toLowerCase();

	// Authentication errors
	if (status === 401) {
		if (endpoint.includes("/auth/login")) {
			if (lowerError.includes("bad credentials")) {
				return "Invalid email or password. Please check your credentials and try again.";
			}
			if (lowerError.includes("email not verified")) {
				return "Your email is not verified. Please check your inbox for the verification link.";
			}
		}
		return "Your session has expired. Please log in again.";
	}

	if (status === 403) {
		return "You don't have permission to perform this action.";
	}

	// Penalty-related errors
	if (lowerError.includes("penalty") && lowerError.includes("exposed")) {
		return "This penalty content has already been revealed in a previous task. Please use different content for accountability.";
	}
	if (lowerError.includes("penalty") && lowerError.includes("reuse")) {
		return "You cannot reuse the same penalty content. Please provide new content for this task.";
	}
	if (lowerError.includes("penalty") && lowerError.includes("required")) {
		return "A penalty is required. Please add text or upload files to hold yourself accountable.";
	}

	// Task-related errors
	if (lowerError.includes("task not found")) {
		return "This task could not be found. It may have been deleted.";
	}
	if (lowerError.includes("not authorized")) {
		return "You are not authorized to perform this action on this task.";
	}
	if (
		lowerError.includes("cannot submit proof") &&
		lowerError.includes("missed")
	) {
		return "Cannot submit proof for this task. The deadline has passed and the penalty has been revealed.";
	}
	if (lowerError.includes("not pending proof")) {
		return "This task is not waiting for proof submission.";
	}
	if (lowerError.includes("not waiting for verification")) {
		return "This task is not waiting for verification.";
	}

	// Verifier-related errors
	if (lowerError.includes("verifier") && lowerError.includes("not found")) {
		return "Could not find this verifier. They may not have an account yet.";
	}
	if (lowerError.includes("cannot add yourself")) {
		return "You cannot add yourself as a verifier.";
	}
	if (lowerError.includes("already") && lowerError.includes("verifier")) {
		return "This person is already in your verifiers list.";
	}

	// Email verification errors
	if (lowerError.includes("email") && lowerError.includes("in use")) {
		return "This email address is already registered. Please log in or use a different email.";
	}
	if (lowerError.includes("verification") && lowerError.includes("token")) {
		return "This verification link is invalid or has expired. Please request a new one.";
	}

	// List-related errors
	if (lowerError.includes("list") && lowerError.includes("not found")) {
		return "This list could not be found. It may have been deleted.";
	}

	// Generic server errors
	if (status >= 500) {
		return "Something went wrong on our end. Please try again in a moment.";
	}

	// Return original error if no mapping found (but clean it up)
	return (
		error.replace(/^(java\.lang\.\w+:\s*)/i, "").trim() ||
		"An unexpected error occurred."
	);
}

export async function apiRequest<T>(
	endpoint: string,
	options: RequestOptions = {}
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
		const userFriendlyMessage = getUserFriendlyMessage(
			errorText,
			response.status,
			endpoint
		);

		// Handle 401 - token expired
		if (response.status === 401 && !endpoint.includes("/auth/")) {
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
