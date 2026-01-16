import { useState, useMemo, useEffect, useRef } from "react";
import { Repeat, X, Calendar, Hash } from "lucide-react";
import { RRule, Weekday } from "rrule";
import {
	saveRepeatDraft,
	loadRepeatDraft,
	clearRepeatDraft,
	type RepeatFrequency,
	type RepeatEndType,
} from "../../utils/persistence";
import styles from "./RecurrenceSelector.module.css";

interface RecurrenceSelectorProps {
	value?: string; // Current RRULE string
	onChange: (rrule: string | undefined) => void;
	disabled?: boolean;
	showClearButton?: boolean; // Show/hide the X button to clear the value
	// URL tracking props
	isModalOpen?: boolean; // Controlled from parent via URL
	onModalOpenChange?: (open: boolean) => void; // Notify parent of open state changes
}

type Frequency = RepeatFrequency;
type EndType = RepeatEndType;

const WEEKDAYS = [
	{ key: "MO", label: "Mon", rrule: RRule.MO },
	{ key: "TU", label: "Tue", rrule: RRule.TU },
	{ key: "WE", label: "Wed", rrule: RRule.WE },
	{ key: "TH", label: "Thu", rrule: RRule.TH },
	{ key: "FR", label: "Fri", rrule: RRule.FR },
	{ key: "SA", label: "Sat", rrule: RRule.SA },
	{ key: "SU", label: "Sun", rrule: RRule.SU },
];

// Parse an RRULE string back into component state
function parseRRule(rruleStr: string | undefined): {
	frequency: Frequency;
	interval: number;
	weekdays: string[];
	endType: EndType;
	endDate: string;
	count: number;
} {
	const defaults = {
		frequency: "none" as Frequency,
		interval: 1,
		weekdays: [] as string[],
		endType: "never" as EndType,
		endDate: "",
		count: 10,
	};

	if (!rruleStr) return defaults;

	try {
		const cleanRule = rruleStr.toUpperCase().startsWith("RRULE:")
			? rruleStr.substring(6)
			: rruleStr;

		const rule = RRule.fromString(`RRULE:${cleanRule}`);
		const options = rule.origOptions;

		let frequency: Frequency = "none";
		switch (options.freq) {
			case RRule.DAILY:
				frequency = "daily";
				break;
			case RRule.WEEKLY:
				frequency = "weekly";
				break;
			case RRule.MONTHLY:
				frequency = "monthly";
				break;
			case RRule.YEARLY:
				frequency = "yearly";
				break;
		}

		const weekdays: string[] = [];
		if (options.byweekday) {
			const byweekday = Array.isArray(options.byweekday)
				? options.byweekday
				: [options.byweekday];
			byweekday.forEach((wd) => {
				if (typeof wd === "number") {
					weekdays.push(WEEKDAYS[wd].key);
				} else if (wd instanceof Weekday) {
					weekdays.push(WEEKDAYS[wd.weekday].key);
				}
			});
		}

		let endType: EndType = "never";
		let endDate = "";
		let count = 10;

		if (options.until) {
			endType = "date";
			const d = new Date(options.until);
			endDate = d.toISOString().split("T")[0];
		} else if (options.count) {
			endType = "count";
			count = options.count;
		}

		return {
			frequency,
			interval: options.interval || 1,
			weekdays,
			endType,
			endDate,
			count,
		};
	} catch {
		return defaults;
	}
}

export default function RecurrenceSelector({
	value,
	onChange,
	disabled = false,
	showClearButton = true,
	isModalOpen: controlledIsOpen,
	onModalOpenChange,
}: RecurrenceSelectorProps) {
	const parsed = useMemo(() => parseRRule(value), [value]);

	const [frequency, setFrequency] = useState<Frequency>(parsed.frequency);
	const [intervalVal, setIntervalVal] = useState(parsed.interval);
	const [weekdays, setWeekdays] = useState<string[]>(parsed.weekdays);
	const [endType, setEndType] = useState<EndType>(parsed.endType);
	const [endDate, setEndDate] = useState(parsed.endDate);
	const [count, setCount] = useState(parsed.count);
	const [internalIsOpen, setInternalIsOpen] = useState(false);
	const [lastPropValue, setLastPropValue] = useState(value);
	const saveDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

	// Use controlled state if provided, otherwise use internal state
	const isOpen =
		controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
	const setIsOpen = (open: boolean) => {
		if (onModalOpenChange) {
			onModalOpenChange(open);
		} else {
			setInternalIsOpen(open);
		}
	};

	// Store state when modal opens so we can revert on cancel
	const [savedState, setSavedState] = useState<{
		frequency: Frequency;
		intervalVal: number;
		weekdays: string[];
		endType: EndType;
		endDate: string;
		count: number;
	} | null>(null);

	// Track previous isOpen state for detecting open/close transitions
	const [wasOpen, setWasOpen] = useState(false);
	const [draftLoaded, setDraftLoaded] = useState(false);

	// Sync state when value prop changes (e.g., editing existing task)
	if (value !== lastPropValue) {
		const p = parseRRule(value);
		setFrequency(p.frequency);
		setIntervalVal(p.interval);
		setWeekdays(p.weekdays);
		setEndType(p.endType);
		setEndDate(p.endDate);
		setCount(p.count);
		setLastPropValue(value);
	}

	// Detect modal open transition in controlled mode and load draft
	if (isOpen && controlledIsOpen !== undefined && !wasOpen && !draftLoaded) {
		setWasOpen(true);
		setDraftLoaded(true);
		const draft = loadRepeatDraft();
		if (draft) {
			setFrequency(draft.frequency);
			setIntervalVal(draft.interval);
			setWeekdays(draft.weekdays);
			setEndType(draft.endType);
			setEndDate(draft.endDate);
			setCount(draft.count);
			// Save the original state for cancel
			setSavedState({
				frequency: parsed.frequency,
				intervalVal: parsed.interval,
				weekdays: [...parsed.weekdays],
				endType: parsed.endType,
				endDate: parsed.endDate,
				count: parsed.count,
			});
		} else {
			// No draft, save current state for cancel
			setSavedState({
				frequency,
				intervalVal,
				weekdays: [...weekdays],
				endType,
				endDate,
				count,
			});
		}
	}

	// Detect modal close transition
	if (!isOpen && wasOpen) {
		setWasOpen(false);
		setDraftLoaded(false);
	}

	// Auto-save draft on state changes when modal is open (debounced)
	useEffect(() => {
		if (!isOpen) return;

		if (saveDraftTimeoutRef.current) {
			clearTimeout(saveDraftTimeoutRef.current);
		}

		saveDraftTimeoutRef.current = setTimeout(() => {
			saveRepeatDraft({
				frequency,
				interval: intervalVal,
				weekdays,
				endType,
				endDate,
				count,
			});
		}, 300); // Save after 300ms of inactivity

		return () => {
			if (saveDraftTimeoutRef.current) {
				clearTimeout(saveDraftTimeoutRef.current);
			}
		};
	}, [isOpen, frequency, intervalVal, weekdays, endType, endDate, count]);

	// Save state when modal opens
	const handleOpen = () => {
		if (!disabled) {
			setSavedState({
				frequency,
				intervalVal,
				weekdays: [...weekdays],
				endType,
				endDate,
				count,
			});
			setIsOpen(true);
		}
	};

	// Cancel and revert to saved state
	const handleCancel = () => {
		if (savedState) {
			setFrequency(savedState.frequency);
			setIntervalVal(savedState.intervalVal);
			setWeekdays(savedState.weekdays);
			setEndType(savedState.endType);
			setEndDate(savedState.endDate);
			setCount(savedState.count);
		}
		setSavedState(null);
		clearRepeatDraft();
		setIsOpen(false);
	};

	// Build RRULE string from current state
	const buildRRule = (): string | undefined => {
		if (frequency === "none") return undefined;

		const options: Partial<{
			freq: number;
			interval: number;
			byweekday: Weekday[];
			until: Date;
			count: number;
		}> = {};

		switch (frequency) {
			case "daily":
				options.freq = RRule.DAILY;
				break;
			case "weekly":
				options.freq = RRule.WEEKLY;
				break;
			case "monthly":
				options.freq = RRule.MONTHLY;
				break;
			case "yearly":
				options.freq = RRule.YEARLY;
				break;
		}

		if (intervalVal > 1) {
			options.interval = intervalVal;
		}

		// Add weekdays for weekly frequency
		if (frequency === "weekly" && weekdays.length > 0) {
			options.byweekday = weekdays.map(
				(wd) => WEEKDAYS.find((w) => w.key === wd)!.rrule
			);
		}

		// Handle end condition
		if (endType === "date" && endDate) {
			options.until = new Date(endDate + "T23:59:59Z");
		} else if (endType === "count" && count > 0) {
			options.count = count;
		}

		const rule = new RRule(options);
		// Return just the rule part without "RRULE:" prefix
		return rule.toString().replace("RRULE:", "");
	};

	const handleApply = () => {
		const rrule = buildRRule();
		onChange(rrule);
		setSavedState(null);
		clearRepeatDraft();
		setIsOpen(false);
	};

	const handleClear = () => {
		setFrequency("none");
		setIntervalVal(1);
		setWeekdays([]);
		setEndType("never");
		setEndDate("");
		setCount(10);
		onChange(undefined);
		setSavedState(null);
		clearRepeatDraft();
		setIsOpen(false);
	};

	const toggleWeekday = (day: string) => {
		setWeekdays((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
		);
	};

	// Generate human-readable summary
	const getSummary = (): string => {
		if (!value || frequency === "none") return "Does not repeat";

		let summary = "";

		// Frequency part
		if (intervalVal === 1) {
			switch (frequency) {
				case "daily":
					summary = "Daily";
					break;
				case "weekly":
					summary = "Weekly";
					break;
				case "monthly":
					summary = "Monthly";
					break;
				case "yearly":
					summary = "Yearly";
					break;
			}
		} else {
			switch (frequency) {
				case "daily":
					summary = `Every ${intervalVal} days`;
					break;
				case "weekly":
					summary = `Every ${intervalVal} weeks`;
					break;
				case "monthly":
					summary = `Every ${intervalVal} months`;
					break;
				case "yearly":
					summary = `Every ${intervalVal} years`;
					break;
			}
		}

		// Weekdays for weekly
		if (frequency === "weekly" && weekdays.length > 0 && weekdays.length < 7) {
			const dayLabels = weekdays
				.map((wd) => WEEKDAYS.find((w) => w.key === wd)?.label)
				.filter(Boolean);
			summary += ` on ${dayLabels.join(", ")}`;
		}

		// End condition
		if (endType === "date" && endDate) {
			const d = new Date(endDate);
			summary += `, until ${d.toLocaleDateString()}`;
		} else if (endType === "count" && count > 0) {
			summary += `, ${count} times`;
		}

		return summary;
	};

	// Get minimum date for end date picker (today)
	const minEndDate = new Date().toISOString().split("T")[0];

	return (
		<div className={styles.container}>
			<button
				type="button"
				className={`${styles.trigger} ${value ? styles.hasValue : ""}`}
				onClick={handleOpen}
				disabled={disabled}
			>
				<Repeat size={18} />
				<span className={styles.summary}>{getSummary()}</span>
				{value && showClearButton && (
					<button
						type="button"
						className={styles.clearButton}
						onClick={(e) => {
							e.stopPropagation();
							handleClear();
						}}
						disabled={disabled}
					>
						<X size={14} />
					</button>
				)}
			</button>

			{isOpen && (
				<div className={styles.overlay} onClick={handleCancel}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.header}>
							<h3>
								<Repeat size={20} />
								Repeat Task
							</h3>
							<button
								type="button"
								className={styles.closeButton}
								onClick={handleCancel}
							>
								<X size={20} />
							</button>
						</div>

						<div className={styles.body}>
							{/* Frequency Selection */}
							<div className={styles.field}>
								<label>Repeats</label>
								<select
									value={frequency}
									onChange={(e) => setFrequency(e.target.value as Frequency)}
									className={styles.select}
								>
									<option value="none">Does not repeat</option>
									<option value="daily">Daily</option>
									<option value="weekly">Weekly</option>
									<option value="monthly">Monthly</option>
									<option value="yearly">Yearly</option>
								</select>
							</div>

							{frequency !== "none" && (
								<>
									{/* Interval */}
									<div className={styles.field}>
										<label>Every</label>
										<div className={styles.intervalRow}>
											<input
												type="number"
												min={1}
												max={99}
												value={intervalVal}
												onChange={(e) =>
													setIntervalVal(
														Math.max(1, parseInt(e.target.value) || 1)
													)
												}
												className={styles.intervalInput}
											/>
											<span className={styles.intervalLabel}>
												{frequency === "daily" &&
													(intervalVal === 1 ? "day" : "days")}
												{frequency === "weekly" &&
													(intervalVal === 1 ? "week" : "weeks")}
												{frequency === "monthly" &&
													(intervalVal === 1 ? "month" : "months")}
												{frequency === "yearly" &&
													(intervalVal === 1 ? "year" : "years")}
											</span>
										</div>
									</div>

									{/* Weekday Selection (for weekly) */}
									{frequency === "weekly" && (
										<div className={styles.field}>
											<label>On these days</label>
											<div className={styles.weekdayGrid}>
												{WEEKDAYS.map((day) => (
													<button
														key={day.key}
														type="button"
														className={`${styles.weekdayButton} ${
															weekdays.includes(day.key) ? styles.selected : ""
														}`}
														onClick={() => toggleWeekday(day.key)}
													>
														{day.label}
													</button>
												))}
											</div>
											<p className={styles.hint}>
												Leave empty to repeat on the same day each week
											</p>
										</div>
									)}

									{/* End Condition */}
									<div className={styles.field}>
										<label>Ends</label>
										<div className={styles.endOptions}>
											<label className={styles.radioOption}>
												<input
													type="radio"
													name="endType"
													checked={endType === "never"}
													onChange={() => setEndType("never")}
												/>
												<span>Never</span>
											</label>

											<label className={styles.radioOption}>
												<input
													type="radio"
													name="endType"
													checked={endType === "date"}
													onChange={() => setEndType("date")}
												/>
												<Calendar size={16} />
												<span>On date</span>
											</label>
											{endType === "date" && (
												<input
													type="date"
													value={endDate}
													onChange={(e) => setEndDate(e.target.value)}
													min={minEndDate}
													className={styles.dateInput}
												/>
											)}

											<label className={styles.radioOption}>
												<input
													type="radio"
													name="endType"
													checked={endType === "count"}
													onChange={() => setEndType("count")}
												/>
												<Hash size={16} />
												<span>After</span>
											</label>
											{endType === "count" && (
												<div className={styles.countRow}>
													<input
														type="number"
														min={1}
														max={999}
														value={count}
														onChange={(e) =>
															setCount(
																Math.max(1, parseInt(e.target.value) || 1)
															)
														}
														className={styles.countInput}
													/>
													<span>occurrences</span>
												</div>
											)}
										</div>
									</div>
								</>
							)}
						</div>

						<div className={styles.footer}>
							<button
								type="button"
								className={styles.clearBtn}
								onClick={handleClear}
							>
								Clear
							</button>
							<button
								type="button"
								className={styles.applyBtn}
								onClick={handleApply}
							>
								Apply
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
