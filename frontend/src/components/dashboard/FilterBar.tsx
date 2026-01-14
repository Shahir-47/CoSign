import { useState, useMemo } from "react";
import {
	Search,
	Filter,
	X,
	Tag,
	Flag,
	Clock,
	Star,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import type { Task, TaskFilters, TaskPriority, TaskStatus } from "../../types";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
	tasks: Task[];
	filters: TaskFilters;
	onFiltersChange: (filters: TaskFilters) => void;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
	{ value: "LOW", label: "Low", color: "#10b981" },
	{ value: "MEDIUM", label: "Medium", color: "#f59e0b" },
	{ value: "HIGH", label: "High", color: "#f97316" },
	{ value: "CRITICAL", label: "Critical", color: "#ef4444" },
];

const STATUSES: { value: TaskStatus; label: string; color: string }[] = [
	{ value: "PENDING_PROOF", label: "Pending Proof", color: "#f59e0b" },
	{
		value: "PENDING_VERIFICATION",
		label: "Awaiting Verification",
		color: "#6366f1",
	},
	{ value: "COMPLETED", label: "Completed", color: "#10b981" },
	{ value: "MISSED", label: "Missed", color: "#ef4444" },
	{ value: "PAUSED", label: "Paused", color: "#f97316" },
];

export default function FilterBar({
	tasks,
	filters,
	onFiltersChange,
}: FilterBarProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	// Extract unique tags from all tasks
	const availableTags = useMemo(() => {
		const tagSet = new Set<string>();
		tasks.forEach((task) => {
			if (task.tags) {
				task.tags.split(",").forEach((tag) => {
					const trimmed = tag.trim();
					if (trimmed) tagSet.add(trimmed);
				});
			}
		});
		return Array.from(tagSet).sort();
	}, [tasks]);

	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (filters.search) count++;
		if (filters.tags.length > 0) count++;
		if (filters.priorities.length > 0) count++;
		if (filters.statuses.length > 0) count++;
		if (filters.starred !== null) count++;
		if (filters.deadlineFrom || filters.deadlineTo) count++;
		return count;
	}, [filters]);

	const handleSearchChange = (value: string) => {
		onFiltersChange({ ...filters, search: value });
	};

	const toggleTag = (tag: string) => {
		const newTags = filters.tags.includes(tag)
			? filters.tags.filter((t) => t !== tag)
			: [...filters.tags, tag];
		onFiltersChange({ ...filters, tags: newTags });
	};

	const togglePriority = (priority: TaskPriority) => {
		const newPriorities = filters.priorities.includes(priority)
			? filters.priorities.filter((p) => p !== priority)
			: [...filters.priorities, priority];
		onFiltersChange({ ...filters, priorities: newPriorities });
	};

	const toggleStatus = (status: TaskStatus) => {
		const newStatuses = filters.statuses.includes(status)
			? filters.statuses.filter((s) => s !== status)
			: [...filters.statuses, status];
		onFiltersChange({ ...filters, statuses: newStatuses });
	};

	const toggleStarred = () => {
		const newValue = filters.starred === true ? null : true;
		onFiltersChange({ ...filters, starred: newValue });
	};

	const clearFilters = () => {
		onFiltersChange({
			search: "",
			tags: [],
			priorities: [],
			statuses: [],
			starred: null,
			deadlineFrom: undefined,
			deadlineTo: undefined,
		});
	};

	return (
		<div className={styles.filterBar}>
			<div className={styles.searchRow}>
				<div className={styles.searchWrapper}>
					<Search size={18} className={styles.searchIcon} />
					<input
						type="text"
						className={styles.searchInput}
						placeholder="Search tasks..."
						value={filters.search}
						onChange={(e) => handleSearchChange(e.target.value)}
					/>
					{filters.search && (
						<button
							className={styles.clearSearch}
							onClick={() => handleSearchChange("")}
						>
							<X size={14} />
						</button>
					)}
				</div>

				<button
					className={`${styles.filterToggle} ${
						isExpanded ? styles.active : ""
					}`}
					onClick={() => setIsExpanded(!isExpanded)}
				>
					<Filter size={18} />
					<span>Filters</span>
					{activeFilterCount > 0 && (
						<span className={styles.filterBadge}>{activeFilterCount}</span>
					)}
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>

				{activeFilterCount > 0 && (
					<button className={styles.clearAll} onClick={clearFilters}>
						Clear all
					</button>
				)}
			</div>

			{isExpanded && (
				<div className={styles.filtersPanel}>
					{/* Tags filter */}
					{availableTags.length > 0 && (
						<div className={styles.filterGroup}>
							<label className={styles.filterLabel}>
								<Tag size={14} />
								Tags
							</label>
							<div className={styles.filterOptions}>
								{availableTags.map((tag) => (
									<button
										key={tag}
										className={`${styles.filterChip} ${
											filters.tags.includes(tag) ? styles.selected : ""
										}`}
										onClick={() => toggleTag(tag)}
									>
										{tag}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Priority filter */}
					<div className={styles.filterGroup}>
						<label className={styles.filterLabel}>
							<Flag size={14} />
							Priority
						</label>
						<div className={styles.filterOptions}>
							{PRIORITIES.map(({ value, label, color }) => (
								<button
									key={value}
									className={`${styles.filterChip} ${
										filters.priorities.includes(value) ? styles.selected : ""
									}`}
									style={{
										borderColor: filters.priorities.includes(value)
											? color
											: undefined,
										backgroundColor: filters.priorities.includes(value)
											? `${color}20`
											: undefined,
									}}
									onClick={() => togglePriority(value)}
								>
									<span
										className={styles.priorityDot}
										style={{ backgroundColor: color }}
									/>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Status filter */}
					<div className={styles.filterGroup}>
						<label className={styles.filterLabel}>
							<Clock size={14} />
							Status
						</label>
						<div className={styles.filterOptions}>
							{STATUSES.map(({ value, label, color }) => (
								<button
									key={value}
									className={`${styles.filterChip} ${
										filters.statuses.includes(value) ? styles.selected : ""
									}`}
									style={{
										borderColor: filters.statuses.includes(value)
											? color
											: undefined,
										backgroundColor: filters.statuses.includes(value)
											? `${color}20`
											: undefined,
									}}
									onClick={() => toggleStatus(value)}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Starred filter */}
					<div className={styles.filterGroup}>
						<label className={styles.filterLabel}>
							<Star size={14} />
							Starred
						</label>
						<div className={styles.filterOptions}>
							<button
								className={`${styles.filterChip} ${
									filters.starred === true ? styles.selected : ""
								}`}
								onClick={toggleStarred}
							>
								<Star
									size={12}
									fill={filters.starred ? "currentColor" : "none"}
								/>
								Starred only
							</button>
						</div>
					</div>

					{/* Date range filter */}
					<div className={styles.filterGroup}>
						<label className={styles.filterLabel}>
							<Clock size={14} />
							Deadline Range
						</label>
						<div className={styles.dateRange}>
							<input
								type="date"
								className={styles.dateInput}
								value={filters.deadlineFrom || ""}
								onChange={(e) =>
									onFiltersChange({
										...filters,
										deadlineFrom: e.target.value || undefined,
									})
								}
								placeholder="From"
							/>
							<span className={styles.dateSeparator}>to</span>
							<input
								type="date"
								className={styles.dateInput}
								value={filters.deadlineTo || ""}
								onChange={(e) =>
									onFiltersChange({
										...filters,
										deadlineTo: e.target.value || undefined,
									})
								}
								placeholder="To"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
