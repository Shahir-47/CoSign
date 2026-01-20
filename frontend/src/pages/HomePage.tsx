import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast, type ToastOptions } from "react-toastify";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import TaskListComponent from "../components/dashboard/TaskList";
import FilterBar from "../components/dashboard/FilterBar";
import SortBar from "../components/dashboard/SortBar";
import CreateTaskModal from "../components/dashboard/CreateTaskModal";
import CreateListModal from "../components/dashboard/CreateListModal";
import ReassignVerifierModal from "../components/dashboard/ReassignVerifierModal";
import VerifiersModal from "../components/dashboard/VerifiersModal";
import SubmitProofModal from "../components/dashboard/SubmitProofModal";
import ReviewProofModal from "../components/dashboard/ReviewProofModal";
import SupervisingTab from "../components/dashboard/SupervisingTab";
import type { Task, TaskFilters, TaskList, TaskSortConfig } from "../types";
import { api } from "../utils/api";
import { getSortComparator } from "../utils/sortTasks";
import { useWebSocket } from "../context/useWebSocket";
import { useAuth } from "../context/useAuth";
import type {
	SocketMessage,
	TaskUpdatedPayload,
	NewTaskAssignedPayload,
	VerifierAddedPayload,
	VerifierRemovedPayload,
	TaskMissedPayload,
	PenaltyUnlockedPayload,
} from "../context/websocket.types";
import {
	parseURLState,
	updateURLState,
	pushModal,
	popModal,
	type ModalType,
} from "../utils/persistence";
import { getLocalDateTimeValue } from "../utils/timezone";
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

// Default sort: deadline first (ascending), then priority (descending), starred as tiebreaker
const defaultSortConfig: TaskSortConfig = {
	primary: { field: "deadline", direction: "asc" },
	secondary: { field: "priority", direction: "desc" },
	tiebreaker: "starred",
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
	const { user } = useAuth();
	const currentUserEmail = user?.email ?? null;

	// Parse URL state on initial mount
	const initialState = useMemo(() => {
		if (initializedRef.current) return null;
		return parseURLState();
	}, []);

	const [activeTab, setActiveTab] = useState<TabType>(
		initialState?.tab || "my-tasks",
	);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();

	// Modal stack state - tracks which modals are open and in what order
	const [modalStack, setModalStack] = useState<ModalType[]>(
		initialState?.modalStack || [],
	);

	const [selectedListId, setSelectedListId] = useState<number | null>(
		initialState?.list ?? null,
	);
	const [selectedListName, setSelectedListName] = useState<string | null>(null);
	const [refreshListsKey, setRefreshListsKey] = useState(0);

	// Task ID to scroll to after navigation (e.g., after moving a task to a new list)
	const [scrollToTaskId, setScrollToTaskId] = useState<number | null>(null);

	// User ID to highlight in SupervisingTab (e.g., when someone adds you as verifier)
	const [highlightSuperviseeId, setHighlightSuperviseeId] = useState<
		number | null
	>(null);

	// Initialize filters from URL or use defaults
	const [filters, setFilters] = useState<TaskFilters>(() => ({
		...defaultFilters,
		...initialState?.filters,
	}));

	const [refreshVerifiersKey, setRefreshVerifiersKey] = useState(0);
	const [newlyCreatedListId, setNewlyCreatedListId] = useState<number | null>(
		null,
	);
	const [newlyAddedVerifierEmail, setNewlyAddedVerifierEmail] = useState<
		string | null
	>(null);
	const [removedVerifierEmail, setRemovedVerifierEmail] = useState<
		string | null
	>(null);

	// Initialize sort config from URL or use defaults
	const [sortConfig, setSortConfig] = useState<TaskSortConfig>(
		initialState?.sortConfig || defaultSortConfig,
	);

	// Section visibility state (lifted from TaskList for URL persistence)
	const [showOverdue, setShowOverdue] = useState(
		initialState?.showOverdue ?? false,
	);
	const [showCompleted, setShowCompleted] = useState(
		initialState?.showCompleted ?? false,
	);

	// Selected task ID for task detail modal (lifted from TaskList for toast navigation)
	// Check URL for task-{id} modal
	const getInitialSelectedTaskId = (): number | null => {
		const taskModal = initialState?.modalStack.find((m) =>
			m.startsWith("task-"),
		);
		if (taskModal) {
			const id = parseInt(taskModal.split("-")[1], 10);
			return isNaN(id) ? null : id;
		}
		return null;
	};
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(
		getInitialSelectedTaskId,
	);

	// Task objects for task-specific modals (resolved from IDs after fetch)
	const [submitProofTask, setSubmitProofTask] = useState<Task | null>(null);
	const [reviewProofTask, setReviewProofTask] = useState<Task | null>(null);
	const [reassignTask, setReassignTask] = useState<Task | null>(null);

	const { subscribe } = useWebSocket();

	// Derived modal states from stack
	const isModalOpen = modalStack.includes("create-task");
	const isListModalOpen = modalStack.includes("create-list");
	const isVerifiersModalOpen = modalStack.includes("verifiers");
	const isRepeatModalOpen = modalStack.includes("repeat");
	const isProfileModalOpen = modalStack.includes("profile");

	// Mark as initialized after first render
	useEffect(() => {
		initializedRef.current = true;
	}, []);

	// Handle browser back/forward navigation (popstate event)
	useEffect(() => {
		const handlePopState = () => {
			const urlState = parseURLState();

			// Sync modal stack from URL
			setModalStack(urlState.modalStack);

			// Sync tab
			if (urlState.tab) {
				setActiveTab(urlState.tab);
			}

			// Sync selected list
			if (urlState.list !== undefined) {
				setSelectedListId(urlState.list);
			}

			// Sync filters
			if (urlState.filters) {
				setFilters((prev) => ({ ...prev, ...urlState.filters }));
			}

			// Sync sort config
			if (urlState.sortConfig) {
				setSortConfig(urlState.sortConfig);
			}

			// Sync section visibility
			if (urlState.showOverdue !== undefined) {
				setShowOverdue(urlState.showOverdue);
			}
			if (urlState.showCompleted !== undefined) {
				setShowCompleted(urlState.showCompleted);
			}

			// Sync selected task from modal stack
			const taskModal = urlState.modalStack.find((m) => m.startsWith("task-"));
			if (taskModal) {
				const id = parseInt(taskModal.split("-")[1], 10);
				setSelectedTaskId(isNaN(id) ? null : id);
			} else {
				setSelectedTaskId(null);
			}
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
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

	// Sync URL when filters change
	useEffect(() => {
		if (initializedRef.current) {
			updateURLState({ filters }, true);
		}
	}, [filters]);

	// Sync URL when sort config changes
	useEffect(() => {
		if (initializedRef.current) {
			updateURLState({ sortConfig }, true);
		}
	}, [sortConfig]);

	// Sync URL when section visibility changes
	useEffect(() => {
		if (initializedRef.current) {
			updateURLState({ showOverdue, showCompleted }, true);
		}
	}, [showOverdue, showCompleted]);

	// Sync URL when selected task changes (task detail modal)
	useEffect(() => {
		if (!initializedRef.current) return;

		const currentStack = [...modalStack];
		const taskModalIndex = currentStack.findIndex((m) => m.startsWith("task-"));

		if (selectedTaskId !== null) {
			const newTaskModal: ModalType = `task-${selectedTaskId}`;
			// If there's already a task modal, replace it; otherwise push
			if (taskModalIndex >= 0) {
				currentStack[taskModalIndex] = newTaskModal;
			} else {
				currentStack.push(newTaskModal);
			}
		} else {
			// Remove task modal if present
			if (taskModalIndex >= 0) {
				currentStack.splice(taskModalIndex, 1);
			}
		}

		// Update URL hash with new stack
		const params = new URLSearchParams(window.location.search);
		const queryString = params.toString();
		const newHash = currentStack.length > 0 ? `#${currentStack.join(",")}` : "";
		const newURL = `${window.location.pathname}${
			queryString ? `?${queryString}` : ""
		}${newHash}`;
		window.history.replaceState(null, "", newURL);
	}, [selectedTaskId, modalStack]);

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
			// 401 errors are now automatically handled by the API utility
			// which triggers global logout
			setError(err instanceof Error ? err.message : "Failed to load tasks");
		} finally {
			setIsLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, selectedListId, navigate]);

	const handleProfileUpdated = useCallback(
		(timezoneChanged: boolean) => {
			if (timezoneChanged) {
				fetchTasks();
			}
		},
		[fetchTasks],
	);

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	// Navigate to a specific task (used by clickable toast notifications)
	// Defined before WebSocket handler so it can be used in toast onClick
	const navigateToTask = useCallback((taskId: number, targetTab: TabType) => {
		// Switch to the correct tab if needed
		setActiveTab(targetTab);
		// Scroll to and highlight the task card
		setScrollToTaskId(taskId);
		// Select the task to open the detail modal
		setSelectedTaskId(taskId);
	}, []);

	// Navigate to supervisee card (used when someone adds you as verifier)
	const navigateToSupervisee = useCallback((userId: number) => {
		setActiveTab("supervising");
		setHighlightSuperviseeId(userId);
	}, []);

	// Subscribe to real-time task updates via WebSocket
	useEffect(() => {
		const handleSocketMessage = (message: SocketMessage) => {
			if (message.type === "TASK_UPDATED") {
				const payload = message.payload as TaskUpdatedPayload;

				// Check if current user triggered this update (skip toast if so)
				const isSelfTriggered = payload.triggeredByEmail === currentUserEmail;

				// If the task was reassigned away from this user, remove it from their list
				if (payload.status === "REASSIGNED") {
					setTasks((prevTasks) =>
						prevTasks.filter((task) => task.id !== payload.taskId),
					);
					// Always show reassign notification since it affects the user
					toast.info(`🔄 ${payload.message}`, {
						icon: false,
					});
					return;
				}

				// Update task in state
				setTasks((prevTasks) => {
					return prevTasks.map((task) =>
						task.id === payload.taskId
							? {
									...task,
									status: payload.status as Task["status"],
									// Only update optional fields if they're defined in the payload
									...(payload.denialReason !== undefined && {
										denialReason: payload.denialReason,
									}),
									...(payload.approvalComment !== undefined && {
										approvalComment: payload.approvalComment,
									}),
									...(payload.verifiedAt !== undefined && {
										verifiedAt: payload.verifiedAt,
									}),
									...(payload.completedAt !== undefined && {
										completedAt: payload.completedAt,
									}),
									...(payload.rejectedAt !== undefined && {
										rejectedAt: payload.rejectedAt,
									}),
									...(payload.submittedAt !== undefined && {
										submittedAt: payload.submittedAt,
									}),
									// Update verifier if included (for reassign)
									...(payload.verifier && { verifier: payload.verifier }),
									// Update editable fields if included (for task updates)
									...(payload.title !== undefined && { title: payload.title }),
									...(payload.description !== undefined && {
										description: payload.description,
									}),
									...(payload.deadline !== undefined && {
										deadline: payload.deadline,
									}),
									...(payload.priority !== undefined && {
										priority: payload.priority as Task["priority"],
									}),
									...(payload.starred !== undefined && {
										starred: payload.starred,
									}),
									...(payload.location !== undefined && {
										location: payload.location,
									}),
									...(payload.tags !== undefined && { tags: payload.tags }),
									...(payload.repeatPattern !== undefined && {
										repeatPattern: payload.repeatPattern,
									}),
								}
							: task,
					);
				});

				// Only show toast to the OTHER user, not the one who triggered the action
				if (!isSelfTriggered) {
					// Determine which tab to navigate to based on who triggered the action:
					// - If someone else triggered it, I'm the other party
					// - Verifier actions (approve/deny): current user is the CREATOR -> "my-tasks"
					// - Creator actions (submit proof, pause): current user is the VERIFIER -> "verification-requests"
					// We determine this by the status/action type:
					// - COMPLETED/denied (approved field set) = verifier action -> user is creator
					// - PENDING_VERIFICATION/PAUSED = creator action -> user is verifier
					const isVerifierAction = payload.approved !== undefined;
					const targetTab: TabType = isVerifierAction
						? "my-tasks" // Verifier took action, so current user is the creator
						: "verification-requests"; // Creator took action, so current user is the verifier

					// Show clickable toast notification based on status
					const toastOptions: ToastOptions = {
						icon: false,
						onClick: () => navigateToTask(payload.taskId, targetTab),
						style: { cursor: "pointer" },
					};

					if (payload.approved === true) {
						toast.success(`✅ ${payload.message}`, toastOptions);
					} else if (payload.approved === false) {
						toast.warning(`❌ ${payload.message}`, toastOptions);
					} else if (payload.status === "PENDING_VERIFICATION") {
						toast.info(`📋 ${payload.message}`, toastOptions);
					} else if (payload.status === "PAUSED") {
						toast.warning(`⏸️ ${payload.message}`, toastOptions);
					}
				}
			} else if (message.type === "NEW_TASK_ASSIGNED") {
				const payload = message.payload as NewTaskAssignedPayload;

				// Check if current user is the creator (they created the task, skip toast)
				const isCreator = payload.creator.email === currentUserEmail;

				// Build the new task object from the payload
				const newTask: Task = {
					id: payload.taskId,
					title: payload.title,
					description: payload.description,
					deadline: payload.deadline,
					priority: payload.priority as Task["priority"],
					status: payload.status as Task["status"],
					starred: payload.starred,
					location: payload.location,
					tags: payload.tags,
					createdAt: payload.createdAt,
					submittedAt: payload.submittedAt,
					repeatPattern: payload.repeatPattern,
					creator: payload.creator,
					verifier: payload.verifier,
					list: payload.list
						? {
								id: payload.list.id,
								name: payload.list.name,
								colorHex: payload.list.colorHex,
								icon: payload.list.icon,
								isDefault: payload.list.isDefault,
								taskCount: 0, // Not provided in payload, will be updated on refresh
							}
						: undefined,
				};

				// Add to the task list for real-time update
				// Handle differently based on current tab
				setTasks((prevTasks) => {
					// Only add if not already in the list
					if (prevTasks.some((t) => t.id === newTask.id)) {
						return prevTasks;
					}

					// For verification-requests tab: add if current user is the verifier
					if (activeTab === "verification-requests") {
						if (newTask.verifier.email === currentUserEmail) {
							return [newTask, ...prevTasks];
						}
						return prevTasks;
					}

					// For my-tasks tab: add if current user is the creator
					if (activeTab === "my-tasks") {
						if (newTask.creator.email !== currentUserEmail) {
							return prevTasks; // Not creator, don't add
						}
						// If viewing a specific list, only add if task belongs to that list
						if (selectedListId !== null) {
							if (!newTask.list || newTask.list.id !== selectedListId) {
								return prevTasks; // Don't add - task doesn't belong to this list
							}
						}
						return [newTask, ...prevTasks];
					}

					return prevTasks;
				});

				// Only show toast to verifier, not the creator who just created the task
				if (!isCreator) {
					const newTaskToastOptions: ToastOptions = {
						icon: false,
						onClick: () =>
							navigateToTask(payload.taskId, "verification-requests"),
						style: { cursor: "pointer" },
					};
					toast.info(
						`📥 New task: "${payload.title}" from ${payload.creatorName}`,
						newTaskToastOptions,
					);
				}
			} else if (message.type === "VERIFIER_ADDED") {
				const payload = message.payload as VerifierAddedPayload;

				// Show notification that someone added you as their verifier
				const toastOptions: ToastOptions = {
					icon: false,
					onClick: () => navigateToSupervisee(payload.addedById),
					style: { cursor: "pointer" },
				};
				toast.info(`🤝 ${payload.message}`, toastOptions);
			} else if (message.type === "VERIFIER_REMOVED") {
				const payload = message.payload as VerifierRemovedPayload;

				// Show notification that someone removed you as their verifier
				toast.warning(`👋 ${payload.message}`, {
					icon: false,
				});
			} else if (message.type === "TASK_MISSED") {
				const payload = message.payload as TaskMissedPayload;

				// Update task status to MISSED in local state
				setTasks((prevTasks) =>
					prevTasks.map((task) =>
						task.id === payload.taskId
							? { ...task, status: "MISSED" as Task["status"] }
							: task,
					),
				);

				// Show notification to creator that their task was missed
				const toastOptions: ToastOptions = {
					icon: false,
					onClick: () => navigateToTask(payload.taskId, "my-tasks"),
					style: { cursor: "pointer" },
				};
				toast.error(`⚠️ ${payload.message}`, toastOptions);
			} else if (message.type === "PENALTY_UNLOCKED") {
				const payload = message.payload as PenaltyUnlockedPayload;

				// Update task status to MISSED in local state (for supervising tab)
				setTasks((prevTasks) =>
					prevTasks.map((task) =>
						task.id === payload.taskId
							? { ...task, status: "MISSED" as Task["status"] }
							: task,
					),
				);

				// Show notification to verifier that a penalty has been revealed
				const toastOptions: ToastOptions = {
					icon: false,
					onClick: () =>
						navigateToTask(payload.taskId, "verification-requests"),
					style: { cursor: "pointer" },
					autoClose: false, // Don't auto-close this important notification
				};
				toast.warning(
					`🔓 Penalty revealed! ${payload.creatorName} missed their deadline. Click to view.`,
					toastOptions,
				);
			}
		};

		const unsubscribe = subscribe(handleSocketMessage);
		return unsubscribe;
	}, [
		subscribe,
		navigateToTask,
		navigateToSupervisee,
		selectedListId,
		currentUserEmail,
		activeTab,
	]);

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

	const handleRepeatModalOpenChange = useCallback(
		(open: boolean) => {
			if (open) {
				openModal("repeat");
			} else {
				closeModal("repeat");
			}
		},
		[openModal, closeModal],
	);

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

	const handleOpenProfile = () => {
		openModal("profile");
	};

	const handleCloseProfile = () => {
		closeModal("profile");
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
		// No need to fetchTasks - WebSocket NEW_TASK_ASSIGNED will add the task to state
		setRefreshListsKey((k) => k + 1);
	};

	// Handle task updated (e.g., moved to a different list)
	const handleTaskUpdated = (updatedTask: Task) => {
		setTasks((prevTasks) =>
			prevTasks.map((task) =>
				task.id === updatedTask.id ? updatedTask : task,
			),
		);
	};

	// Handle repeat pattern updated - scroll to the task
	const handleRepeatPatternUpdated = (updatedTask: Task) => {
		// Scroll to the task to highlight it
		setScrollToTaskId(updatedTask.id);
	};

	// Handle task moved to a different list - navigate and show toast
	const handleTaskMoved = (
		movedTask: Task,
		newListId: number | null,
		newListName: string,
	) => {
		// Remove the task from the current view since it's moving to a different list
		// (If viewing "All Tasks", we'll re-add it when we navigate)
		setTasks((prevTasks) =>
			prevTasks.filter((task) => task.id !== movedTask.id),
		);

		// Refresh lists to update task counts
		setRefreshListsKey((k) => k + 1);

		// Close the task detail modal
		setSelectedTaskId(null);

		// Navigate to the new list immediately
		setSelectedListId(newListId);
		setSelectedListName(newListName);

		// Set the task ID to scroll to after navigation
		setScrollToTaskId(movedTask.id);

		// Show toast with clickable navigation (in case user navigates away)
		toast.success(`📁 Task moved to "${newListName}"`, {
			icon: false,
			onClick: () => {
				// Navigate to the new list and scroll to the task
				setSelectedListId(newListId);
				setSelectedListName(newListName);
				setScrollToTaskId(movedTask.id);
			},
			style: { cursor: "pointer" },
		});
	};

	const handleListCreated = (list: TaskList) => {
		setRefreshListsKey((k) => k + 1);
		setNewlyCreatedListId(list.id);
	};

	const handleSelectList = (listId: number | null) => {
		setSelectedListId(listId);
	};

	// Filter and sort tasks based on current filters and sort config
	const filteredTasks = useMemo(() => {
		const fromValue = filters.deadlineFrom
			? getLocalDateTimeValue(`${filters.deadlineFrom}T00:00:00`)
			: null;
		const toValue = filters.deadlineTo
			? getLocalDateTimeValue(`${filters.deadlineTo}T23:59:59`)
			: null;

		const filtered = tasks.filter((task) => {
			// CRITICAL: Filter tasks based on current view to prevent cross-contamination
			// This ensures real-time socket updates don't render tasks in the wrong view
			if (activeTab === "my-tasks") {
				// Only show tasks where current user is the CREATOR
				if (task.creator.email !== currentUserEmail) {
					return false;
				}
			} else if (activeTab === "verification-requests") {
				// Only show tasks where current user is the VERIFIER
				if (task.verifier.email !== currentUserEmail) {
					return false;
				}
			}

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
				const taskDeadline = getLocalDateTimeValue(task.deadline);
				if (fromValue !== null && taskDeadline < fromValue) return false;
				if (toValue !== null && taskDeadline > toValue) return false;
			}

			return true;
		});

		// Apply sorting
		const sortedTasks = [...filtered].sort(getSortComparator(sortConfig));
		return sortedTasks;
	}, [tasks, filters, sortConfig, activeTab, currentUserEmail]);

	// Calculate stats from filtered tasks
	const pendingProofCount = filteredTasks.filter(
		(t) => t.status === "PENDING_PROOF",
	).length;
	const pendingVerificationCount = filteredTasks.filter(
		(t) => t.status === "PENDING_VERIFICATION",
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
			isProfileModalOpen={isProfileModalOpen}
			onOpenProfileModal={handleOpenProfile}
			onCloseProfileModal={handleCloseProfile}
			onProfileUpdated={handleProfileUpdated}
		>
			{activeTab === "supervising" ? (
				<SupervisingTab
					highlightUserId={highlightSuperviseeId}
					onHighlightComplete={() => setHighlightSuperviseeId(null)}
				/>
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

					{!isLoading && tasks.length > 0 && (
						<SortBar sortConfig={sortConfig} onSortChange={setSortConfig} />
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
						onTaskUpdated={handleTaskUpdated}
						onTaskMoved={handleTaskMoved}
						onRepeatPatternUpdated={handleRepeatPatternUpdated}
						selectedTaskId={selectedTaskId}
						onSelectTask={setSelectedTaskId}
						scrollToTaskId={scrollToTaskId}
						onScrollComplete={() => setScrollToTaskId(null)}
						showOverdue={showOverdue}
						onShowOverdueChange={setShowOverdue}
						showCompleted={showCompleted}
						onShowCompletedChange={setShowCompleted}
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
				isRepeatModalOpen={isRepeatModalOpen}
				onRepeatModalOpenChange={handleRepeatModalOpenChange}
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
					// No need to fetchTasks - WebSocket TASK_UPDATED will update the state
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
					// No need to fetchTasks - WebSocket TASK_UPDATED will update paused tasks
				}}
			/>

			<SubmitProofModal
				task={submitProofTask}
				isOpen={submitProofTask !== null}
				onClose={handleCloseSubmitProof}
				onSuccess={() => {
					handleCloseSubmitProof();
					// No need to fetchTasks - WebSocket TASK_UPDATED will update the state
				}}
			/>

			<ReviewProofModal
				task={reviewProofTask}
				isOpen={reviewProofTask !== null}
				onClose={handleCloseReviewProof}
				onSuccess={() => {
					handleCloseReviewProof();
					// No need to fetchTasks - WebSocket TASK_UPDATED will update the state
				}}
			/>
		</DashboardLayout>
	);
}
