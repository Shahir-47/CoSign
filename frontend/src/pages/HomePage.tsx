import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import TaskListComponent from "../components/dashboard/TaskList";
import FilterBar from "../components/dashboard/FilterBar";
import CreateTaskModal from "../components/dashboard/CreateTaskModal";
import CreateListModal from "../components/dashboard/CreateListModal";
import ReassignVerifierModal from "../components/dashboard/ReassignVerifierModal";
import VerifiersModal from "../components/dashboard/VerifiersModal";
import SubmitProofModal from "../components/dashboard/SubmitProofModal";
import ReviewProofModal from "../components/dashboard/ReviewProofModal";
import type { Task, TaskFilters, TaskList } from "../types";
import { api } from "../utils/api";
import styles from "./HomePage.module.css";

type TabType = "my-tasks" | "verification-requests";

const defaultFilters: TaskFilters = {
	search: "",
	tags: [],
	priorities: [],
	statuses: [],
	starred: null,
	deadlineFrom: undefined,
	deadlineTo: undefined,
};

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
	const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
	const [reassignTask, setReassignTask] = useState<Task | null>(null);
	const [isVerifiersModalOpen, setIsVerifiersModalOpen] = useState(false);
	const [refreshVerifiersKey, setRefreshVerifiersKey] = useState(0);
	const [newlyCreatedListId, setNewlyCreatedListId] = useState<number | null>(
		null
	);
	const [newlyAddedVerifierEmail, setNewlyAddedVerifierEmail] = useState<
		string | null
	>(null);
	const [removedVerifierEmail, setRemovedVerifierEmail] = useState<
		string | null
	>(null);
	const [submitProofTask, setSubmitProofTask] = useState<Task | null>(null);
	const [reviewProofTask, setReviewProofTask] = useState<Task | null>(null);

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

	const handleListCreated = (list: TaskList) => {
		setRefreshListsKey((k) => k + 1);
		setNewlyCreatedListId(list.id);
	};

	const handleSelectList = (listId: number | null) => {
		setSelectedListId(listId);
	};

	// Filter tasks based on current filters
	const filteredTasks = useMemo(() => {
		return tasks.filter((task) => {
			// Search filter - check title and description
			if (filters.search) {
				const search = filters.search.toLowerCase();
				const matchesTitle = task.title.toLowerCase().includes(search);
				const matchesDescription = task.description
					?.toLowerCase()
					.includes(search);
				const matchesVerifier = task.verifier.fullName
					.toLowerCase()
					.includes(search);
				const matchesCreator = task.creator.fullName
					.toLowerCase()
					.includes(search);
				if (
					!matchesTitle &&
					!matchesDescription &&
					!matchesVerifier &&
					!matchesCreator
				) {
					return false;
				}
			}

			// Tags filter
			if (filters.tags.length > 0) {
				const taskTags =
					task.tags?.split(",").map((t) => t.trim().toLowerCase()) || [];
				const hasMatchingTag = filters.tags.some((filterTag) => {
					const lowerTag = filterTag.toLowerCase();
					return taskTags.includes(lowerTag);
				});
				if (!hasMatchingTag) return false;
			}

			// Priority filter
			if (
				filters.priorities.length > 0 &&
				!filters.priorities.includes(task.priority)
			) {
				return false;
			}

			// Status filter
			if (
				filters.statuses.length > 0 &&
				!filters.statuses.includes(task.status)
			) {
				return false;
			}

			// Starred filter
			if (filters.starred === true && !task.starred) {
				return false;
			}

			// Date range filter
			if (filters.deadlineFrom || filters.deadlineTo) {
				const taskDeadline = new Date(task.deadline);
				if (filters.deadlineFrom) {
					const from = new Date(filters.deadlineFrom);
					from.setHours(0, 0, 0, 0);
					if (taskDeadline < from) return false;
				}
				if (filters.deadlineTo) {
					const to = new Date(filters.deadlineTo);
					to.setHours(23, 59, 59, 999);
					if (taskDeadline > to) return false;
				}
			}

			return true;
		});
	}, [tasks, filters]);

	// Calculate stats from filtered tasks
	const pendingProofCount = filteredTasks.filter(
		(t) => t.status === "PENDING_PROOF"
	).length;
	const pendingVerificationCount = filteredTasks.filter(
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
			onOpenVerifiersModal={() => setIsVerifiersModalOpen(true)}
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
								<span className={styles.statValue}>{filteredTasks.length}</span>
								<span className={styles.statLabel}>
									{filteredTasks.length !== tasks.length ? "Filtered" : "Total"}
								</span>
							</div>
						</div>
					)}
				</div>

				{!isLoading && tasks.length > 0 && (
					<FilterBar
						tasks={tasks}
						filters={filters}
						onFiltersChange={setFilters}
					/>
				)}

				<TaskListComponent
					tasks={filteredTasks}
					viewMode={activeTab}
					isLoading={isLoading}
					error={error}
					searchTerm={filters.search}
					onReassignTask={(task) => setReassignTask(task)}
					onSubmitProof={(task) => setSubmitProofTask(task)}
					onReviewProof={(task) => setReviewProofTask(task)}
				/>
			</div>

			<CreateTaskModal
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					setNewlyCreatedListId(null);
					setNewlyAddedVerifierEmail(null);
					setRemovedVerifierEmail(null);
				}}
				onSuccess={handleTaskCreated}
				selectedListId={selectedListId}
				onOpenVerifiersModal={() => setIsVerifiersModalOpen(true)}
				onOpenCreateListModal={() => setIsListModalOpen(true)}
				refreshVerifiersKey={refreshVerifiersKey}
				newlyCreatedListId={newlyCreatedListId}
				refreshListsKey={refreshListsKey}
				newlyAddedVerifierEmail={newlyAddedVerifierEmail}
				removedVerifierEmail={removedVerifierEmail}
			/>

			<CreateListModal
				isOpen={isListModalOpen}
				onClose={() => setIsListModalOpen(false)}
				onSuccess={handleListCreated}
			/>

			<ReassignVerifierModal
				task={reassignTask}
				isOpen={reassignTask !== null}
				onClose={() => {
					setReassignTask(null);
					setNewlyAddedVerifierEmail(null);
					setRemovedVerifierEmail(null);
				}}
				onSuccess={() => {
					setReassignTask(null);
					fetchTasks();
				}}
				onOpenVerifiersModal={() => setIsVerifiersModalOpen(true)}
				refreshVerifiersKey={refreshVerifiersKey}
				newlyAddedVerifierEmail={newlyAddedVerifierEmail}
				removedVerifierEmail={removedVerifierEmail}
			/>

			<VerifiersModal
				isOpen={isVerifiersModalOpen}
				onClose={() => setIsVerifiersModalOpen(false)}
				onVerifierAdded={(verifier) => {
					setRefreshVerifiersKey((k) => k + 1);
					setNewlyAddedVerifierEmail(verifier.email);
					setRemovedVerifierEmail(null);
				}}
				onVerifierRemoved={(_id, email) => {
					setRefreshVerifiersKey((k) => k + 1);
					setRemovedVerifierEmail(email);
					setNewlyAddedVerifierEmail(null);
					fetchTasks(); // Refresh tasks when verifier is removed
				}}
			/>

			<SubmitProofModal
				task={submitProofTask}
				isOpen={submitProofTask !== null}
				onClose={() => setSubmitProofTask(null)}
				onSuccess={() => {
					setSubmitProofTask(null);
					fetchTasks();
				}}
			/>

			<ReviewProofModal
				task={reviewProofTask}
				isOpen={reviewProofTask !== null}
				onClose={() => setReviewProofTask(null)}
				onSuccess={() => {
					setReviewProofTask(null);
					fetchTasks();
				}}
			/>
		</DashboardLayout>
	);
}
