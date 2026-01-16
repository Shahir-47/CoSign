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
	isOnline?: boolean;
}

export interface Supervisee {
	id: number;
	fullName: string;
	email: string;
	profilePictureUrl?: string;
	isOnline: boolean;
	pendingProofCount: number;
	pendingVerificationCount: number;
	completedCount: number;
	totalTaskCount: number;
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
	// Timestamps
	createdAt: string;
	updatedAt?: string;
	submittedAt?: string; // When proof was submitted
	verifiedAt?: string; // When verifier reviewed (approved or denied)
	completedAt?: string; // When task was completed (approved)
	rejectedAt?: string; // When proof was rejected
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
	penaltyContent?: string; // Decrypted penalty HTML (only if exposed)
	penaltyAttachments?: ProofAttachment[]; // Penalty file attachments (only if exposed)
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
	penaltyContent: string; // Rich text HTML for the penalty/secret
	penaltyAttachments?: AttachmentDto[]; // Penalty file attachments
}

export interface AttachmentDto {
	s3Key: string;
	originalFilename: string;
	mimeType: string;
	contentHash: string; // SHA-256 hash of file content for duplicate detection
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

// Sorting types
export type SortField =
	| "deadline"
	| "priority"
	| "status"
	| "title"
	| "createdAt"
	| "submittedAt";

export type SortDirection = "asc" | "desc";

export interface SortOption {
	field: SortField;
	direction: SortDirection;
}

export interface TaskSortConfig {
	primary: SortOption;
	secondary?: SortOption;
	tiebreaker: "starred" | "title" | "createdAt";
}

export interface TaskListRequest {
	name: string;
	colorHex?: string;
	icon?: string;
}
