import { useState, useRef, useEffect } from "react";
import {
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Calendar,
	Flag,
	Clock,
	Type,
	Star,
	ChevronDown,
	GripVertical,
	Plus,
	X,
} from "lucide-react";
import type { SortField, TaskSortConfig } from "../../types";
import styles from "./SortBar.module.css";

interface SortBarProps {
	sortConfig: TaskSortConfig;
	onSortChange: (config: TaskSortConfig) => void;
}

const SORT_FIELDS: {
	value: SortField;
	label: string;
	icon: typeof Calendar;
	description: string;
}[] = [
	{
		value: "deadline",
		label: "Deadline",
		icon: Calendar,
		description: "Sort by due date",
	},
	{
		value: "priority",
		label: "Priority",
		icon: Flag,
		description: "Sort by urgency level",
	},
	{
		value: "status",
		label: "Status",
		icon: Clock,
		description: "Sort by task state",
	},
	{
		value: "title",
		label: "Title",
		icon: Type,
		description: "Sort alphabetically",
	},
	{
		value: "createdAt",
		label: "Created",
		icon: Calendar,
		description: "Sort by creation date",
	},
	{
		value: "submittedAt",
		label: "Submitted",
		icon: Calendar,
		description: "Sort by proof submission",
	},
];

const TIEBREAKERS: {
	value: TaskSortConfig["tiebreaker"];
	label: string;
	icon: typeof Star;
}[] = [
	{ value: "starred", label: "Starred first", icon: Star },
	{ value: "title", label: "Alphabetically", icon: Type },
	{ value: "createdAt", label: "Newest first", icon: Calendar },
];

export default function SortBar({ sortConfig, onSortChange }: SortBarProps) {
	const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false);
	const [showSecondaryDropdown, setShowSecondaryDropdown] = useState(false);
	const [showTiebreakerDropdown, setShowTiebreakerDropdown] = useState(false);

	const primaryRef = useRef<HTMLDivElement>(null);
	const secondaryRef = useRef<HTMLDivElement>(null);
	const tiebreakerRef = useRef<HTMLDivElement>(null);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				primaryRef.current &&
				!primaryRef.current.contains(e.target as Node)
			) {
				setShowPrimaryDropdown(false);
			}
			if (
				secondaryRef.current &&
				!secondaryRef.current.contains(e.target as Node)
			) {
				setShowSecondaryDropdown(false);
			}
			if (
				tiebreakerRef.current &&
				!tiebreakerRef.current.contains(e.target as Node)
			) {
				setShowTiebreakerDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const getPrimaryField = () =>
		SORT_FIELDS.find((f) => f.value === sortConfig.primary.field);
	const getSecondaryField = () =>
		sortConfig.secondary
			? SORT_FIELDS.find((f) => f.value === sortConfig.secondary?.field)
			: null;
	const getTiebreaker = () =>
		TIEBREAKERS.find((t) => t.value === sortConfig.tiebreaker);

	const handlePrimaryFieldChange = (field: SortField) => {
		// If selecting a field that's currently secondary, swap them
		if (sortConfig.secondary?.field === field) {
			onSortChange({
				...sortConfig,
				primary: { field, direction: sortConfig.secondary.direction },
				secondary: {
					field: sortConfig.primary.field,
					direction: sortConfig.primary.direction,
				},
			});
		} else {
			onSortChange({
				...sortConfig,
				primary: { field, direction: sortConfig.primary.direction },
			});
		}
		setShowPrimaryDropdown(false);
	};

	const handlePrimaryDirectionToggle = () => {
		onSortChange({
			...sortConfig,
			primary: {
				...sortConfig.primary,
				direction: sortConfig.primary.direction === "asc" ? "desc" : "asc",
			},
		});
	};

	const handleSecondaryFieldChange = (field: SortField) => {
		// Don't allow same field as primary
		if (field === sortConfig.primary.field) return;

		onSortChange({
			...sortConfig,
			secondary: { field, direction: "asc" },
		});
		setShowSecondaryDropdown(false);
	};

	const handleSecondaryDirectionToggle = () => {
		if (!sortConfig.secondary) return;
		onSortChange({
			...sortConfig,
			secondary: {
				...sortConfig.secondary,
				direction: sortConfig.secondary.direction === "asc" ? "desc" : "asc",
			},
		});
	};

	const handleRemoveSecondary = () => {
		onSortChange({
			...sortConfig,
			secondary: undefined,
		});
	};

	const handleTiebreakerChange = (tiebreaker: TaskSortConfig["tiebreaker"]) => {
		onSortChange({
			...sortConfig,
			tiebreaker,
		});
		setShowTiebreakerDropdown(false);
	};

	const primaryField = getPrimaryField();
	const secondaryField = getSecondaryField();
	const tiebreaker = getTiebreaker();

	// Defensive: fallback to defaults if fields not found (bad URL state)
	const PrimaryIcon = primaryField?.icon ?? ArrowUpDown;
	const SecondaryIcon = secondaryField?.icon ?? Plus;
	const TiebreakerIcon = tiebreaker?.icon ?? Star;

	// If primary field is invalid, don't render (bad state)
	if (!primaryField) {
		return null;
	}

	return (
		<div className={styles.sortBar}>
			<div className={styles.sortLabel}>
				<ArrowUpDown size={14} />
				<span>Sort by</span>
			</div>

			<div className={styles.sortOptions}>
				{/* Primary Sort */}
				<div className={styles.sortGroup} ref={primaryRef}>
					<div className={styles.sortSelector}>
						<button
							className={styles.sortFieldBtn}
							onClick={() => setShowPrimaryDropdown(!showPrimaryDropdown)}
						>
							<GripVertical size={12} className={styles.dragHandle} />
							<PrimaryIcon size={14} />
							<span>{primaryField?.label}</span>
							<ChevronDown size={14} />
						</button>
						<button
							className={styles.directionBtn}
							onClick={handlePrimaryDirectionToggle}
							title={
								sortConfig.primary.direction === "asc"
									? "Ascending"
									: "Descending"
							}
						>
							{sortConfig.primary.direction === "asc" ? (
								<ArrowUp size={14} />
							) : (
								<ArrowDown size={14} />
							)}
						</button>
					</div>

					{showPrimaryDropdown && (
						<div className={styles.dropdown}>
							{SORT_FIELDS.map((field) => (
								<button
									key={field.value}
									className={`${styles.dropdownItem} ${
										sortConfig.primary.field === field.value
											? styles.selected
											: ""
									}`}
									onClick={() => handlePrimaryFieldChange(field.value)}
								>
									<field.icon size={14} />
									<div className={styles.dropdownItemText}>
										<span>{field.label}</span>
										<span className={styles.dropdownItemDesc}>
											{field.description}
										</span>
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Secondary Sort */}
				{sortConfig.secondary ? (
					<div className={styles.sortGroup} ref={secondaryRef}>
						<span className={styles.thenBy}>then</span>
						<div className={styles.sortSelector}>
							<button
								className={styles.sortFieldBtn}
								onClick={() => setShowSecondaryDropdown(!showSecondaryDropdown)}
							>
								<SecondaryIcon size={14} />
								<span>{secondaryField?.label}</span>
								<ChevronDown size={14} />
							</button>
							<button
								className={styles.directionBtn}
								onClick={handleSecondaryDirectionToggle}
								title={
									sortConfig.secondary.direction === "asc"
										? "Ascending"
										: "Descending"
								}
							>
								{sortConfig.secondary.direction === "asc" ? (
									<ArrowUp size={14} />
								) : (
									<ArrowDown size={14} />
								)}
							</button>
							<button
								className={styles.removeBtn}
								onClick={handleRemoveSecondary}
								title="Remove secondary sort"
							>
								<X size={14} />
							</button>
						</div>

						{showSecondaryDropdown && (
							<div className={styles.dropdown}>
								{SORT_FIELDS.filter(
									(f) => f.value !== sortConfig.primary.field
								).map((field) => (
									<button
										key={field.value}
										className={`${styles.dropdownItem} ${
											sortConfig.secondary?.field === field.value
												? styles.selected
												: ""
										}`}
										onClick={() => handleSecondaryFieldChange(field.value)}
									>
										<field.icon size={14} />
										<div className={styles.dropdownItemText}>
											<span>{field.label}</span>
											<span className={styles.dropdownItemDesc}>
												{field.description}
											</span>
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				) : (
					<div ref={secondaryRef}>
						<button
							className={styles.addSecondary}
							onClick={() => setShowSecondaryDropdown(true)}
						>
							<Plus size={14} />
							<span>Add sort</span>
						</button>

						{showSecondaryDropdown && (
							<div className={styles.dropdown}>
								{SORT_FIELDS.filter(
									(f) => f.value !== sortConfig.primary.field
								).map((field) => (
									<button
										key={field.value}
										className={styles.dropdownItem}
										onClick={(e) => {
											e.stopPropagation();
											handleSecondaryFieldChange(field.value);
										}}
									>
										<field.icon size={14} />
										<div className={styles.dropdownItemText}>
											<span>{field.label}</span>
											<span className={styles.dropdownItemDesc}>
												{field.description}
											</span>
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Tiebreaker */}
				<div className={styles.tiebreakerGroup} ref={tiebreakerRef}>
					<span className={styles.thenBy}>ties:</span>
					<button
						className={styles.tiebreakerBtn}
						onClick={() => setShowTiebreakerDropdown(!showTiebreakerDropdown)}
					>
						<TiebreakerIcon
							size={14}
							fill={
								sortConfig.tiebreaker === "starred" ? "currentColor" : "none"
							}
						/>
						<span>{tiebreaker?.label}</span>
						<ChevronDown size={14} />
					</button>

					{showTiebreakerDropdown && (
						<div className={styles.dropdown}>
							{TIEBREAKERS.map((tb) => (
								<button
									key={tb.value}
									className={`${styles.dropdownItem} ${
										sortConfig.tiebreaker === tb.value ? styles.selected : ""
									}`}
									onClick={() => handleTiebreakerChange(tb.value)}
								>
									<tb.icon
										size={14}
										fill={tb.value === "starred" ? "currentColor" : "none"}
									/>
									<span>{tb.label}</span>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
