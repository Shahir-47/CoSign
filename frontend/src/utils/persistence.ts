// Utility for persisting app state across page refreshes
// Uses URL params for navigation state and localStorage for drafts

const STORAGE_KEYS = {
	TASK_DRAFT: "cosign_task_draft",
	PROOF_DRAFT: "cosign_proof_draft_", // + taskId
	LIST_DRAFT: "cosign_list_draft",
} as const;

// ============ URL State Management ============

export type ModalType =
	| "create-task"
	| "create-list"
	| "verifiers"
	| `proof-${number}`
	| `review-${number}`
	| `reassign-${number}`;

export interface URLState {
	tab?: "my-tasks" | "verification-requests" | "supervising";
	list?: number | null;
	modalStack: ModalType[]; // Stack of modals, last one is on top
}

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
		modal === "verifiers"
	) {
		return true;
	}
	if (
		modal.startsWith("proof-") ||
		modal.startsWith("review-") ||
		modal.startsWith("reassign-")
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
