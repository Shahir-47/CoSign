import { useState, useEffect } from "react";
import {
	Clock,
	MapPin,
	Star,
	AlertCircle,
	CheckCircle2,
	XCircle,
	User,
	Pause,
	UserX,
} from "lucide-react";
import type { Task } from "../../types";
import { useWebSocket } from "../../context/useWebSocket";
import OnlineStatusIndicator from "../shared/OnlineStatusIndicator";
import styles from "./TaskCard.module.css";
import {
	getTimeUntilDeadline,
	formatDeadlineDisplay,
} from "../../utils/timezone";

interface TaskCardProps {
	task: Task;
	viewMode: "my-tasks" | "verification-requests";
	searchTerm?: string;
	onClick?: () => void;
	onReassign?: () => void;
}

// Highlight matching text
function highlightText(text: string, searchTerm?: string): React.ReactNode {
	if (!searchTerm || !text) return text;

	const regex = new RegExp(
		`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
		"gi"
	);
	const parts = text.split(regex);

	return parts.map((part, i) =>
		regex.test(part) ? (
			<mark key={i} className={styles.highlight}>
				{part}
			</mark>
		) : (
			part
		)
	);
}

const priorityColors: Record<string, string> = {
	LOW: "#10b981",
	MEDIUM: "#f59e0b",
	HIGH: "#f97316",
	CRITICAL: "#ef4444",
};

const statusConfig: Record<
	string,
	{ label: string; icon: typeof Clock; color: string }
> = {
	PENDING_PROOF: { label: "Pending Proof", icon: Clock, color: "#f59e0b" },
	PENDING_VERIFICATION: {
		label: "Awaiting Verification",
		icon: AlertCircle,
		color: "#6366f1",
	},
	COMPLETED: { label: "Completed", icon: CheckCircle2, color: "#10b981" },
	MISSED: { label: "Missed", icon: XCircle, color: "#ef4444" },
	PAUSED: { label: "Paused - Needs Verifier", icon: Pause, color: "#f97316" },
};

function formatDeadline(deadline: string): {
	text: string;
	isUrgent: boolean;
	isPast: boolean;
} {
	// Use timezone-aware calculation
	const diffMs = getTimeUntilDeadline(deadline);
	const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
	const totalMinutes = Math.floor(totalSeconds / 60);
	const totalHours = Math.floor(totalMinutes / 60);
	const totalDays = Math.floor(totalHours / 24);

	const seconds = totalSeconds % 60;
	const minutes = totalMinutes % 60;

	const isPast = diffMs < 0;

	if (isPast) {
		if (totalDays > 0) {
			return {
				text: `${totalDays}d overdue`,
				isUrgent: false,
				isPast: true,
			};
		}
		if (totalHours > 0) {
			return {
				text: `${totalHours}h ${minutes}m overdue`,
				isUrgent: false,
				isPast: true,
			};
		}
		return {
			text: `${totalMinutes}m ${seconds}s overdue`,
			isUrgent: false,
			isPast: true,
		};
	}

	// Not past - show time remaining
	if (totalDays > 7) {
		return {
			text: formatDeadlineDisplay(deadline, {
				month: "short",
				day: "numeric",
				year:
					new Date(deadline).getFullYear() !== new Date().getFullYear()
						? "numeric"
						: undefined,
			}),
			isUrgent: false,
			isPast: false,
		};
	}

	if (totalDays > 0) {
		return {
			text: `${totalDays}d left`,
			isUrgent: false,
			isPast: false,
		};
	}

	if (totalHours > 0) {
		return {
			text: `${totalHours}h ${minutes}m left`,
			isUrgent: true,
			isPast: false,
		};
	}

	// Less than an hour - show minutes and seconds
	return {
		text: `${totalMinutes}m ${seconds}s left`,
		isUrgent: true,
		isPast: false,
	};
}

export default function TaskCard({
	task,
	viewMode,
	searchTerm,
	onClick,
	onReassign,
}: TaskCardProps) {
	const [, setTick] = useState(0);
	const { isUserOnline } = useWebSocket();

	// Update every second for live countdown
	useEffect(() => {
		const interval = setInterval(() => {
			setTick((t) => t + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const status = statusConfig[task.status];
	const StatusIcon = status.icon;
	const deadline = formatDeadline(task.deadline);

	// Get the other person (verifier for my-tasks, creator for verification-requests)
	const otherPerson = viewMode === "my-tasks" ? task.verifier : task.creator;

	return (
		<div
			className={`${styles.card} ${task.starred ? styles.starred : ""}`}
			onClick={onClick}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
		>
			<div className={styles.header}>
				<div className={styles.titleRow}>
					{task.starred && (
						<Star size={16} className={styles.starIcon} fill="currentColor" />
					)}
					<h3 className={styles.title}>
						{highlightText(task.title, searchTerm)}
					</h3>
				</div>
				<div
					className={styles.priority}
					style={{
						backgroundColor: `${priorityColors[task.priority]}20`,
						color: priorityColors[task.priority],
					}}
				>
					{task.priority}
				</div>
			</div>

			{task.description && (
				<p className={styles.description}>
					{highlightText(task.description, searchTerm)}
				</p>
			)}

			<div className={styles.meta}>
				<div
					className={`${styles.deadline} ${
						deadline.isUrgent ? styles.urgent : ""
					} ${deadline.isPast ? styles.overdue : ""}`}
				>
					<Clock size={14} />
					<span>{deadline.text}</span>
				</div>

				{task.location && (
					<div className={styles.location}>
						<MapPin size={14} />
						<span>{task.location}</span>
					</div>
				)}
			</div>

			{/* Tags */}
			{task.tags && (
				<div className={styles.tags}>
					{task.tags.split(",").map((tag) => {
						const trimmed = tag.trim();
						return trimmed ? (
							<span key={trimmed} className={styles.tag}>
								{trimmed}
							</span>
						) : null;
					})}
				</div>
			)}

			<div className={styles.footer}>
				<div className={styles.status} style={{ color: status.color }}>
					<StatusIcon size={14} />
					<span>{status.label}</span>
				</div>

				{task.status === "PAUSED" && viewMode === "my-tasks" && onReassign && (
					<button
						className={styles.reassignButton}
						onClick={(e) => {
							e.stopPropagation();
							onReassign();
						}}
					>
						<UserX size={14} />
						Reassign
					</button>
				)}

				<div className={styles.person}>
					<User size={14} />
					<span>
						{viewMode === "my-tasks" ? (
							<>
								Verifier:{" "}
								<strong>
									{highlightText(task.verifier.fullName, searchTerm)}
								</strong>
							</>
						) : (
							<>
								From:{" "}
								<strong>
									{highlightText(task.creator.fullName, searchTerm)}
								</strong>
							</>
						)}
					</span>
					<OnlineStatusIndicator
						isOnline={isUserOnline(otherPerson.id)}
						size="sm"
					/>
				</div>
			</div>
		</div>
	);
}
