import { useState, useMemo } from "react";
import { ClipboardList, ChevronDown, Clock } from "lucide-react";
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
}: TaskListProps) {
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
	const [showOverdue, setShowOverdue] = useState(false);

	// Get the selected task from the tasks array (so it stays in sync with updates)
	// Returns null if task is no longer in the list (was deleted or filtered out)
	const selectedTask = useMemo(() => {
		if (selectedTaskId === null) return null;
		return tasks.find((t) => t.id === selectedTaskId) || null;
	}, [tasks, selectedTaskId]);

	// Separate active and overdue tasks
	const { activeTasks, overdueTasks } = useMemo(() => {
		const now = new Date();
		const active: Task[] = [];
		const overdue: Task[] = [];

		tasks.forEach((task) => {
			const deadline = new Date(task.deadline);
			// Only consider PENDING_PROOF or PENDING_VERIFICATION tasks as overdue
			// Completed, Missed, and Paused tasks go to their natural position
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

		return { activeTasks: active, overdueTasks: overdue };
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

			{/* Empty state when no active tasks but there are overdue */}
			{activeTasks.length === 0 && overdueTasks.length > 0 && (
				<div className={styles.noActiveTasks}>
					<p>
						No active tasks. You have {overdueTasks.length} overdue task
						{overdueTasks.length > 1 ? "s" : ""} below.
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
