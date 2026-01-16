import { useState, useEffect, useRef } from "react";
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
	Send,
	ClipboardCheck,
	RotateCcw,
	File,
	Image,
	Film,
	Music,
	Eye,
	Loader2,
	Paperclip,
} from "lucide-react";
import type { Task, TaskDetails, ProofAttachment } from "../../types";
import { api } from "../../utils/api";
import ViewAttachmentModal from "../shared/ViewAttachmentModal";
import { getUserTimezone, getTimeUntilDeadline } from "../../utils/timezone";
import { useWebSocket } from "../../context/useWebSocket";
import OnlineStatusIndicator from "../shared/OnlineStatusIndicator";
import styles from "./TaskDetailModal.module.css";

interface TaskDetailModalProps {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
	viewMode: "my-tasks" | "verification-requests";
	onReassign?: (task: Task) => void;
	onSubmitProof?: (task: Task) => void;
	onReviewProof?: (task: Task) => void;
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

// Helper to get appropriate file icon based on mime type
function getFileIcon(mimeType: string) {
	if (mimeType.startsWith("image/")) return Image;
	if (mimeType.startsWith("video/")) return Film;
	if (mimeType.startsWith("audio/")) return Music;
	if (mimeType.includes("pdf") || mimeType.includes("document"))
		return FileText;
	return File;
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

	const isPast = diffMs < 0;

	if (isPast) {
		if (totalDays > 0) {
			return {
				text: `${totalDays} day${totalDays > 1 ? "s" : ""} overdue`,
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
	if (totalDays > 0) {
		return {
			text: `${totalDays} day${totalDays > 1 ? "s" : ""} remaining`,
			isUrgent: false,
			isPast: false,
		};
	}

	if (totalHours > 0) {
		return {
			text: `${totalHours}h ${minutes}m remaining`,
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
	onSubmitProof,
	onReviewProof,
}: TaskDetailModalProps) {
	const [, setTick] = useState(0);
	const { isUserOnline, subscribe } = useWebSocket();

	// State for fetching proof details (attachments)
	const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null);
	const [fetchingTaskId, setFetchingTaskId] = useState<number | null>(null);
	const [viewingAttachment, setViewingAttachment] =
		useState<ProofAttachment | null>(null);

	// Track the last fetched task ID to avoid re-fetching
	const lastFetchedTaskIdRef = useRef<number | null>(null);

	// Determine if we should fetch proof details
	const shouldFetchProof =
		isOpen &&
		task &&
		(task.submittedAt ||
			task.status === "PENDING_VERIFICATION" ||
			task.status === "COMPLETED");
	const currentTaskId = task?.id ?? null;

	// Derive loading state from fetchingTaskId
	const isLoadingProof =
		fetchingTaskId !== null && fetchingTaskId === currentTaskId;

	// Fetch task details with proof attachments when modal opens
	useEffect(() => {
		// Reset ref when task changes
		if (currentTaskId !== lastFetchedTaskIdRef.current) {
			lastFetchedTaskIdRef.current = null;
		}

		if (!shouldFetchProof || !currentTaskId) {
			return;
		}

		// Skip if we already fetched for this task
		if (lastFetchedTaskIdRef.current === currentTaskId) {
			return;
		}

		let cancelled = false;
		lastFetchedTaskIdRef.current = currentTaskId;

		// Use queueMicrotask to set loading state outside synchronous effect body
		queueMicrotask(() => {
			if (!cancelled) {
				setFetchingTaskId(currentTaskId);
			}
		});

		api
			.get<TaskDetails>(`/tasks/${currentTaskId}`)
			.then((data) => {
				if (!cancelled) {
					setTaskDetails(data);
				}
			})
			.catch(() => {
				// Silently fail - we'll just not show proof details
			})
			.finally(() => {
				if (!cancelled) {
					setFetchingTaskId(null);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [shouldFetchProof, currentTaskId]);

	// Update every second for live countdown
	useEffect(() => {
		if (!isOpen) return;
		const interval = setInterval(() => {
			setTick((t) => t + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isOpen]);

	// Subscribe to user status changes to re-render when verifier/creator comes online/offline
	useEffect(() => {
		if (!isOpen || !task) return;

		const handleMessage = (message: { type: string }) => {
			if (message.type === "USER_STATUS") {
				// Force re-render to update online status indicator
				setTick((t) => t + 1);
			}
		};

		const unsubscribe = subscribe(handleMessage);
		return unsubscribe;
	}, [isOpen, task, subscribe]);

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

					{/* Submit Proof Button for PENDING_PROOF tasks (task creator) */}
					{(task.status === "PENDING_PROOF" || task.status === "MISSED") &&
						viewMode === "my-tasks" &&
						onSubmitProof && (
							<button
								className={styles.submitProofButton}
								onClick={() => {
									onSubmitProof(task);
									onClose();
								}}
							>
								<Send size={16} />
								Submit Proof
							</button>
						)}

					{/* Review Proof Button for PENDING_VERIFICATION tasks (verifier) */}
					{task.status === "PENDING_VERIFICATION" &&
						viewMode === "verification-requests" &&
						onReviewProof && (
							<button
								className={styles.reviewProofButton}
								onClick={() => {
									onReviewProof(task);
									onClose();
								}}
							>
								<ClipboardCheck size={16} />
								Review Proof
							</button>
						)}

					{/* Denial Reason Banner */}
					{task.denialReason && viewMode === "my-tasks" && (
						<div className={styles.denialBanner}>
							<XCircle size={18} />
							<div>
								<strong>Rejected by {task.verifier.fullName}</strong>
								<p>
									<span className={styles.reasonLabel}>Reason:</span>{" "}
									{task.denialReason}
								</p>
							</div>
						</div>
					)}

					{/* Approval Comment Banner */}
					{task.approvalComment && task.status === "COMPLETED" && (
						<div className={styles.approvalBanner}>
							<CheckCircle2 size={18} />
							<div>
								<strong>Approved by {task.verifier.fullName}</strong>
								<p>{task.approvalComment}</p>
							</div>
						</div>
					)}

					{/* Submitted Proof Section - shown to task creator */}
					{viewMode === "my-tasks" &&
						task.submittedAt &&
						(taskDetails?.proofDescription ||
							(taskDetails?.attachments &&
								taskDetails.attachments.length > 0)) && (
							<div className={styles.section}>
								<h3 className={styles.sectionTitle}>
									<Paperclip size={16} />
									Your Submitted Proof
								</h3>

								{isLoadingProof ? (
									<div className={styles.proofLoading}>
										<Loader2 size={18} className={styles.spinner} />
										<span>Loading proof...</span>
									</div>
								) : (
									<>
										{/* Proof Description */}
										{taskDetails?.proofDescription && (
											<div
												className={styles.proofDescription}
												dangerouslySetInnerHTML={{
													__html: taskDetails.proofDescription,
												}}
											/>
										)}

										{/* Proof Attachments */}
										{taskDetails?.attachments &&
											taskDetails.attachments.length > 0 && (
												<div className={styles.proofAttachments}>
													<span className={styles.attachmentsLabel}>
														Attachments ({taskDetails.attachments.length})
													</span>
													<div className={styles.attachmentsList}>
														{taskDetails.attachments.map(
															(attachment, index) => {
																const FileIcon = getFileIcon(
																	attachment.mimeType
																);
																const isImage =
																	attachment.mimeType.startsWith("image/");

																return (
																	<div
																		key={index}
																		className={styles.attachmentItem}
																	>
																		{isImage ? (
																			<button
																				type="button"
																				className={styles.attachmentPreview}
																				onClick={() =>
																					setViewingAttachment(attachment)
																				}
																			>
																				<img
																					src={attachment.url}
																					alt={attachment.filename}
																				/>
																				<div
																					className={styles.attachmentOverlay}
																				>
																					<Eye size={16} />
																				</div>
																			</button>
																		) : (
																			<button
																				type="button"
																				className={styles.attachmentPreview}
																				onClick={() =>
																					setViewingAttachment(attachment)
																				}
																			>
																				<FileIcon size={24} />
																			</button>
																		)}
																		<span className={styles.attachmentName}>
																			{attachment.filename}
																		</span>
																	</div>
																);
															}
														)}
													</div>
												</div>
											)}
									</>
								)}
							</div>
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
								<span className={styles.detailLabel}>
									{roleLabel}
									<OnlineStatusIndicator
										isOnline={isUserOnline(otherPerson.id)}
										size="sm"
										showLabel
									/>
								</span>
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

						{/* Timeline Events - sorted chronologically after Created */}
						{(() => {
							type TimelineEvent = {
								key: string;
								timestamp: string;
								label: string;
								icon: typeof Send;
								className?: string;
								displayTime: string;
							};

							const events: TimelineEvent[] = [];

							// Proof Submitted
							if (task.submittedAt) {
								events.push({
									key: "submitted",
									timestamp: task.submittedAt,
									label: "Proof Submitted",
									icon: Send,
									displayTime: formatDateTime(task.submittedAt),
								});
							}

							// Rejected
							if (task.rejectedAt) {
								events.push({
									key: "rejected",
									timestamp: task.rejectedAt,
									label: "Proof Rejected",
									icon: RotateCcw,
									className: styles.detailDanger,
									displayTime: formatDateTime(task.rejectedAt),
								});
							}

							// Completed
							if (task.completedAt) {
								events.push({
									key: "completed",
									timestamp: task.completedAt,
									label: "Completed",
									icon: CalendarCheck,
									className: styles.detailSuccess,
									displayTime: formatDateTime(task.completedAt),
								});
							}

							// Sort by timestamp chronologically (oldest first)
							events.sort(
								(a, b) =>
									new Date(a.timestamp).getTime() -
									new Date(b.timestamp).getTime()
							);

							return events.map((event) => {
								const Icon = event.icon;
								return (
									<div
										key={event.key}
										className={`${styles.detailItem} ${event.className || ""}`}
									>
										<div className={styles.detailIcon}>
											<Icon size={18} />
										</div>
										<div className={styles.detailContent}>
											<span className={styles.detailLabel}>{event.label}</span>
											<span className={styles.detailValue}>
												{event.displayTime}
											</span>
										</div>
									</div>
								);
							});
						})()}
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

			{/* Attachment Viewer Modal */}
			<ViewAttachmentModal
				attachment={viewingAttachment}
				isOpen={viewingAttachment !== null}
				onClose={() => setViewingAttachment(null)}
			/>
		</div>
	);
}
