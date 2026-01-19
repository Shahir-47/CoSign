import {
	useEffect,
	useRef,
	useState,
	useCallback,
	type ReactNode,
} from "react";
import type {
	SocketMessage,
	UserStatusPayload,
	MessageHandler,
} from "./websocket.types";
import {
	WebSocketContext,
	type WebSocketContextValue,
} from "./WebSocketContextValue";

// Dynamically construct WebSocket URL based on current location
function getWebSocketUrl(): string {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	const host = window.location.host;
	return `${protocol}//${host}/ws`;
}

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000; // Cap at 30 seconds

export function WebSocketProvider({ children }: { children: ReactNode }) {
	const [isConnected, setIsConnected] = useState(false);
	const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

	const wsRef = useRef<WebSocket | null>(null);
	const handlersRef = useRef<Set<MessageHandler>>(new Set());
	const reconnectAttemptsRef = useRef(0);
	const reconnectTimeoutRef = useRef<number | null>(null);
	const connectRef = useRef<() => void>(() => {});
	const isReconnectingRef = useRef(false);

	// Get token from localStorage
	const getToken = useCallback(() => {
		return localStorage.getItem("token");
	}, []);

	// Subscribe to messages
	const subscribe = useCallback((handler: MessageHandler) => {
		handlersRef.current.add(handler);
		return () => {
			handlersRef.current.delete(handler);
		};
	}, []);

	// Check if a specific user is online
	const isUserOnline = useCallback(
		(userId: number) => {
			return onlineUsers.has(userId);
		},
		[onlineUsers],
	);

	// Disconnect WebSocket
	const disconnect = useCallback(() => {
		// Clear any pending reconnect
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		isReconnectingRef.current = false;
		reconnectAttemptsRef.current = 0;

		// Close the connection
		if (wsRef.current) {
			wsRef.current.close(1000, "Logged out");
			wsRef.current = null;
		}
		setIsConnected(false);
		setOnlineUsers(new Set());
	}, []);

	// Send message to server
	const send = useCallback((type: string, payload: Record<string, unknown>) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ type, ...payload }));
		} else {
			console.warn("WebSocket not connected, cannot send message:", type);
		}
	}, []);

	// Handle incoming messages
	const handleMessage = useCallback((event: MessageEvent) => {
		try {
			const message: SocketMessage = JSON.parse(event.data);

			// Handle USER_STATUS internally to track online users
			if (message.type === "USER_STATUS") {
				const payload = message.payload as UserStatusPayload;
				setOnlineUsers((prev) => {
					const next = new Set(prev);
					if (payload.isOnline) {
						next.add(payload.userId);
					} else {
						next.delete(payload.userId);
					}
					return next;
				});
			}

			// Notify all subscribers
			handlersRef.current.forEach((handler) => {
				try {
					handler(message);
				} catch (err) {
					console.error("Error in WebSocket message handler:", err);
				}
			});
		} catch (err) {
			console.error("Failed to parse WebSocket message:", err);
		}
	}, []);

	// Connect to WebSocket
	const connect = useCallback(() => {
		const token = getToken();
		if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
			return;
		}

		// Close existing connection if any
		if (wsRef.current) {
			wsRef.current.close();
		}

		const wsUrl = getWebSocketUrl();
		console.log("WebSocket connecting to:", wsUrl);

		const ws = new WebSocket(`${wsUrl}?token=${token}`);

		ws.onopen = () => {
			console.log("WebSocket connected successfully");
			setIsConnected(true);
			reconnectAttemptsRef.current = 0;
		};

		ws.onmessage = handleMessage;

		ws.onclose = (event) => {
			console.log("WebSocket disconnected:", event.code, event.reason);
			setIsConnected(false);
			wsRef.current = null;

			// Attempt reconnect if not a clean close and we have a token
			// Keep trying indefinitely with exponential backoff
			const currentToken = getToken();
			if (event.code !== 1000 && currentToken && !isReconnectingRef.current) {
				isReconnectingRef.current = true;
				reconnectAttemptsRef.current++;

				// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
				const delay = Math.min(
					INITIAL_RECONNECT_DELAY *
						Math.pow(2, reconnectAttemptsRef.current - 1),
					MAX_RECONNECT_DELAY,
				);

				console.log(
					`WebSocket reconnecting in ${delay / 1000}s (attempt ${
						reconnectAttemptsRef.current
					})...`,
				);

				reconnectTimeoutRef.current = window.setTimeout(() => {
					isReconnectingRef.current = false;
					connectRef.current();
				}, delay);
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		wsRef.current = ws;
	}, [getToken, handleMessage]);

	// Keep connectRef in sync with connect
	useEffect(() => {
		connectRef.current = connect;
	}, [connect]);

	// Connect when component mounts and token exists
	useEffect(() => {
		const token = getToken();
		if (token) {
			connect();
		}

		// Listen for storage events (login/logout in other tabs)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "token") {
				if (e.newValue) {
					connectRef.current();
				} else {
					// Token removed, disconnect
					if (wsRef.current) {
						wsRef.current.close(1000, "Logged out");
						wsRef.current = null;
					}
					setOnlineUsers(new Set());
				}
			}
		};

		// Handle tab/window close - close socket cleanly so server knows user is offline
		const handleBeforeUnload = () => {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.close(1000, "Tab closing");
			}
		};

		window.addEventListener("storage", handleStorageChange);
		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("storage", handleStorageChange);
			window.removeEventListener("beforeunload", handleBeforeUnload);
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (wsRef.current) {
				wsRef.current.close(1000, "Component unmounting");
				wsRef.current = null;
			}
		};
	}, [getToken, connect]);

	const value: WebSocketContextValue = {
		isConnected,
		onlineUsers,
		subscribe,
		isUserOnline,
		connect,
		disconnect,
		send,
	};

	return (
		<WebSocketContext.Provider value={value}>
			{children}
		</WebSocketContext.Provider>
	);
}
