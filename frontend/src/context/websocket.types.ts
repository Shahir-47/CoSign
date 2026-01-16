// WebSocket message types from backend

export interface SocketMessage {
	type: string;
	payload: unknown;
}

export interface UserStatusPayload {
	userId: number;
	isOnline: boolean;
}

export interface TaskUpdatedPayload {
	taskId: number;
	status: string;
	message: string;
	approved?: boolean;
	denialReason?: string;
	approvalComment?: string;
	verifiedAt?: string;
	completedAt?: string;
	rejectedAt?: string;
	submittedAt?: string;
	updatedBy?: string;
	verifier?: UserInfo; // For reassign updates
}

export interface UserInfo {
	id: number;
	fullName: string;
	email: string;
	timezone: string;
	profilePictureUrl?: string;
}

export interface NewTaskAssignedPayload {
	taskId: number;
	title: string;
	creatorName: string;
	description?: string;
	deadline: string;
	priority: string;
	status: string;
	starred: boolean;
	location?: string;
	tags?: string;
	createdAt: string;
	submittedAt?: string;
	creator: UserInfo;
	verifier: UserInfo;
}

export type MessageHandler = (message: SocketMessage) => void;
