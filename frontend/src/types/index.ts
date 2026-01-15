// Type definitions matching the backend models

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskStatus =
	| "PENDING_PROOF"
	| "PENDING_VERIFICATION"
	| "COMPLETED"
	| "MISSED"
	| "PAUSED";

export interface User {
	id: number;
	fullName: string;
	email: string;
	timezone: string;
	profilePictureUrl?: string;
}

export interface Verifier {
	id: number;
	fullName: string;
	email: string;
	profilePictureUrl?: string;
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
	tags?: string; // Comma-separated tags
	list?: TaskList;
	proofUrl?: string;
	proofDescription?: string;
	denialReason?: string;
	approvalComment?: string;
	verifiedAt?: string;
	completedAt?: string;
	createdAt: string;
}

export interface ProofAttachment {
	filename: string;
	url: string;
	mimeType: string;
}

export interface TaskDetails {
	id: number;
	title: string;
	status: TaskStatus;
	proofDescription?: string;
	denialReason?: string;
	approvalComment?: string;
	attachments: ProofAttachment[];
}

export interface ProofSubmissionRequest {
	description: string;
	attachments: {
		s3Key: string;
		originalFilename: string;
		mimeType: string;
	}[];
}

export interface ReviewTaskRequest {
	approved: boolean;
	comment?: string;
}

export interface TaskRequest {
	title: string;
	description?: string;
	deadline: string; // ISO date string
	verifierEmail: string;
	tags?: string; // Comma-separated tags
	listId?: number;
	priority?: TaskPriority;
	location?: string;
	repeatPattern?: string;
	starred?: boolean;
}

export interface TaskFilters {
	search: string;
	tags: string[];
	priorities: TaskPriority[];
	statuses: TaskStatus[];
	starred: boolean | null;
	deadlineFrom?: string;
	deadlineTo?: string;
}

export interface TaskListRequest {
	name: string;
	colorHex?: string;
	icon?: string;
}
