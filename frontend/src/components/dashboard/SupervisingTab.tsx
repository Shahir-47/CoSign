import { useState, useEffect, useCallback, useRef } from "react";
import {
	Users,
	Clock,
	CheckCircle2,
	FileCheck,
	Loader2,
	AlertCircle,
	UserCircle,
} from "lucide-react";
import { api } from "../../utils/api";
import { useWebSocket } from "../../context/useWebSocket";
import type { Supervisee } from "../../types";
import type {
	SocketMessage,
	UserStatusPayload,
} from "../../context/websocket.types";
import styles from "./SupervisingTab.module.css";

interface SupervisingTabProps {
	refreshKey?: number;
	highlightUserId?: number | null;
	onHighlightComplete?: () => void;
}

export default function SupervisingTab({
	refreshKey,
	highlightUserId,
	onHighlightComplete,
}: SupervisingTabProps) {
	const [supervisees, setSupervisees] = useState<Supervisee[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { subscribe } = useWebSocket();

	const fetchSupervisees = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await api.get<Supervisee[]>("/verifiers/supervisees");
			// The API returns the correct isOnline status from the backend
			setSupervisees(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load supervisees",
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSupervisees();
	}, [fetchSupervisees, refreshKey]);

	// Subscribe to WebSocket events for real-time updates
	useEffect(() => {
		const handleMessage = (message: SocketMessage) => {
			if (message.type === "USER_STATUS") {
				// Update online status in real-time
				const payload = message.payload as UserStatusPayload;
				setSupervisees((prev) =>
					prev.map((s) =>
						s.id === payload.userId ? { ...s, isOnline: payload.isOnline } : s,
					),
				);
			} else if (
				message.type === "NEW_TASK_ASSIGNED" ||
				message.type === "TASK_UPDATED" ||
				message.type === "VERIFIER_ADDED" ||
				message.type === "VERIFIER_REMOVED"
			) {
				// Refresh when tasks change or verifier relationships change
				fetchSupervisees();
			}
		};

		const unsubscribe = subscribe(handleMessage);
		return unsubscribe;
	}, [subscribe, fetchSupervisees]);

	// Refs map for scrolling to specific supervisee cards
	const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

	// Scroll to and highlight supervisee card when highlightUserId is set
	useEffect(() => {
		if (highlightUserId === null || highlightUserId === undefined) return;

		// Small delay to ensure DOM has updated after navigation/data load
		const timeoutId = setTimeout(() => {
			const cardElement = cardRefs.current.get(highlightUserId);
			if (cardElement) {
				cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
				// Add a brief highlight effect
				cardElement.classList.add(styles.highlight);
				setTimeout(() => {
					cardElement.classList.remove(styles.highlight);
				}, 2000);
				// Notify parent that highlight is complete
				onHighlightComplete?.();
			}
		}, 300); // Slightly longer delay to wait for data to load

		return () => clearTimeout(timeoutId);
	}, [highlightUserId, supervisees, onHighlightComplete]);

	if (isLoading) {
		return (
			<div className={styles.loading}>
				<Loader2 className={styles.spinner} size={32} />
				<span>Loading supervisees...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.error}>
				<AlertCircle size={24} />
				<span>{error}</span>
			</div>
		);
	}

	if (supervisees.length === 0) {
		return (
			<div className={styles.empty}>
				<Users size={48} />
				<h3>No one has added you as a verifier yet</h3>
				<p>
					When someone adds you as their verifier, they'll appear here and you
					can track their tasks.
				</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2>
					<Users size={24} />
					People You're Supervising
				</h2>
				<span className={styles.count}>{supervisees.length} people</span>
			</div>

			<div className={styles.grid}>
				{supervisees.map((supervisee) => (
					<div
						key={supervisee.id}
						className={styles.card}
						ref={(el) => {
							if (el) {
								cardRefs.current.set(supervisee.id, el);
							} else {
								cardRefs.current.delete(supervisee.id);
							}
						}}
					>
						<div className={styles.cardHeader}>
							<div className={styles.avatar}>
								{supervisee.profilePictureUrl ? (
									<img
										src={supervisee.profilePictureUrl}
										alt={supervisee.fullName}
									/>
								) : (
									<UserCircle size={48} />
								)}
								<span
									className={`${styles.statusDot} ${
										supervisee.isOnline ? styles.online : styles.offline
									}`}
								/>
							</div>
							<div className={styles.userInfo}>
								<h3>{supervisee.fullName}</h3>
								<span className={styles.email}>{supervisee.email}</span>
								<span
									className={`${styles.statusText} ${
										supervisee.isOnline ? styles.online : styles.offline
									}`}
								>
									{supervisee.isOnline ? "Online" : "Offline"}
								</span>
							</div>
						</div>

						<div className={styles.stats}>
							<div className={styles.stat}>
								<div className={styles.statIcon} data-type="pending-proof">
									<Clock size={16} />
								</div>
								<div className={styles.statInfo}>
									<span className={styles.statValue}>
										{supervisee.pendingProofCount}
									</span>
									<span className={styles.statLabel}>Pending Proof</span>
								</div>
							</div>

							<div className={styles.stat}>
								<div
									className={styles.statIcon}
									data-type="pending-verification"
								>
									<FileCheck size={16} />
								</div>
								<div className={styles.statInfo}>
									<span className={styles.statValue}>
										{supervisee.pendingVerificationCount}
									</span>
									<span className={styles.statLabel}>To Review</span>
								</div>
							</div>

							<div className={styles.stat}>
								<div className={styles.statIcon} data-type="completed">
									<CheckCircle2 size={16} />
								</div>
								<div className={styles.statInfo}>
									<span className={styles.statValue}>
										{supervisee.completedCount}
									</span>
									<span className={styles.statLabel}>Completed</span>
								</div>
							</div>
						</div>

						<div className={styles.cardFooter}>
							<span className={styles.totalTasks}>
								{supervisee.totalTaskCount} total task
								{supervisee.totalTaskCount !== 1 ? "s" : ""} assigned to you
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
