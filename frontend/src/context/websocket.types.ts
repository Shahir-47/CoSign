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
	updatedBy?: string;
}

export interface NewTaskAssignedPayload {
	taskId: number;
	title: string;
	creatorName: string;
}

export type MessageHandler = (message: SocketMessage) => void;
