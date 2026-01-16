import { createContext } from "react";
import type { MessageHandler } from "./websocket.types";

export interface WebSocketContextValue {
	isConnected: boolean;
	onlineUsers: Set<number>;
	subscribe: (handler: MessageHandler) => () => void;
	isUserOnline: (userId: number) => boolean;
	connect: () => void;
	disconnect: () => void;
	send: (type: string, payload: Record<string, unknown>) => void;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(
	null
);
