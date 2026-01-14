import { useState } from "react";
import { ClipboardList } from "lucide-react";
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
}

export default function TaskList({
	tasks,
	viewMode,
	isLoading,
	error,
	searchTerm,
	onReassignTask,
}: TaskListProps) {
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
			<div className={styles.list}>
				{tasks.map((task) => (
					<TaskCard
						key={task.id}
						task={task}
						viewMode={viewMode}
						searchTerm={searchTerm}
						onClick={() => setSelectedTask(task)}
						onReassign={onReassignTask ? () => onReassignTask(task) : undefined}
					/>
				))}
			</div>

			<TaskDetailModal
				task={selectedTask}
				isOpen={selectedTask !== null}
				onClose={() => setSelectedTask(null)}
				viewMode={viewMode}
				onReassign={onReassignTask}
			/>
		</>
	);
}
