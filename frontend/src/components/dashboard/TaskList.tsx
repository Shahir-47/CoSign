import { useState, useMemo } from "react";
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
	selectedTaskId?: number | null;
	onSelectTask?: (taskId: number | null) => void;
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
	selectedTaskId: controlledSelectedTaskId,
	onSelectTask,
}: TaskListProps) {
	// Use internal state if not controlled externally
	const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<
		number | null
	>(null);
	const [showOverdue, setShowOverdue] = useState(false);
	const [showCompleted, setShowCompleted] = useState(false);

	// Use controlled value if provided, otherwise use internal state
	const selectedTaskId =
		controlledSelectedTaskId !== undefined
			? controlledSelectedTaskId
			: internalSelectedTaskId;
	const setSelectedTaskId = onSelectTask || setInternalSelectedTaskId;

	// Get the selected task from the tasks array (so it stays in sync with updates)
	// Returns null if task is no longer in the list (was deleted or filtered out)
	const selectedTask = useMemo(() => {
		if (selectedTaskId === null) return null;
		return tasks.find((t) => t.id === selectedTaskId) || null;
	}, [tasks, selectedTaskId]);

	// Separate active, completed, and overdue tasks
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

			// Only consider PENDING_PROOF or PENDING_VERIFICATION tasks as overdue
			// Missed and Paused tasks go to their natural position
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
	}, [tasks]);

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
						<TaskCard
							key={task.id}
							task={task}
							viewMode={viewMode}
							searchTerm={searchTerm}
							onClick={() => setSelectedTaskId(task.id)}
							onReassign={
								onReassignTask ? () => onReassignTask(task) : undefined
							}
						/>
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
								<TaskCard
									key={task.id}
									task={task}
									viewMode={viewMode}
									searchTerm={searchTerm}
									onClick={() => setSelectedTaskId(task.id)}
									onReassign={
										onReassignTask ? () => onReassignTask(task) : undefined
									}
								/>
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
								<TaskCard
									key={task.id}
									task={task}
									viewMode={viewMode}
									searchTerm={searchTerm}
									onClick={() => setSelectedTaskId(task.id)}
									onReassign={
										onReassignTask ? () => onReassignTask(task) : undefined
									}
								/>
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
			/>
		</>
	);
}
