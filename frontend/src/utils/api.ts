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
	endpoint: string
): string {
	// First parse the error if it's JSON
	const parsedError = parseErrorResponse(error);
	const lowerError = parsedError.toLowerCase();

	// ============ STATUS CODE BASED ERRORS ============

	// Authentication errors (401)
	if (status === 401) {
		if (endpoint.includes("/auth/login")) {
			if (
				lowerError.includes("bad credentials") ||
				lowerError.includes("unauthorized")
			) {
				return "Invalid email or password. Please check your credentials and try again.";
			}
			if (
				lowerError.includes("email not verified") ||
				lowerError.includes("not verified")
			) {
				return "Your email is not verified. Please check your inbox for the verification link.";
			}
			return "Invalid email or password. Please check your credentials and try again.";
		}
		return "Your session has expired. Please log in again.";
	}

	// Forbidden errors (403)
	if (status === 403) {
		if (endpoint.includes("/auth/login") || endpoint.includes("/auth/signup")) {
			return "Invalid email or password. Please check your credentials and try again.";
		}
		return "You don't have permission to perform this action.";
	}

	// Not found errors (404)
	if (status === 404) {
		if (endpoint.includes("/tasks")) {
			return "This task could not be found. It may have been deleted.";
		}
		if (endpoint.includes("/lists")) {
			return "This list could not be found. It may have been deleted.";
		}
		if (endpoint.includes("/verifiers")) {
			return "This verifier could not be found.";
		}
		return "The requested resource could not be found.";
	}

	// Conflict errors (409)
	if (status === 409) {
		if (endpoint.includes("/auth/signup")) {
			return "This email address is already registered. Please log in or use a different email.";
		}
		if (endpoint.includes("/verifiers")) {
			return "This person is already in your verifiers list.";
		}
		return "This action conflicts with existing data.";
	}

	// Bad request errors (400)
	if (status === 400) {
		// Fall through to message-based checks below
	}

	// Generic server errors (5xx)
	if (status >= 500) {
		return "Something went wrong on our end. Please try again in a moment.";
	}

	// ============ MESSAGE BASED ERRORS ============

	// Login/Auth errors
	if (lowerError.includes("bad credentials")) {
		return "Invalid email or password. Please check your credentials and try again.";
	}
	if (lowerError.includes("account") && lowerError.includes("disabled")) {
		return "Your account has been disabled. Please contact support for assistance.";
	}
	if (lowerError.includes("account") && lowerError.includes("locked")) {
		return "Your account has been locked. Please try again later or contact support.";
	}

	// Signup/Registration errors
	if (
		lowerError.includes("email") &&
		(lowerError.includes("in use") ||
			lowerError.includes("exists") ||
			lowerError.includes("already") ||
			lowerError.includes("taken"))
	) {
		return "This email address is already registered. Please log in or use a different email.";
	}
	if (lowerError.includes("password") && lowerError.includes("weak")) {
		return "Please choose a stronger password with at least 8 characters, including numbers and special characters.";
	}
	if (lowerError.includes("password") && lowerError.includes("short")) {
		return "Password is too short. Please use at least 8 characters.";
	}
	if (lowerError.includes("password") && lowerError.includes("match")) {
		return "Passwords do not match. Please try again.";
	}
	if (
		lowerError.includes("invalid email") ||
		lowerError.includes("email format") ||
		lowerError.includes("valid email")
	) {
		return "Please enter a valid email address.";
	}
	if (
		(lowerError.includes("name") || lowerError.includes("fullname")) &&
		lowerError.includes("required")
	) {
		return "Please enter your full name.";
	}

	// Email verification errors
	if (lowerError.includes("verification") && lowerError.includes("expired")) {
		return "This verification link has expired. Please request a new one.";
	}
	if (lowerError.includes("already verified")) {
		return "Your email has already been verified. You can log in now.";
	}
	if (
		lowerError.includes("verification") &&
		(lowerError.includes("token") || lowerError.includes("invalid"))
	) {
		return "This verification link is invalid or has expired. Please request a new one.";
	}
	if (
		lowerError.includes("email not verified") ||
		lowerError.includes("not verified")
	) {
		return "Your email is not verified. Please check your inbox for the verification link.";
	}

	// Task-related errors
	if (lowerError.includes("task") && lowerError.includes("not found")) {
		return "This task could not be found. It may have been deleted.";
	}
	if (
		lowerError.includes("not authorized") ||
		lowerError.includes("unauthorized")
	) {
		return "You are not authorized to perform this action.";
	}
	if (
		lowerError.includes("cannot submit proof") ||
		(lowerError.includes("proof") && lowerError.includes("missed"))
	) {
		return "Cannot submit proof for this task. The deadline has passed and the penalty has been revealed.";
	}
	if (
		lowerError.includes("not pending proof") ||
		lowerError.includes("pending_proof")
	) {
		return "This task is not waiting for proof submission.";
	}
	if (
		lowerError.includes("not waiting for verification") ||
		lowerError.includes("pending_verification")
	) {
		return "This task is not waiting for verification.";
	}
	if (lowerError.includes("task") && lowerError.includes("completed")) {
		return "This task has already been completed.";
	}
	if (lowerError.includes("task") && lowerError.includes("missed")) {
		return "This task deadline has been missed.";
	}
	if (lowerError.includes("deadline") && lowerError.includes("past")) {
		return "The deadline cannot be in the past.";
	}
	if (lowerError.includes("title") && lowerError.includes("required")) {
		return "Please enter a task title.";
	}
	if (lowerError.includes("deadline") && lowerError.includes("required")) {
		return "Please set a deadline for this task.";
	}

	// Proof-related errors
	if (lowerError.includes("proof") && lowerError.includes("required")) {
		return "Please provide proof of completion.";
	}
	if (lowerError.includes("proof") && lowerError.includes("empty")) {
		return "Proof cannot be empty. Please add text or upload files.";
	}
	if (lowerError.includes("rejection") && lowerError.includes("reason")) {
		return "Please provide a reason for rejection.";
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
	if (lowerError.includes("penalty") && lowerError.includes("empty")) {
		return "Penalty cannot be empty. Please add text or upload files.";
	}

	// Verifier-related errors
	if (lowerError.includes("verifier") && lowerError.includes("not found")) {
		return "Could not find this verifier. They may not have an account yet.";
	}
	if (
		lowerError.includes("cannot add yourself") ||
		lowerError.includes("add yourself")
	) {
		return "You cannot add yourself as a verifier.";
	}
	if (lowerError.includes("already") && lowerError.includes("verifier")) {
		return "This person is already in your verifiers list.";
	}
	if (lowerError.includes("verifier") && lowerError.includes("required")) {
		return "Please select a verifier for this task.";
	}
	if (lowerError.includes("no verifier")) {
		return "No verifier has been assigned to this task.";
	}

	// List-related errors
	if (lowerError.includes("list") && lowerError.includes("not found")) {
		return "This list could not be found. It may have been deleted.";
	}
	if (
		lowerError.includes("list") &&
		lowerError.includes("name") &&
		lowerError.includes("required")
	) {
		return "Please enter a name for the list.";
	}
	if (lowerError.includes("list") && lowerError.includes("already exists")) {
		return "A list with this name already exists.";
	}

	// File upload errors
	if (lowerError.includes("file") && lowerError.includes("too large")) {
		return "The file is too large. Please upload a smaller file.";
	}
	if (lowerError.includes("file") && lowerError.includes("type")) {
		return "This file type is not supported.";
	}
	if (lowerError.includes("upload") && lowerError.includes("failed")) {
		return "File upload failed. Please try again.";
	}

	// Network/Connection errors
	if (
		lowerError.includes("network") ||
		lowerError.includes("connection") ||
		lowerError.includes("timeout")
	) {
		return "Connection error. Please check your internet and try again.";
	}
	if (lowerError.includes("failed to fetch")) {
		return "Unable to connect to the server. Please check your internet connection.";
	}

	// Recurrence errors
	if (lowerError.includes("recurrence") || lowerError.includes("rrule")) {
		return "Invalid recurrence settings. Please check your repeat options.";
	}

	// Generic fallback - clean up Java exception messages
	const cleanedError = parsedError
		.replace(/^(java\.lang\.\w+:\s*)/i, "")
		.replace(/^(org\.springframework\.\w+\.\w+:\s*)/i, "")
		.replace(/^(Exception:\s*)/i, "")
		.trim();

	// If we still have a reasonable message, return it
	if (
		cleanedError &&
		cleanedError.length < 200 &&
		!cleanedError.includes("{")
	) {
		return cleanedError;
	}

	return "An unexpected error occurred. Please try again.";
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
