import { useState, useEffect } from "react";
import {
	X,
	Clock,
	Calendar,
	MapPin,
	Star,
	AlertCircle,
	CheckCircle2,
	XCircle,
	User,
	Tag,
	List,
	Flag,
	FileText,
	Link,
	Repeat,
	CalendarPlus,
	CalendarCheck,
	Inbox,
	FolderKanban,
	Briefcase,
	Rocket,
	Home,
	Heart,
	Dumbbell,
	BookOpen,
	Pause,
	UserX,
} from "lucide-react";
import type { Task } from "../../types";
import { getUserTimezone, getTimeUntilDeadline } from "../../utils/timezone";
import styles from "./TaskDetailModal.module.css";

interface TaskDetailModalProps {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
	viewMode: "my-tasks" | "verification-requests";
	onReassign?: (task: Task) => void;
}

const LIST_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
	inbox: Inbox,
	folder: FolderKanban,
	briefcase: Briefcase,
	rocket: Rocket,
	home: Home,
	heart: Heart,
	dumbbell: Dumbbell,
	book: BookOpen,
	list: List,
};

function getListIconComponent(iconName?: string) {
	if (!iconName) return List;
	return LIST_ICON_MAP[iconName.toLowerCase()] || List;
}

const priorityConfig: Record<
	string,
	{ label: string; color: string; bgColor: string }
> = {
	LOW: { label: "Low", color: "#10b981", bgColor: "rgba(16, 185, 129, 0.15)" },
	MEDIUM: {
		label: "Medium",
		color: "#f59e0b",
		bgColor: "rgba(245, 158, 11, 0.15)",
	},
	HIGH: {
		label: "High",
		color: "#f97316",
		bgColor: "rgba(249, 115, 22, 0.15)",
	},
	CRITICAL: {
		label: "Critical",
		color: "#ef4444",
		bgColor: "rgba(239, 68, 68, 0.15)",
	},
};

const statusConfig: Record<
	string,
	{ label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
	PENDING_PROOF: {
		label: "Pending Proof",
		icon: Clock,
		color: "#f59e0b",
		bgColor: "rgba(245, 158, 11, 0.15)",
	},
	PENDING_VERIFICATION: {
		label: "Awaiting Verification",
		icon: AlertCircle,
		color: "#6366f1",
		bgColor: "rgba(99, 102, 241, 0.15)",
	},
	COMPLETED: {
		label: "Completed",
		icon: CheckCircle2,
		color: "#10b981",
		bgColor: "rgba(16, 185, 129, 0.15)",
	},
	MISSED: {
		label: "Missed",
		icon: XCircle,
		color: "#ef4444",
		bgColor: "rgba(239, 68, 68, 0.15)",
	},
	PAUSED: {
		label: "Paused - Needs Verifier",
		icon: Pause,
		color: "#f97316",
		bgColor: "rgba(249, 115, 22, 0.15)",
	},
};

function formatDateTime(dateString: string): string {
	const userTimezone = getUserTimezone();
	const date = new Date(dateString);

	return date.toLocaleString("en-US", {
		timeZone: userTimezone,
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

function formatTimeRemaining(deadline: string): {
	text: string;
	isUrgent: boolean;
	isPast: boolean;
} {
	const diffMs = getTimeUntilDeadline(deadline);
	const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
	const totalMinutes = Math.floor(totalSeconds / 60);
	const totalHours = Math.floor(totalMinutes / 60);
	const totalDays = Math.floor(totalHours / 24);

	const seconds = totalSeconds % 60;
	const minutes = totalMinutes % 60;
	const hours = totalHours % 24;

	const isPast = diffMs < 0;

	if (isPast) {
		if (totalDays > 0) {
			return {
				text: `${totalDays} day${
					totalDays > 1 ? "s" : ""
				} ${hours}h ${minutes}m overdue`,
				isUrgent: false,
				isPast: true,
			};
		}
		if (totalHours > 0) {
			return {
				text: `${totalHours}h ${minutes}m ${seconds}s overdue`,
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
	if (totalDays > 0) {
		return {
			text: `${totalDays} day${
				totalDays > 1 ? "s" : ""
			} ${hours}h ${minutes}m remaining`,
			isUrgent: false,
			isPast: false,
		};
	}

	if (totalHours > 0) {
		return {
			text: `${totalHours}h ${minutes}m ${seconds}s remaining`,
			isUrgent: true,
			isPast: false,
		};
	}

	// Less than an hour - show minutes and seconds
	return {
		text: `${totalMinutes}m ${seconds}s remaining`,
		isUrgent: true,
		isPast: false,
	};
}

export default function TaskDetailModal({
	task,
	isOpen,
	onClose,
	viewMode,
	onReassign,
}: TaskDetailModalProps) {
	const [, setTick] = useState(0);

	// Update every second for live countdown
	useEffect(() => {
		if (!isOpen) return;
		const interval = setInterval(() => {
			setTick((t) => t + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isOpen]);

	if (!isOpen || !task) return null;

	const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
	const status = statusConfig[task.status] || statusConfig.PENDING_PROOF;
	const StatusIcon = status.icon;
	const timeRemaining = formatTimeRemaining(task.deadline);
	const tags = task.tags?.split(",").filter((t) => t.trim()) || [];
	const userTimezone = getUserTimezone();

	const otherPerson = viewMode === "my-tasks" ? task.verifier : task.creator;
	const roleLabel = viewMode === "my-tasks" ? "Verifier" : "Created by";

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className={styles.header}>
					<div className={styles.headerContent}>
						<div className={styles.titleRow}>
							{task.starred && (
								<Star
									size={20}
									className={styles.star}
									fill="#f59e0b"
									color="#f59e0b"
								/>
							)}
							<h2 className={styles.title}>{task.title}</h2>
						</div>
						<div
							className={styles.statusBadge}
							style={{
								color: status.color,
								backgroundColor: status.bgColor,
							}}
						>
							<StatusIcon size={14} />
							{status.label}
						</div>
					</div>
					<button className={styles.closeButton} onClick={onClose}>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className={styles.content}>
					{/* Time Remaining Banner */}
					<div
						className={`${styles.timeBanner} ${
							timeRemaining.isPast
								? styles.overdue
								: timeRemaining.isUrgent
								? styles.urgent
								: ""
						}`}
					>
						<Clock size={18} />
						<span>{timeRemaining.text}</span>
					</div>

					{/* Reassign Button for PAUSED tasks */}
					{task.status === "PAUSED" &&
						viewMode === "my-tasks" &&
						onReassign && (
							<button
								className={styles.reassignButton}
								onClick={() => {
									onReassign(task);
									onClose();
								}}
							>
								<UserX size={16} />
								Reassign Verifier
							</button>
						)}

					{/* Description */}
					{task.description && (
						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>
								<FileText size={16} />
								Description
							</h3>
							<p className={styles.description}>{task.description}</p>
						</div>
					)}

					{/* Details Grid */}
					<div className={styles.detailsGrid}>
						{/* Deadline */}
						<div className={styles.detailItem}>
							<div className={styles.detailIcon}>
								<Calendar size={18} />
							</div>
							<div className={styles.detailContent}>
								<span className={styles.detailLabel}>Deadline</span>
								<span className={styles.detailValue}>
									{formatDateTime(task.deadline)}
								</span>
							</div>
						</div>

						{/* Priority */}
						<div className={styles.detailItem}>
							<div className={styles.detailIcon}>
								<Flag size={18} />
							</div>
							<div className={styles.detailContent}>
								<span className={styles.detailLabel}>Priority</span>
								<span
									className={styles.priorityBadge}
									style={{
										color: priority.color,
										backgroundColor: priority.bgColor,
									}}
								>
									{priority.label}
								</span>
							</div>
						</div>

						{/* Verifier / Creator */}
						<div className={styles.detailItem}>
							<div className={styles.detailIcon}>
								<User size={18} />
							</div>
							<div className={styles.detailContent}>
								<span className={styles.detailLabel}>{roleLabel}</span>
								<span className={styles.detailValue}>
									{otherPerson.fullName}
									<span className={styles.email}>{otherPerson.email}</span>
								</span>
							</div>
						</div>

						{/* Location */}
						{task.location && (
							<div className={styles.detailItem}>
								<div className={styles.detailIcon}>
									<MapPin size={18} />
								</div>
								<div className={styles.detailContent}>
									<span className={styles.detailLabel}>Location</span>
									<span className={styles.detailValue}>{task.location}</span>
								</div>
							</div>
						)}

						{/* List */}
						{task.list &&
							(() => {
								const ListIconComponent = getListIconComponent(task.list.icon);
								return (
									<div className={styles.detailItem}>
										<div className={styles.detailIcon}>
											<ListIconComponent size={18} />
										</div>
										<div className={styles.detailContent}>
											<span className={styles.detailLabel}>List</span>
											<span className={styles.detailValue}>
												{task.list.name}
											</span>
										</div>
									</div>
								);
							})()}

						{/* Repeat Pattern */}
						{task.repeatPattern && (
							<div className={styles.detailItem}>
								<div className={styles.detailIcon}>
									<Repeat size={18} />
								</div>
								<div className={styles.detailContent}>
									<span className={styles.detailLabel}>Repeats</span>
									<span className={styles.detailValue}>
										{task.repeatPattern.charAt(0) +
											task.repeatPattern.slice(1).toLowerCase()}
									</span>
								</div>
							</div>
						)}

						{/* Created At */}
						<div className={styles.detailItem}>
							<div className={styles.detailIcon}>
								<CalendarPlus size={18} />
							</div>
							<div className={styles.detailContent}>
								<span className={styles.detailLabel}>Created</span>
								<span className={styles.detailValue}>
									{formatDateTime(task.createdAt)}
								</span>
							</div>
						</div>

						{/* Completed At */}
						{task.completedAt && (
							<div className={styles.detailItem}>
								<div className={styles.detailIcon}>
									<CalendarCheck size={18} />
								</div>
								<div className={styles.detailContent}>
									<span className={styles.detailLabel}>Completed</span>
									<span className={styles.detailValue}>
										{formatDateTime(task.completedAt)}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Tags */}
					{tags.length > 0 && (
						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>
								<Tag size={16} />
								Tags
							</h3>
							<div className={styles.tags}>
								{tags.map((tag, index) => (
									<span key={index} className={styles.tag}>
										{tag.trim()}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Proof URL */}
					{task.proofUrl && (
						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>
								<Link size={16} />
								Proof
							</h3>
							<a
								href={task.proofUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.proofLink}
							>
								View Proof
							</a>
						</div>
					)}

					{/* Timezone Info */}
					<div className={styles.timezoneInfo}>
						All times shown in {userTimezone.replace(/_/g, " ")}
					</div>
				</div>
			</div>
		</div>
	);
}
