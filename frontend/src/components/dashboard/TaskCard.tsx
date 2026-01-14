import {
	Clock,
	MapPin,
	Star,
	AlertCircle,
	CheckCircle2,
	XCircle,
	User,
} from "lucide-react";
import type { Task } from "../../types";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
	task: Task;
	viewMode: "my-tasks" | "verification-requests";
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
};

function formatDeadline(deadline: string): {
	text: string;
	isUrgent: boolean;
	isPast: boolean;
} {
	const deadlineDate = new Date(deadline);
	const now = new Date();
	const diffMs = deadlineDate.getTime() - now.getTime();
	const diffHours = diffMs / (1000 * 60 * 60);
	const diffDays = diffMs / (1000 * 60 * 60 * 24);

	const isPast = diffMs < 0;

	if (isPast) {
		const absDays = Math.abs(Math.floor(diffDays));
		if (absDays === 0) {
			return { text: "Overdue today", isUrgent: false, isPast: true };
		}
		return {
			text: `${absDays} day${absDays > 1 ? "s" : ""} overdue`,
			isUrgent: false,
			isPast: true,
		};
	}

	if (diffHours < 1) {
		return { text: "Less than 1 hour left", isUrgent: true, isPast: false };
	}

	if (diffHours < 24) {
		const hours = Math.floor(diffHours);
		return {
			text: `${hours} hour${hours > 1 ? "s" : ""} left`,
			isUrgent: true,
			isPast: false,
		};
	}

	if (diffDays < 7) {
		const days = Math.floor(diffDays);
		return {
			text: `${days} day${days > 1 ? "s" : ""} left`,
			isUrgent: false,
			isPast: false,
		};
	}

	return {
		text: deadlineDate.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year:
				deadlineDate.getFullYear() !== now.getFullYear()
					? "numeric"
					: undefined,
		}),
		isUrgent: false,
		isPast: false,
	};
}

export default function TaskCard({ task, viewMode }: TaskCardProps) {
	const status = statusConfig[task.status];
	const StatusIcon = status.icon;
	const deadline = formatDeadline(task.deadline);

	return (
		<div className={`${styles.card} ${task.starred ? styles.starred : ""}`}>
			<div className={styles.header}>
				<div className={styles.titleRow}>
					{task.starred && (
						<Star size={16} className={styles.starIcon} fill="currentColor" />
					)}
					<h3 className={styles.title}>{task.title}</h3>
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
				<p className={styles.description}>{task.description}</p>
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

				{task.category && (
					<div
						className={styles.category}
						style={{
							backgroundColor: task.category.colorHex
								? `${task.category.colorHex}20`
								: undefined,
						}}
					>
						{task.category.name}
					</div>
				)}
			</div>

			<div className={styles.footer}>
				<div className={styles.status} style={{ color: status.color }}>
					<StatusIcon size={14} />
					<span>{status.label}</span>
				</div>

				<div className={styles.person}>
					<User size={14} />
					<span>
						{viewMode === "my-tasks" ? (
							<>
								Verifier: <strong>{task.verifier.fullName}</strong>
							</>
						) : (
							<>
								From: <strong>{task.creator.fullName}</strong>
							</>
						)}
					</span>
				</div>
			</div>
		</div>
	);
}
