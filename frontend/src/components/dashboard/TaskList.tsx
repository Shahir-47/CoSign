import { useState, useMemo, useEffect, useRef } from "react";
import { ClipboardList, ChevronDown, Clock, CheckCircle2 } from "lucide-react";
import type { Task } from "../../types";
import TaskCard from "./TaskCard";
import TaskDetailModal from "./TaskDetailModal";
import styles from "./TaskList.module.css";

interface TaskListProps {
	tasks: Task[];
	viewMode: "my-tasks" | "verification-requests";
	isLoading: boolean;
	error?: string;
	searchTerm?: string;
	onReassignTask?: (task: Task) => void;
	onSubmitProof?: (task: Task) => void;
	onReviewProof?: (task: Task) => void;
	onTaskUpdated?: (task: Task) => void;
	onTaskMoved?: (
		task: Task,
		newListId: number | null,
		newListName: string
	) => void;
	onRepeatPatternUpdated?: (task: Task) => void;
	selectedTaskId?: number | null;
	onSelectTask?: (taskId: number | null) => void;
	// Scroll to a specific task card after navigation
	scrollToTaskId?: number | null;
	onScrollComplete?: () => void;
	// Section visibility (controlled for URL persistence)
	showOverdue?: boolean;
	onShowOverdueChange?: (show: boolean) => void;
	showCompleted?: boolean;
	onShowCompletedChange?: (show: boolean) => void;
}

export default function TaskList({
	tasks,
	viewMode,
	isLoading,
	error,
	searchTerm,
	onReassignTask,
	onSubmitProof,
	onReviewProof,
	onTaskUpdated,
	onTaskMoved,
	onRepeatPatternUpdated,
	selectedTaskId: controlledSelectedTaskId,
	onSelectTask,
	scrollToTaskId,
	onScrollComplete,
	showOverdue: controlledShowOverdue,
	onShowOverdueChange,
	showCompleted: controlledShowCompleted,
	onShowCompletedChange,
}: TaskListProps) {
	// Use internal state if not controlled externally
	const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<
		number | null
	>(null);
	const [internalShowOverdue, setInternalShowOverdue] = useState(false);
	const [internalShowCompleted, setInternalShowCompleted] = useState(false);

	// Use controlled values if provided, otherwise use internal state
	const selectedTaskId =
		controlledSelectedTaskId !== undefined
			? controlledSelectedTaskId
			: internalSelectedTaskId;
	const setSelectedTaskId = onSelectTask || setInternalSelectedTaskId;

	const showOverdue =
		controlledShowOverdue !== undefined
			? controlledShowOverdue
			: internalShowOverdue;
	const setShowOverdue = onShowOverdueChange || setInternalShowOverdue;

	const showCompleted =
		controlledShowCompleted !== undefined
			? controlledShowCompleted
			: internalShowCompleted;
	const setShowCompleted = onShowCompletedChange || setInternalShowCompleted;

	// Get the selected task from the tasks array (so it stays in sync with updates)
	// Returns null if task is no longer in the list (was deleted or filtered out)
	const selectedTask = useMemo(() => {
		if (selectedTaskId === null) return null;
		return tasks.find((t) => t.id === selectedTaskId) || null;
	}, [tasks, selectedTaskId]);

	// Time trigger to re-evaluate overdue status every minute
	// This ensures tasks actively move to the overdue section when their deadline passes
	const [currentTime, setCurrentTime] = useState(Date.now());

	useEffect(() => {
		// Check every 30 seconds if any tasks have become overdue
		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, 30000); // 30 seconds

		return () => clearInterval(interval);
	}, []);

	// Separate active, completed, and overdue tasks
	// Re-evaluates when tasks change OR when currentTime updates (every 30s)
	const { activeTasks, completedTasks, overdueTasks } = useMemo(() => {
		const now = new Date();
		const active: Task[] = [];
		const completed: Task[] = [];
		const overdue: Task[] = [];

		tasks.forEach((task) => {
			const deadline = new Date(task.deadline);

			// Completed tasks go to their own section
			if (task.status === "COMPLETED") {
				completed.push(task);
				return;
			}

			// MISSED tasks always go to overdue section (no reassignment needed)
			if (task.status === "MISSED") {
				overdue.push(task);
				return;
			}

			// PENDING_PROOF or PENDING_VERIFICATION tasks that are past deadline go to overdue
			const isOverdue =
				deadline < now &&
				(task.status === "PENDING_PROOF" ||
					task.status === "PENDING_VERIFICATION");

			if (isOverdue) {
				overdue.push(task);
			} else {
				active.push(task);
			}
		});

		// Sort overdue by how overdue they are (most overdue first)
		overdue.sort(
			(a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
		);

		// Sort completed by completion date (most recent first) - using submittedAt as proxy
		completed.sort(
			(a, b) =>
				new Date(b.submittedAt || b.deadline).getTime() -
				new Date(a.submittedAt || a.deadline).getTime()
		);

		return {
			activeTasks: active,
			completedTasks: completed,
			overdueTasks: overdue,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tasks, currentTime]);

	// Auto-expand overdue section when tasks first become overdue
	const prevOverdueCountRef = useRef(overdueTasks.length);
	useEffect(() => {
		// If overdue count increased and section is collapsed, auto-expand it
		if (overdueTasks.length > prevOverdueCountRef.current && !showOverdue) {
			setShowOverdue(true);
		}
		prevOverdueCountRef.current = overdueTasks.length;
	}, [overdueTasks.length, showOverdue, setShowOverdue]);

	// Refs map for scrolling to specific task cards
	const taskRefs = useRef<Map<number, HTMLDivElement>>(new Map());

	// Scroll to task when scrollToTaskId is set and task is found
	useEffect(() => {
		if (scrollToTaskId === null || scrollToTaskId === undefined) return;

		// Small delay to ensure DOM has updated after navigation
		const timeoutId = setTimeout(() => {
			const taskElement = taskRefs.current.get(scrollToTaskId);
			if (taskElement) {
				taskElement.scrollIntoView({ behavior: "smooth", block: "center" });
				// Add a brief highlight effect
				taskElement.classList.add(styles.scrollHighlight);
				setTimeout(() => {
					taskElement.classList.remove(styles.scrollHighlight);
				}, 2000);
				// Notify parent that scroll is complete
				onScrollComplete?.();
			}
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [scrollToTaskId, tasks, onScrollComplete]);

	if (isLoading) {
		return (
			<div className={styles.loading}>
				<div className={styles.spinner} />
				<p>Loading tasks...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.error}>
				<p>{error}</p>
			</div>
		);
	}

	if (tasks.length === 0) {
		return (
			<div className={styles.empty}>
				<div className={styles.emptyIcon}>
					<ClipboardList size={48} />
				</div>
				<h3>
					{viewMode === "my-tasks"
						? "No tasks yet"
						: "No verification requests"}
				</h3>
				<p>
					{viewMode === "my-tasks"
						? "Create your first accountability contract and commit to your goals."
						: "When someone names you as their verifier, their tasks will appear here."}
				</p>
			</div>
		);
	}

	return (
		<>
			{/* Active Tasks */}
			{activeTasks.length > 0 && (
				<div className={styles.list}>
					{activeTasks.map((task) => (
						<div
							key={task.id}
							ref={(el) => {
								if (el) taskRefs.current.set(task.id, el);
								else taskRefs.current.delete(task.id);
							}}
						>
							<TaskCard
								task={task}
								viewMode={viewMode}
								searchTerm={searchTerm}
								onClick={() => setSelectedTaskId(task.id)}
								onReassign={
									onReassignTask ? () => onReassignTask(task) : undefined
								}
							/>
						</div>
					))}
				</div>
			)}

			{/* Empty state when no active tasks but there are overdue or completed */}
			{activeTasks.length === 0 &&
				(overdueTasks.length > 0 || completedTasks.length > 0) && (
					<div className={styles.noActiveTasks}>
						<p>
							No active tasks.
							{overdueTasks.length > 0 &&
								` You have ${overdueTasks.length} overdue task${
									overdueTasks.length > 1 ? "s" : ""
								}.`}
							{completedTasks.length > 0 &&
								` ${completedTasks.length} completed task${
									completedTasks.length > 1 ? "s" : ""
								} below.`}
						</p>
					</div>
				)}

			{/* Overdue Tasks Section */}
			{overdueTasks.length > 0 && (
				<div className={styles.overdueSection}>
					<button
						className={styles.overdueHeader}
						onClick={() => setShowOverdue(!showOverdue)}
					>
						<div className={styles.overdueTitle}>
							<Clock size={18} />
							<span>Overdue Tasks</span>
							<span className={styles.overdueCount}>{overdueTasks.length}</span>
						</div>
						<ChevronDown
							size={18}
							className={`${styles.chevron} ${
								showOverdue ? styles.expanded : ""
							}`}
						/>
					</button>

					{showOverdue && (
						<div className={styles.overdueList}>
							{overdueTasks.map((task) => (
								<div
									key={task.id}
									ref={(el) => {
										if (el) taskRefs.current.set(task.id, el);
										else taskRefs.current.delete(task.id);
									}}
								>
									<TaskCard
										task={task}
										viewMode={viewMode}
										searchTerm={searchTerm}
										onClick={() => setSelectedTaskId(task.id)}
										onReassign={
											onReassignTask ? () => onReassignTask(task) : undefined
										}
									/>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Completed Tasks Section */}
			{completedTasks.length > 0 && (
				<div className={styles.completedSection}>
					<button
						className={styles.completedHeader}
						onClick={() => setShowCompleted(!showCompleted)}
					>
						<div className={styles.completedTitle}>
							<CheckCircle2 size={18} />
							<span>Completed</span>
							<span className={styles.completedCount}>
								{completedTasks.length}
							</span>
						</div>
						<ChevronDown
							size={18}
							className={`${styles.chevron} ${styles.completedChevron} ${
								showCompleted ? styles.expanded : ""
							}`}
						/>
					</button>

					{showCompleted && (
						<div className={styles.completedList}>
							{completedTasks.map((task) => (
								<div
									key={task.id}
									ref={(el) => {
										if (el) taskRefs.current.set(task.id, el);
										else taskRefs.current.delete(task.id);
									}}
								>
									<TaskCard
										task={task}
										viewMode={viewMode}
										searchTerm={searchTerm}
										onClick={() => setSelectedTaskId(task.id)}
										onReassign={
											onReassignTask ? () => onReassignTask(task) : undefined
										}
									/>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<TaskDetailModal
				task={selectedTask}
				isOpen={selectedTask !== null}
				onClose={() => setSelectedTaskId(null)}
				viewMode={viewMode}
				onReassign={onReassignTask}
				onSubmitProof={onSubmitProof}
				onReviewProof={onReviewProof}
				onTaskUpdated={onTaskUpdated}
				onTaskMoved={onTaskMoved}
				onRepeatPatternUpdated={onRepeatPatternUpdated}
			/>
		</>
	);
}
