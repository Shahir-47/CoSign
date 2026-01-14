import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import TaskList from "../components/dashboard/TaskList";
import CreateTaskModal from "../components/dashboard/CreateTaskModal";
import CreateListModal from "../components/dashboard/CreateListModal";
import type { Task } from "../types";
import { api } from "../utils/api";
import styles from "./HomePage.module.css";

type TabType = "my-tasks" | "verification-requests";

export default function HomePage() {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<TabType>("my-tasks");
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [selectedListId, setSelectedListId] = useState<number | null>(null);
	const [refreshListsKey, setRefreshListsKey] = useState(0);

	// Check if user is authenticated
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) {
			navigate("/login");
		}
	}, [navigate]);

	const fetchTasks = useCallback(async () => {
		setIsLoading(true);
		setError(undefined);

		try {
			let endpoint = "/tasks";
			if (activeTab === "my-tasks") {
				endpoint = selectedListId
					? `/tasks?listId=${selectedListId}`
					: "/tasks";
			} else {
				endpoint = "/tasks/verification-requests";
			}
			const data = await api.get<Task[]>(endpoint);
			setTasks(data);
		} catch (err) {
			if (err instanceof Error && err.message.includes("401")) {
				// Token expired, redirect to login
				localStorage.removeItem("token");
				localStorage.removeItem("user");
				navigate("/login");
				return;
			}
			setError(err instanceof Error ? err.message : "Failed to load tasks");
		} finally {
			setIsLoading(false);
		}
	}, [activeTab, selectedListId, navigate]);

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
	};

	const handleCreateTask = () => {
		setIsModalOpen(true);
	};

	const handleTaskCreated = () => {
		fetchTasks();
		setRefreshListsKey((k) => k + 1);
	};

	const handleListCreated = () => {
		setRefreshListsKey((k) => k + 1);
	};

	const handleSelectList = (listId: number | null) => {
		setSelectedListId(listId);
	};

	// Calculate stats
	const pendingProofCount = tasks.filter(
		(t) => t.status === "PENDING_PROOF"
	).length;
	const pendingVerificationCount = tasks.filter(
		(t) => t.status === "PENDING_VERIFICATION"
	).length;

	return (
		<DashboardLayout
			activeTab={activeTab}
			onTabChange={handleTabChange}
			onCreateTask={handleCreateTask}
			selectedListId={selectedListId}
			onSelectList={handleSelectList}
			onCreateList={() => setIsListModalOpen(true)}
			refreshListsKey={refreshListsKey}
		>
			<div className={styles.container}>
				<div className={styles.header}>
					<div>
						<h1 className={styles.title}>
							{activeTab === "my-tasks" ? "My Tasks" : "Verification Requests"}
						</h1>
						<p className={styles.subtitle}>
							{activeTab === "my-tasks"
								? "Tasks you committed to completing with a trusted verifier."
								: "Tasks others need you to verify upon completion."}
						</p>
					</div>

					{!isLoading && tasks.length > 0 && (
						<div className={styles.stats}>
							{activeTab === "my-tasks" && (
								<>
									<div className={styles.stat}>
										<span className={styles.statValue}>
											{pendingProofCount}
										</span>
										<span className={styles.statLabel}>Pending Proof</span>
									</div>
									<div className={styles.stat}>
										<span className={styles.statValue}>
											{pendingVerificationCount}
										</span>
										<span className={styles.statLabel}>
											Awaiting Verification
										</span>
									</div>
								</>
							)}
							<div className={styles.stat}>
								<span className={styles.statValue}>{tasks.length}</span>
								<span className={styles.statLabel}>Total</span>
							</div>
						</div>
					)}
				</div>

				<TaskList
					tasks={tasks}
					viewMode={activeTab}
					isLoading={isLoading}
					error={error}
				/>
			</div>

			<CreateTaskModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={handleTaskCreated}
				selectedListId={selectedListId}
			/>

			<CreateListModal
				isOpen={isListModalOpen}
				onClose={() => setIsListModalOpen(false)}
				onSuccess={handleListCreated}
			/>
		</DashboardLayout>
	);
}
