import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
	X,
	FileText,
	AlignLeft,
	Calendar,
	Tag,
	MapPin,
	Star,
	Flag,
	List,
	UserPlus,
	ChevronDown,
	User,
	Plus,
} from "lucide-react";
import Input from "../shared/Input";
import Select from "../shared/Select";
import Button from "../shared/Button";
import type {
	TaskRequest,
	TaskPriority,
	TaskList,
	Verifier,
} from "../../types";
import { api } from "../../utils/api";
import {
	getUserTimezone,
	getMinDateTime,
	formatForBackend,
} from "../../utils/timezone";
import styles from "./CreateTaskModal.module.css";

interface CreateTaskModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	selectedListId?: number | null;
	onOpenVerifiersModal?: () => void;
	onOpenCreateListModal?: () => void;
	refreshVerifiersKey?: number;
	newlyCreatedListId?: number | null;
	refreshListsKey?: number;
	newlyAddedVerifierEmail?: string | null;
	removedVerifierEmail?: string | null;
}

interface FormErrors {
	title?: string;
	deadline?: string;
	verifierEmail?: string;
}

const priorityOptions = [
	{ value: "LOW", label: "Low" },
	{ value: "MEDIUM", label: "Medium" },
	{ value: "HIGH", label: "High" },
	{ value: "CRITICAL", label: "Critical" },
];

export default function CreateTaskModal({
	isOpen,
	onClose,
	onSuccess,
	selectedListId,
	onOpenVerifiersModal,
	onOpenCreateListModal,
	refreshVerifiersKey,
	newlyCreatedListId,
	refreshListsKey,
	newlyAddedVerifierEmail,
	removedVerifierEmail,
}: CreateTaskModalProps) {
	const [formData, setFormData] = useState<TaskRequest>({
		title: "",
		description: "",
		deadline: "",
		verifierEmail: "",
		tags: "",
		listId: selectedListId ?? undefined,
		priority: "MEDIUM",
		location: "",
		starred: false,
	});

	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [serverError, setServerError] = useState<string | undefined>();
	const [lists, setLists] = useState<TaskList[]>([]);
	const [savedVerifiers, setSavedVerifiers] = useState<Verifier[]>([]);
	const [showVerifierDropdown, setShowVerifierDropdown] = useState(false);
	const [showListDropdown, setShowListDropdown] = useState(false);

	useEffect(() => {
		if (isOpen) {
			// Load lists
			api
				.get<TaskList[]>("/lists")
				.then((data) => {
					setLists(data);
					// If a newly created list ID is provided, select it
					if (newlyCreatedListId) {
						setFormData((prev) => ({
							...prev,
							listId: newlyCreatedListId,
						}));
					} else if (selectedListId !== undefined && selectedListId !== null) {
						// Set selected list ID if provided
						setFormData((prev) => ({
							...prev,
							listId: selectedListId,
						}));
					} else {
						// Set default list if no list is selected
						const defaultList = data.find((l) => l.isDefault);
						if (defaultList) {
							setFormData((prev) => ({
								...prev,
								listId: defaultList.id,
							}));
						}
					}
				})
				.catch(() => {});

			// Load saved verifiers
			api
				.get<Verifier[]>("/verifiers")
				.then((data) => {
					setSavedVerifiers(data);
				})
				.catch(() => {});
		}
	}, [
		isOpen,
		selectedListId,
		refreshVerifiersKey,
		newlyCreatedListId,
		refreshListsKey,
	]);

	// Handle newly added verifier - auto-select it
	useEffect(() => {
		if (newlyAddedVerifierEmail && isOpen) {
			setFormData((prev) => ({
				...prev,
				verifierEmail: newlyAddedVerifierEmail,
			}));
		}
	}, [newlyAddedVerifierEmail, isOpen]);

	// Handle removed verifier - clear selection if it was selected
	useEffect(() => {
		if (removedVerifierEmail && isOpen) {
			setFormData((prev) => {
				if (prev.verifierEmail === removedVerifierEmail) {
					return { ...prev, verifierEmail: "" };
				}
				return prev;
			});
		}
	}, [removedVerifierEmail, isOpen]);

	const validateField = (name: string, value: string): string | undefined => {
		switch (name) {
			case "title":
				if (!value.trim()) return "Title is required";
				if (value.trim().length < 3)
					return "Title must be at least 3 characters";
				return undefined;
			case "deadline": {
				if (!value) return "Deadline is required";
				const deadlineDate = new Date(value);
				if (deadlineDate <= new Date()) return "Deadline must be in the future";
				return undefined;
			}
			case "verifierEmail": {
				if (!value.trim()) return "Verifier email is required";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "Please enter a valid email";
				return undefined;
			}
			default:
				return undefined;
		}
	};

	const handleChange = (
		name: keyof TaskRequest,
		value: string | boolean | number | undefined
	) => {
		if (name === "listId") {
			const numValue = value ? Number(value) : undefined;
			setFormData((prev) => ({ ...prev, [name]: numValue }));
		} else {
			setFormData((prev) => ({ ...prev, [name]: value }));
		}
		if (touched[name] && typeof value === "string") {
			setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
		}
	};

	const handleBlur = (name: keyof TaskRequest) => {
		setTouched((prev) => ({ ...prev, [name]: true }));
		const value = formData[name];
		if (typeof value === "string") {
			setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		// Validate required fields
		const newErrors: FormErrors = {};
		(["title", "deadline", "verifierEmail"] as const).forEach((key) => {
			const value = formData[key];
			if (typeof value === "string") {
				const error = validateField(key, value);
				if (error) newErrors[key] = error;
			}
		});

		setErrors(newErrors);
		setTouched({ title: true, deadline: true, verifierEmail: true });

		if (Object.keys(newErrors).length > 0) return;

		setIsLoading(true);
		setServerError(undefined);

		try {
			// Format deadline for backend (user's timezone is preserved in the datetime string)
			const payload: TaskRequest = {
				...formData,
				deadline: formatForBackend(formData.deadline),
			};

			await api.post("/tasks", payload);
			onSuccess();
			handleClose();
		} catch (err) {
			setServerError(
				err instanceof Error ? err.message : "Failed to create task"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setFormData({
			title: "",
			description: "",
			deadline: "",
			verifierEmail: "",
			tags: "",
			listId: selectedListId ?? undefined,
			priority: "MEDIUM",
			location: "",
			starred: false,
		});
		setErrors({});
		setTouched({});
		setServerError(undefined);
		setShowVerifierDropdown(false);
		setShowListDropdown(false);
		onClose();
	};

	const selectVerifier = (verifier: Verifier) => {
		handleChange("verifierEmail", verifier.email);
		setShowVerifierDropdown(false);
	};

	if (!isOpen) return null;

	// Get minimum datetime (now + 1 minute) in user's timezone
	const userTimezone = getUserTimezone();
	const minDateTime = getMinDateTime(1);

	return (
		<div className={styles.overlay} onClick={handleClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<h2>Create New Task</h2>
					<p>Set up a new accountability contract with a trusted verifier.</p>
					<button className={styles.closeButton} onClick={handleClose}>
						<X size={20} />
					</button>
				</div>

				<form className={styles.form} onSubmit={handleSubmit}>
					{serverError && (
						<div className={styles.serverError}>{serverError}</div>
					)}

					<Input
						label="Title *"
						type="text"
						placeholder="What do you commit to doing?"
						icon={FileText}
						value={formData.title}
						onChange={(e) => handleChange("title", e.target.value)}
						onBlur={() => handleBlur("title")}
						error={touched.title ? errors.title : undefined}
						disabled={isLoading}
					/>

					<div className={styles.textareaWrapper}>
						<label className={styles.label}>
							<AlignLeft size={18} />
							Description
						</label>
						<textarea
							className={styles.textarea}
							placeholder="Add more details about your task..."
							value={formData.description}
							onChange={(e) => handleChange("description", e.target.value)}
							disabled={isLoading}
							rows={3}
						/>
					</div>

					<div className={styles.row}>
						<div className={styles.inputWrapper}>
							<label className={styles.label}>
								<Calendar size={18} />
								Deadline *
								<span className={styles.timezoneHint}>
									({userTimezone.replace(/_/g, " ")})
								</span>
							</label>
							<input
								type="datetime-local"
								className={`${styles.datetimeInput} ${
									touched.deadline && errors.deadline ? styles.hasError : ""
								}`}
								value={formData.deadline}
								onChange={(e) => handleChange("deadline", e.target.value)}
								onBlur={() => handleBlur("deadline")}
								min={minDateTime}
								disabled={isLoading}
							/>
							{touched.deadline && errors.deadline && (
								<span className={styles.error}>{errors.deadline}</span>
							)}
						</div>

						<Select
							label="Priority"
							icon={Flag}
							options={priorityOptions}
							value={formData.priority}
							onChange={(e) =>
								handleChange("priority", e.target.value as TaskPriority)
							}
							disabled={isLoading}
						/>
					</div>

					{/* Verifier Selection */}
					<div className={styles.verifierSection}>
						<label className={styles.label}>
							<User size={18} />
							Verifier *
						</label>

						<div className={styles.verifierDropdownWrapper}>
							<button
								type="button"
								className={`${styles.verifierDropdownTrigger} ${
									touched.verifierEmail && errors.verifierEmail
										? styles.hasError
										: ""
								}`}
								onClick={() => setShowVerifierDropdown(!showVerifierDropdown)}
								disabled={isLoading}
							>
								{formData.verifierEmail ? (
									<span className={styles.selectedVerifier}>
										{savedVerifiers.find(
											(v) => v.email === formData.verifierEmail
										)?.fullName || formData.verifierEmail}
									</span>
								) : (
									<span className={styles.placeholderText}>
										Select a verifier...
									</span>
								)}
								<ChevronDown
									size={18}
									className={showVerifierDropdown ? styles.rotated : ""}
								/>
							</button>

							{showVerifierDropdown && (
								<div className={styles.verifierDropdown}>
									{savedVerifiers.map((verifier) => (
										<button
											key={verifier.id}
											type="button"
											className={`${styles.verifierOption} ${
												formData.verifierEmail === verifier.email
													? styles.selected
													: ""
											}`}
											onClick={() => selectVerifier(verifier)}
										>
											<div className={styles.verifierAvatar}>
												{verifier.fullName
													.split(" ")
													.map((n) => n[0])
													.join("")
													.toUpperCase()}
											</div>
											<div className={styles.verifierInfo}>
												<span className={styles.verifierName}>
													{verifier.fullName}
												</span>
												<span className={styles.verifierEmail}>
													{verifier.email}
												</span>
											</div>
										</button>
									))}
									{savedVerifiers.length > 0 && (
										<div className={styles.verifierDropdownDivider} />
									)}
									<button
										type="button"
										className={styles.addVerifierOption}
										onClick={() => {
											setShowVerifierDropdown(false);
											onOpenVerifiersModal?.();
										}}
									>
										<UserPlus size={16} />
										Add New Verifier
									</button>
								</div>
							)}
							{touched.verifierEmail && errors.verifierEmail && (
								<span className={styles.error}>{errors.verifierEmail}</span>
							)}
						</div>
					</div>

					<div className={styles.row}>
						<div className={styles.inputWrapper}>
							<label className={styles.label}>
								<Tag size={18} />
								Tags
							</label>
							<input
								type="text"
								className={styles.tagsInput}
								placeholder="e.g., gym, health, daily (comma separated)"
								value={formData.tags}
								onChange={(e) => handleChange("tags", e.target.value)}
								disabled={isLoading}
							/>
							<span className={styles.helperText}>
								Separate multiple tags with commas
							</span>
						</div>

						<div className={styles.inputWrapper}>
							<label className={styles.label}>
								<List size={18} />
								List
							</label>
							<div className={styles.listDropdownWrapper}>
								<button
									type="button"
									className={styles.listDropdownTrigger}
									onClick={() => setShowListDropdown(!showListDropdown)}
									disabled={isLoading}
								>
									<span>
										{formData.listId
											? lists.find((l) => l.id === formData.listId)?.name ||
											  "Select list..."
											: lists.find((l) => l.isDefault)?.name ||
											  "Select list..."}
									</span>
									<ChevronDown
										size={18}
										className={showListDropdown ? styles.rotated : ""}
									/>
								</button>

								{showListDropdown && (
									<div className={styles.listDropdown}>
										{lists.map((list) => (
											<button
												key={list.id}
												type="button"
												className={`${styles.listOption} ${
													formData.listId === list.id ||
													(!formData.listId && list.isDefault)
														? styles.selected
														: ""
												}`}
												onClick={() => {
													handleChange("listId", String(list.id));
													setShowListDropdown(false);
												}}
											>
												{list.name}
												{list.isDefault && (
													<span className={styles.defaultBadge}>Default</span>
												)}
											</button>
										))}
										<div className={styles.listDropdownDivider} />
										<button
											type="button"
											className={styles.createListOption}
											onClick={() => {
												setShowListDropdown(false);
												onOpenCreateListModal?.();
											}}
										>
											<Plus size={16} />
											Create New List
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className={styles.row}>
						<Input
							label="Location"
							type="text"
							placeholder="Optional"
							icon={MapPin}
							value={formData.location}
							onChange={(e) => handleChange("location", e.target.value)}
							disabled={isLoading}
						/>
						<div style={{ flex: 1 }} />
					</div>

					<label className={styles.checkbox}>
						<input
							type="checkbox"
							checked={formData.starred}
							onChange={(e) => handleChange("starred", e.target.checked)}
							disabled={isLoading}
						/>
						<Star size={16} />
						<span>Mark as starred (high importance)</span>
					</label>

					<div className={styles.actions}>
						<Button
							type="button"
							variant="secondary"
							onClick={handleClose}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" isLoading={isLoading}>
							Create Task
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
