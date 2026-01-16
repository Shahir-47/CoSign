import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import TaskListComponent from "../components/dashboard/TaskList";
import FilterBar from "../components/dashboard/FilterBar";
import CreateTaskModal from "../components/dashboard/CreateTaskModal";
import CreateListModal from "../components/dashboard/CreateListModal";
import ReassignVerifierModal from "../components/dashboard/ReassignVerifierModal";
import VerifiersModal from "../components/dashboard/VerifiersModal";
import SubmitProofModal from "../components/dashboard/SubmitProofModal";
import ReviewProofModal from "../components/dashboard/ReviewProofModal";
import SupervisingTab from "../components/dashboard/SupervisingTab";
import type { Task, TaskFilters, TaskList } from "../types";
import { api } from "../utils/api";
import { useWebSocket } from "../context/useWebSocket";
import type {
	SocketMessage,
	TaskUpdatedPayload,
	NewTaskAssignedPayload,
} from "../context/websocket.types";
import {
	parseURLState,
	updateURLState,
	pushModal,
	popModal,
	type ModalType,
} from "../utils/persistence";
import styles from "./HomePage.module.css";

type TabType = "my-tasks" | "verification-requests" | "supervising";

const defaultFilters: TaskFilters = {
	search: "",
	tags: [],
	priorities: [],
	statuses: [],
	starred: null,
	deadlineFrom: undefined,
	deadlineTo: undefined,
};

// Helper to get task ID from modal type like "proof-123"
function getTaskIdFromModal(stack: ModalType[], prefix: string): number | null {
	const modal = stack.find((m) => m.startsWith(`${prefix}-`));
	if (!modal) return null;
	const id = parseInt(modal.split("-")[1], 10);
	return isNaN(id) ? null : id;
}

export default function HomePage() {
	const navigate = useNavigate();
	const initializedRef = useRef(false);

	// Parse URL state on initial mount
	const initialState = useMemo(() => {
		if (initializedRef.current) return null;
		return parseURLState();
	}, []);

	const [activeTab, setActiveTab] = useState<TabType>(
		initialState?.tab || "my-tasks"
	);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();

	// Modal stack state - tracks which modals are open and in what order
	const [modalStack, setModalStack] = useState<ModalType[]>(
		initialState?.modalStack || []
	);

	const [selectedListId, setSelectedListId] = useState<number | null>(
		initialState?.list ?? null
	);
	const [selectedListName, setSelectedListName] = useState<string | null>(null);
	const [refreshListsKey, setRefreshListsKey] = useState(0);
	const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
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

	// Task objects for task-specific modals (resolved from IDs after fetch)
	const [submitProofTask, setSubmitProofTask] = useState<Task | null>(null);
	const [reviewProofTask, setReviewProofTask] = useState<Task | null>(null);
	const [reassignTask, setReassignTask] = useState<Task | null>(null);

	const { subscribe } = useWebSocket();

	// Derived modal states from stack
	const isModalOpen = modalStack.includes("create-task");
	const isListModalOpen = modalStack.includes("create-list");
	const isVerifiersModalOpen = modalStack.includes("verifiers");

	// Mark as initialized after first render
	useEffect(() => {
		initializedRef.current = true;
	}, []);

	// Sync URL when tab changes
	useEffect(() => {
		if (initializedRef.current) {
			updateURLState({ tab: activeTab }, true);
		}
	}, [activeTab]);

	// Sync URL when list changes
	useEffect(() => {
		if (initializedRef.current) {
			updateURLState({ list: selectedListId }, true);
		}
	}, [selectedListId]);

	// Check if user is authenticated
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) {
			navigate("/login");
		}
	}, [navigate]);

	const fetchTasks = useCallback(async () => {
		// Don't fetch tasks when on supervising tab
		if (activeTab === "supervising") {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(undefined);

		try {
			let endpoint = "/tasks";
			if (activeTab === "my-tasks") {
				endpoint = selectedListId
					? `/tasks?listId=${selectedListId}`
					: "/tasks";
			} else if (activeTab === "verification-requests") {
				endpoint = "/tasks/verification-requests";
			}
			const data = await api.get<Task[]>(endpoint);
			setTasks(data);

			// Resolve task IDs from modal stack to actual task objects
			const proofTaskId = getTaskIdFromModal(modalStack, "proof");
			const reviewTaskId = getTaskIdFromModal(modalStack, "review");
			const reassignTaskId = getTaskIdFromModal(modalStack, "reassign");

			if (proofTaskId) {
				const task = data.find((t) => t.id === proofTaskId);
				if (task) setSubmitProofTask(task);
			}
			if (reviewTaskId) {
				const task = data.find((t) => t.id === reviewTaskId);
				if (task) setReviewProofTask(task);
			}
			if (reassignTaskId) {
				const task = data.find((t) => t.id === reassignTaskId);
				if (task) setReassignTask(task);
			}
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, selectedListId, navigate]);

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	// Subscribe to real-time task updates via WebSocket
	useEffect(() => {
		const handleSocketMessage = (message: SocketMessage) => {
			if (message.type === "TASK_UPDATED") {
				const payload = message.payload as TaskUpdatedPayload;
				setTasks((prevTasks) =>
					prevTasks.map((task) =>
						task.id === payload.taskId
							? {
									...task,
									status: payload.status as Task["status"],
									denialReason: payload.denialReason,
									approvalComment: payload.approvalComment,
									verifiedAt: payload.verifiedAt,
									completedAt: payload.completedAt,
									rejectedAt: payload.rejectedAt,
									submittedAt: payload.submittedAt,
							  }
							: task
					)
				);

				// Show toast notification based on status
				if (payload.approved === true) {
					toast.success(`✅ ${payload.message}`, {
						icon: false,
					});
				} else if (payload.approved === false) {
					toast.warning(`❌ ${payload.message}`, {
						icon: false,
					});
				} else if (payload.status === "PENDING_VERIFICATION") {
					toast.info(`📋 ${payload.message}`, {
						icon: false,
					});
				}
			} else if (message.type === "NEW_TASK_ASSIGNED") {
				const payload = message.payload as NewTaskAssignedPayload;
				// If we're on verification-requests tab, refresh to get the new task
				if (activeTab === "verification-requests") {
					fetchTasks();
				}
				toast.info(
					`📥 New task: "${payload.title}" from ${payload.creatorName}`,
					{
						icon: false,
					}
				);
			}
		};

		const unsubscribe = subscribe(handleSocketMessage);
		return unsubscribe;
	}, [subscribe, activeTab, fetchTasks]);

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
	};

	// Modal stack management helpers
	const openModal = useCallback((modal: ModalType) => {
		setModalStack((prev) => {
			if (prev.includes(modal)) return prev;
			return [...prev, modal];
		});
		pushModal(modal);
	}, []);

	const closeModal = useCallback((modal: ModalType) => {
		setModalStack((prev) => prev.filter((m) => m !== modal));
		popModal();

		// Clear associated state
		if (modal === "create-task") {
			setNewlyCreatedListId(null);
			setNewlyAddedVerifierEmail(null);
			setRemovedVerifierEmail(null);
		} else if (modal.startsWith("proof-")) {
			setSubmitProofTask(null);
		} else if (modal.startsWith("review-")) {
			setReviewProofTask(null);
		} else if (modal.startsWith("reassign-")) {
			setReassignTask(null);
			setNewlyAddedVerifierEmail(null);
			setRemovedVerifierEmail(null);
		}
	}, []);

	const handleCreateTask = () => {
		openModal("create-task");
	};

	const handleCloseCreateTask = () => {
		closeModal("create-task");
	};

	const handleOpenCreateList = () => {
		openModal("create-list");
	};

	const handleCloseCreateList = () => {
		closeModal("create-list");
	};

	const handleOpenVerifiers = () => {
		openModal("verifiers");
	};

	const handleCloseVerifiers = () => {
		closeModal("verifiers");
	};

	const handleOpenSubmitProof = (task: Task) => {
		setSubmitProofTask(task);
		openModal(`proof-${task.id}` as ModalType);
	};

	const handleCloseSubmitProof = () => {
		if (submitProofTask) {
			closeModal(`proof-${submitProofTask.id}` as ModalType);
		}
	};

	const handleOpenReviewProof = (task: Task) => {
		setReviewProofTask(task);
		openModal(`review-${task.id}` as ModalType);
	};

	const handleCloseReviewProof = () => {
		if (reviewProofTask) {
			closeModal(`review-${reviewProofTask.id}` as ModalType);
		}
	};

	const handleOpenReassign = (task: Task) => {
		setReassignTask(task);
		openModal(`reassign-${task.id}` as ModalType);
	};

	const handleCloseReassign = () => {
		if (reassignTask) {
			closeModal(`reassign-${reassignTask.id}` as ModalType);
		}
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

	// Compute the title for My Tasks tab
	const myTasksTitle = selectedListName || "All Tasks";

	return (
		<DashboardLayout
			activeTab={activeTab}
			onTabChange={handleTabChange}
			onCreateTask={handleCreateTask}
			selectedListId={selectedListId}
			onSelectList={handleSelectList}
			onCreateList={handleOpenCreateList}
			refreshListsKey={refreshListsKey}
			onOpenVerifiersModal={handleOpenVerifiers}
			onSelectedListNameChange={setSelectedListName}
		>
			{activeTab === "supervising" ? (
				<SupervisingTab />
			) : (
				<div className={styles.container}>
					<div className={styles.header}>
						<div>
							<h1 className={styles.title}>
								{activeTab === "my-tasks"
									? myTasksTitle
									: "Verification Requests"}
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
									<span className={styles.statValue}>
										{filteredTasks.length}
									</span>
									<span className={styles.statLabel}>
										{filteredTasks.length !== tasks.length
											? "Filtered"
											: "Total"}
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
						viewMode={activeTab as "my-tasks" | "verification-requests"}
						isLoading={isLoading}
						error={error}
						searchTerm={filters.search}
						onReassignTask={handleOpenReassign}
						onSubmitProof={handleOpenSubmitProof}
						onReviewProof={handleOpenReviewProof}
					/>
				</div>
			)}

			<CreateTaskModal
				isOpen={isModalOpen}
				onClose={handleCloseCreateTask}
				onSuccess={handleTaskCreated}
				selectedListId={selectedListId}
				onOpenVerifiersModal={handleOpenVerifiers}
				onOpenCreateListModal={handleOpenCreateList}
				refreshVerifiersKey={refreshVerifiersKey}
				newlyCreatedListId={newlyCreatedListId}
				refreshListsKey={refreshListsKey}
				newlyAddedVerifierEmail={newlyAddedVerifierEmail}
				removedVerifierEmail={removedVerifierEmail}
			/>

			<CreateListModal
				isOpen={isListModalOpen}
				onClose={handleCloseCreateList}
				onSuccess={handleListCreated}
			/>

			<ReassignVerifierModal
				task={reassignTask}
				isOpen={reassignTask !== null}
				onClose={handleCloseReassign}
				onSuccess={() => {
					handleCloseReassign();
					fetchTasks();
				}}
				onOpenVerifiersModal={handleOpenVerifiers}
				refreshVerifiersKey={refreshVerifiersKey}
				newlyAddedVerifierEmail={newlyAddedVerifierEmail}
				removedVerifierEmail={removedVerifierEmail}
			/>

			<VerifiersModal
				isOpen={isVerifiersModalOpen}
				onClose={handleCloseVerifiers}
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
				onClose={handleCloseSubmitProof}
				onSuccess={() => {
					handleCloseSubmitProof();
					fetchTasks();
				}}
			/>

			<ReviewProofModal
				task={reviewProofTask}
				isOpen={reviewProofTask !== null}
				onClose={handleCloseReviewProof}
				onSuccess={() => {
					handleCloseReviewProof();
					fetchTasks();
				}}
			/>
		</DashboardLayout>
	);
}
