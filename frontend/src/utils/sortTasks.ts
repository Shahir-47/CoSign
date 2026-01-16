import type { Task, TaskSortConfig, SortOption } from "../types";

// Priority order for sorting (higher priority = higher value)
const PRIORITY_ORDER: Record<string, number> = {
	LOW: 0,
	MEDIUM: 1,
	HIGH: 2,
	CRITICAL: 3,
};

// Status order for sorting (more urgent states first)
const STATUS_ORDER: Record<string, number> = {
	PENDING_PROOF: 0,
	PENDING_VERIFICATION: 1,
	PAUSED: 2,
	MISSED: 3,
	COMPLETED: 4,
};

export function getSortComparator(
	config: TaskSortConfig | null | undefined
): (a: Task, b: Task) => number {
	// Defensive: if no config, return no-op comparator
	if (!config || !config.primary) {
		return () => 0;
	}

	return (a: Task, b: Task) => {
		try {
			// Primary sort
			let result = compareByOption(a, b, config.primary);
			if (result !== 0) return result;

			// Secondary sort (if configured)
			if (config.secondary) {
				result = compareByOption(a, b, config.secondary);
				if (result !== 0) return result;
			}

			// Tiebreaker
			return compareByTiebreaker(a, b, config.tiebreaker || "starred");
		} catch {
			// If anything goes wrong, don't crash - just don't sort
			return 0;
		}
	};
}

function compareByOption(
	a: Task,
	b: Task,
	option: SortOption | null | undefined
): number {
	if (!option || !option.field) return 0;

	const { field, direction } = option;
	let result = 0;

	switch (field) {
		case "deadline": {
			const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
			const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
			// Handle null/undefined - push them to the end
			if (!a.deadline && b.deadline) return 1;
			if (a.deadline && !b.deadline) return -1;
			result = dateA - dateB;
			break;
		}
		case "createdAt": {
			const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			if (!a.createdAt && b.createdAt) return 1;
			if (a.createdAt && !b.createdAt) return -1;
			result = dateA - dateB;
			break;
		}
		case "submittedAt": {
			const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
			const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
			if (!a.submittedAt && b.submittedAt) return 1;
			if (a.submittedAt && !b.submittedAt) return -1;
			result = dateA - dateB;
			break;
		}
		case "priority": {
			const priorityA = PRIORITY_ORDER[a.priority] ?? 0;
			const priorityB = PRIORITY_ORDER[b.priority] ?? 0;
			result = priorityA - priorityB;
			break;
		}
		case "status": {
			const statusA = STATUS_ORDER[a.status] ?? 0;
			const statusB = STATUS_ORDER[b.status] ?? 0;
			result = statusA - statusB;
			break;
		}
		case "title": {
			const titleA = a.title || "";
			const titleB = b.title || "";
			result = titleA.localeCompare(titleB);
			break;
		}
		default:
			// Unknown field, don't sort
			return 0;
	}

	// Apply direction
	return direction === "desc" ? -result : result;
}

function compareByTiebreaker(
	a: Task,
	b: Task,
	tiebreaker: TaskSortConfig["tiebreaker"]
): number {
	switch (tiebreaker) {
		case "starred": {
			// Starred items first
			if (a.starred && !b.starred) return -1;
			if (!a.starred && b.starred) return 1;
			return 0;
		}
		case "title": {
			const titleA = a.title || "";
			const titleB = b.title || "";
			return titleA.localeCompare(titleB);
		}
		case "createdAt": {
			const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			// Newer items first
			return dateB - dateA;
		}
		default:
			return 0;
	}
}
