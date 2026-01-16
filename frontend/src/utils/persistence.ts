// Utility for persisting app state across page refreshes
// Uses URL params for navigation state and localStorage for drafts

import type {
	TaskFilters,
	TaskPriority,
	TaskStatus,
	TaskSortConfig,
	SortField,
	SortDirection,
} from "../types";

const STORAGE_KEYS = {
	TASK_DRAFT: "cosign_task_draft",
	PROOF_DRAFT: "cosign_proof_draft_", // + taskId
	LIST_DRAFT: "cosign_list_draft",
	REPEAT_DRAFT: "cosign_repeat_draft",
} as const;

// ============ URL State Management ============

export type ModalType =
	| "create-task"
	| "create-list"
	| "verifiers"
	| "repeat"
	| `proof-${number}`
	| `review-${number}`
	| `reassign-${number}`
	| `task-${number}`; // Added for task detail modal

export interface URLState {
	tab?: "my-tasks" | "verification-requests" | "supervising";
	list?: number | null;
	modalStack: ModalType[]; // Stack of modals, last one is on top
	// Filter and sort state
	filters?: Partial<TaskFilters>;
	sortConfig?: TaskSortConfig;
	// Section visibility
	showOverdue?: boolean;
	showCompleted?: boolean;
}

// Valid sort fields for validation
const VALID_SORT_FIELDS: SortField[] = [
	"deadline",
	"priority",
	"status",
	"title",
	"createdAt",
	"submittedAt",
];

const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_STATUSES: TaskStatus[] = [
	"PENDING_PROOF",
	"PENDING_VERIFICATION",
	"COMPLETED",
	"MISSED",
	"PAUSED",
];

export function parseURLState(): URLState {
	const params = new URLSearchParams(window.location.search);
	const hash = window.location.hash.slice(1); // Remove the #

	const state: URLState = {
		modalStack: [],
	};

	// Parse tab from query param
	const tab = params.get("tab");
	if (
		tab === "my-tasks" ||
		tab === "verification-requests" ||
		tab === "supervising"
	) {
		state.tab = tab;
	}

	// Parse selected list
	const list = params.get("list");
	if (list) {
		const listId = parseInt(list, 10);
		state.list = isNaN(listId) ? null : listId;
	}

	// Parse filters
	const filters: Partial<TaskFilters> = {};
	let hasFilters = false;

	// Search
	const search = params.get("search");
	if (search) {
		filters.search = search;
		hasFilters = true;
	}

	// Tags (comma-separated)
	const tags = params.get("tags");
	if (tags) {
		filters.tags = tags.split(",").filter(Boolean);
		hasFilters = true;
	}

	// Priorities (comma-separated)
	const priorities = params.get("priorities");
	if (priorities) {
		const parsed = priorities
			.split(",")
			.filter((p) => VALID_PRIORITIES.includes(p as TaskPriority));
		if (parsed.length > 0) {
			filters.priorities = parsed as TaskPriority[];
			hasFilters = true;
		}
	}

	// Statuses (comma-separated)
	const statuses = params.get("statuses");
	if (statuses) {
		const parsed = statuses
			.split(",")
			.filter((s) => VALID_STATUSES.includes(s as TaskStatus));
		if (parsed.length > 0) {
			filters.statuses = parsed as TaskStatus[];
			hasFilters = true;
		}
	}

	// Starred filter
	const starred = params.get("starred");
	if (starred === "true") {
		filters.starred = true;
		hasFilters = true;
	}

	// Date range
	const deadlineFrom = params.get("from");
	if (deadlineFrom) {
		filters.deadlineFrom = deadlineFrom;
		hasFilters = true;
	}
	const deadlineTo = params.get("to");
	if (deadlineTo) {
		filters.deadlineTo = deadlineTo;
		hasFilters = true;
	}

	if (hasFilters) {
		state.filters = filters;
	}

	// Parse sort config
	const sortPrimary = params.get("sort");
	if (sortPrimary && VALID_SORT_FIELDS.includes(sortPrimary as SortField)) {
		const sortDir = params.get("dir") as SortDirection | null;
		const sortConfig: TaskSortConfig = {
			primary: {
				field: sortPrimary as SortField,
				direction: sortDir === "desc" ? "desc" : "asc",
			},
			tiebreaker: "starred",
		};

		// Secondary sort
		const sortSecondary = params.get("sort2");
		if (
			sortSecondary &&
			VALID_SORT_FIELDS.includes(sortSecondary as SortField) &&
			sortSecondary !== sortPrimary
		) {
			const sortDir2 = params.get("dir2") as SortDirection | null;
			sortConfig.secondary = {
				field: sortSecondary as SortField,
				direction: sortDir2 === "desc" ? "desc" : "asc",
			};
		}

		// Tiebreaker
		const tiebreaker = params.get("tie");
		if (tiebreaker === "title" || tiebreaker === "createdAt") {
			sortConfig.tiebreaker = tiebreaker;
		}

		state.sortConfig = sortConfig;
	}

	// Parse section visibility
	const showOverdue = params.get("overdue");
	if (showOverdue === "1") {
		state.showOverdue = true;
	}

	const showCompleted = params.get("completed");
	if (showCompleted === "1") {
		state.showCompleted = true;
	}

	// Parse modal stack from hash (comma-separated)
	if (hash) {
		const modals = hash.split(",").filter(Boolean);
		for (const modal of modals) {
			if (isValidModalType(modal)) {
				state.modalStack.push(modal as ModalType);
			}
		}
	}

	return state;
}

function isValidModalType(modal: string): boolean {
	if (
		modal === "create-task" ||
		modal === "create-list" ||
		modal === "verifiers" ||
		modal === "repeat"
	) {
		return true;
	}
	if (
		modal.startsWith("proof-") ||
		modal.startsWith("review-") ||
		modal.startsWith("reassign-") ||
		modal.startsWith("task-")
	) {
		const id = modal.split("-")[1];
		return !isNaN(parseInt(id, 10));
	}
	return false;
}

export function updateURLState(
	updates: Partial<Omit<URLState, "modalStack">>,
	replace = false
): void {
	const params = new URLSearchParams(window.location.search);

	// Handle tab
	if (updates.tab !== undefined) {
		if (updates.tab) {
			params.set("tab", updates.tab);
		} else {
			params.delete("tab");
		}
	}

	// Handle list
	if (updates.list !== undefined) {
		if (updates.list !== null) {
			params.set("list", String(updates.list));
		} else {
			params.delete("list");
		}
	}

	// Handle filters
	if (updates.filters !== undefined) {
		const f = updates.filters;

		// Search
		if (f.search) {
			params.set("search", f.search);
		} else {
			params.delete("search");
		}

		// Tags
		if (f.tags && f.tags.length > 0) {
			params.set("tags", f.tags.join(","));
		} else {
			params.delete("tags");
		}

		// Priorities
		if (f.priorities && f.priorities.length > 0) {
			params.set("priorities", f.priorities.join(","));
		} else {
			params.delete("priorities");
		}

		// Statuses
		if (f.statuses && f.statuses.length > 0) {
			params.set("statuses", f.statuses.join(","));
		} else {
			params.delete("statuses");
		}

		// Starred
		if (f.starred === true) {
			params.set("starred", "true");
		} else {
			params.delete("starred");
		}

		// Date range
		if (f.deadlineFrom) {
			params.set("from", f.deadlineFrom);
		} else {
			params.delete("from");
		}
		if (f.deadlineTo) {
			params.set("to", f.deadlineTo);
		} else {
			params.delete("to");
		}
	}

	// Handle sort config
	if (updates.sortConfig !== undefined) {
		const s = updates.sortConfig;

		// Primary sort
		params.set("sort", s.primary.field);
		params.set("dir", s.primary.direction);

		// Secondary sort
		if (s.secondary) {
			params.set("sort2", s.secondary.field);
			params.set("dir2", s.secondary.direction);
		} else {
			params.delete("sort2");
			params.delete("dir2");
		}

		// Tiebreaker (only store if not default "starred")
		if (s.tiebreaker !== "starred") {
			params.set("tie", s.tiebreaker);
		} else {
			params.delete("tie");
		}
	}

	// Handle section visibility
	if (updates.showOverdue !== undefined) {
		if (updates.showOverdue) {
			params.set("overdue", "1");
		} else {
			params.delete("overdue");
		}
	}

	if (updates.showCompleted !== undefined) {
		if (updates.showCompleted) {
			params.set("completed", "1");
		} else {
			params.delete("completed");
		}
	}

	// Keep existing hash
	const hash = window.location.hash.slice(1);

	// Build new URL
	const queryString = params.toString();
	const newURL = `${window.location.pathname}${
		queryString ? `?${queryString}` : ""
	}${hash ? `#${hash}` : ""}`;

	if (replace) {
		window.history.replaceState(null, "", newURL);
	} else {
		window.history.pushState(null, "", newURL);
	}
}

// Push a modal onto the stack
export function pushModal(modal: ModalType): void {
	const currentHash = window.location.hash.slice(1);
	const currentStack = currentHash
		? currentHash.split(",").filter(Boolean)
		: [];

	// Don't add duplicates
	if (!currentStack.includes(modal)) {
		currentStack.push(modal);
	}

	const params = new URLSearchParams(window.location.search);
	const queryString = params.toString();
	const newURL = `${window.location.pathname}${
		queryString ? `?${queryString}` : ""
	}#${currentStack.join(",")}`;

	window.history.pushState(null, "", newURL);
}

// Pop the top modal from the stack
export function popModal(): ModalType | undefined {
	const currentHash = window.location.hash.slice(1);
	const currentStack = currentHash
		? currentHash.split(",").filter(Boolean)
		: [];

	const popped = currentStack.pop();

	const params = new URLSearchParams(window.location.search);
	const queryString = params.toString();
	const newHash = currentStack.length > 0 ? `#${currentStack.join(",")}` : "";
	const newURL = `${window.location.pathname}${
		queryString ? `?${queryString}` : ""
	}${newHash}`;

	window.history.replaceState(null, "", newURL);

	return popped as ModalType | undefined;
}

// Clear all modals from the stack
export function clearAllModals(): void {
	const params = new URLSearchParams(window.location.search);
	const queryString = params.toString();
	const newURL = `${window.location.pathname}${
		queryString ? `?${queryString}` : ""
	}`;
	window.history.replaceState(null, "", newURL);
}

// Get current modal stack
export function getModalStack(): ModalType[] {
	const currentHash = window.location.hash.slice(1);
	if (!currentHash) return [];
	return currentHash.split(",").filter(isValidModalType) as ModalType[];
}

// Check if a specific modal is in the stack
export function isModalOpen(modal: ModalType): boolean {
	return getModalStack().includes(modal);
}

// ============ Draft Storage ============

export interface TaskDraft {
	title: string;
	description: string;
	deadline: string;
	verifierEmail: string;
	tags: string;
	listId?: number;
	priority: string;
	location: string;
	repeatPattern?: string;
	starred: boolean;
	savedAt: number; // timestamp
}

export interface ProofDraft {
	taskId: number;
	description: string;
	// Note: Files can't be stored, but we can remember their names
	fileNames: string[];
	savedAt: number;
}

export interface ListDraft {
	name: string;
	colorHex: string;
	savedAt: number;
}

// Task Draft
export function saveTaskDraft(draft: Omit<TaskDraft, "savedAt">): void {
	try {
		const data: TaskDraft = { ...draft, savedAt: Date.now() };
		localStorage.setItem(STORAGE_KEYS.TASK_DRAFT, JSON.stringify(data));
	} catch (e) {
		console.warn("Failed to save task draft:", e);
	}
}

export function loadTaskDraft(): TaskDraft | null {
	try {
		const data = localStorage.getItem(STORAGE_KEYS.TASK_DRAFT);
		if (!data) return null;
		const draft = JSON.parse(data) as TaskDraft;
		// Expire drafts after 24 hours
		if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
			clearTaskDraft();
			return null;
		}
		return draft;
	} catch (e) {
		console.warn("Failed to load task draft:", e);
		return null;
	}
}

export function clearTaskDraft(): void {
	try {
		localStorage.removeItem(STORAGE_KEYS.TASK_DRAFT);
	} catch (e) {
		console.warn("Failed to clear task draft:", e);
	}
}

// Proof Draft (per task)
export function saveProofDraft(
	taskId: number,
	draft: Omit<ProofDraft, "taskId" | "savedAt">
): void {
	try {
		const data: ProofDraft = { ...draft, taskId, savedAt: Date.now() };
		localStorage.setItem(
			STORAGE_KEYS.PROOF_DRAFT + taskId,
			JSON.stringify(data)
		);
	} catch (e) {
		console.warn("Failed to save proof draft:", e);
	}
}

export function loadProofDraft(taskId: number): ProofDraft | null {
	try {
		const data = localStorage.getItem(STORAGE_KEYS.PROOF_DRAFT + taskId);
		if (!data) return null;
		const draft = JSON.parse(data) as ProofDraft;
		// Expire drafts after 7 days
		if (Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
			clearProofDraft(taskId);
			return null;
		}
		return draft;
	} catch (e) {
		console.warn("Failed to load proof draft:", e);
		return null;
	}
}

export function clearProofDraft(taskId: number): void {
	try {
		localStorage.removeItem(STORAGE_KEYS.PROOF_DRAFT + taskId);
	} catch (e) {
		console.warn("Failed to clear proof draft:", e);
	}
}

// List Draft
export function saveListDraft(draft: Omit<ListDraft, "savedAt">): void {
	try {
		const data: ListDraft = { ...draft, savedAt: Date.now() };
		localStorage.setItem(STORAGE_KEYS.LIST_DRAFT, JSON.stringify(data));
	} catch (e) {
		console.warn("Failed to save list draft:", e);
	}
}

export function loadListDraft(): ListDraft | null {
	try {
		const data = localStorage.getItem(STORAGE_KEYS.LIST_DRAFT);
		if (!data) return null;
		const draft = JSON.parse(data) as ListDraft;
		// Expire drafts after 24 hours
		if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
			clearListDraft();
			return null;
		}
		return draft;
	} catch (e) {
		console.warn("Failed to load list draft:", e);
		return null;
	}
}

export function clearListDraft(): void {
	try {
		localStorage.removeItem(STORAGE_KEYS.LIST_DRAFT);
	} catch (e) {
		console.warn("Failed to clear list draft:", e);
	}
}

// Repeat Modal Draft
export type RepeatFrequency =
	| "none"
	| "daily"
	| "weekly"
	| "monthly"
	| "yearly";
export type RepeatEndType = "never" | "date" | "count";

export interface RepeatDraft {
	frequency: RepeatFrequency;
	interval: number;
	weekdays: string[];
	endType: RepeatEndType;
	endDate: string;
	count: number;
	savedAt: number;
}

export function saveRepeatDraft(draft: Omit<RepeatDraft, "savedAt">): void {
	try {
		const data: RepeatDraft = { ...draft, savedAt: Date.now() };
		localStorage.setItem(STORAGE_KEYS.REPEAT_DRAFT, JSON.stringify(data));
	} catch (e) {
		console.warn("Failed to save repeat draft:", e);
	}
}

export function loadRepeatDraft(): RepeatDraft | null {
	try {
		const data = localStorage.getItem(STORAGE_KEYS.REPEAT_DRAFT);
		if (!data) return null;
		const draft = JSON.parse(data) as RepeatDraft;
		// Expire drafts after 1 hour (repeat modal is transient)
		if (Date.now() - draft.savedAt > 60 * 60 * 1000) {
			clearRepeatDraft();
			return null;
		}
		return draft;
	} catch (e) {
		console.warn("Failed to load repeat draft:", e);
		return null;
	}
}

export function clearRepeatDraft(): void {
	try {
		localStorage.removeItem(STORAGE_KEYS.REPEAT_DRAFT);
	} catch (e) {
		console.warn("Failed to clear repeat draft:", e);
	}
}
