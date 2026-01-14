// Type definitions matching the backend models

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskStatus =
	| "PENDING_PROOF"
	| "PENDING_VERIFICATION"
	| "COMPLETED"
	| "MISSED";

export interface User {
	id: number;
	fullName: string;
	email: string;
	timezone: string;
	profilePictureUrl?: string;
}

export interface Category {
	id: number;
	name: string;
	colorHex?: string;
}

export interface TaskList {
	id: number;
	name: string;
	colorHex?: string;
	icon?: string;
	isDefault: boolean;
	taskCount: number;
}

export interface Task {
	id: number;
	title: string;
	description?: string;
	deadline: string; // ISO date string
	location?: string;
	starred: boolean;
	repeatPattern?: string;
	priority: TaskPriority;
	status: TaskStatus;
	creator: User;
	verifier: User;
	category?: Category;
	list?: TaskList;
	proofUrl?: string;
	completedAt?: string;
	createdAt: string;
}

export interface TaskRequest {
	title: string;
	description?: string;
	deadline: string; // ISO date string
	verifierEmail: string;
	categoryName?: string;
	listId?: number;
	priority?: TaskPriority;
	location?: string;
	repeatPattern?: string;
	starred?: boolean;
}

export interface TaskListRequest {
	name: string;
	colorHex?: string;
	icon?: string;
}
