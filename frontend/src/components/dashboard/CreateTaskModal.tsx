import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
	X,
	FileText,
	AlignLeft,
	Calendar,
	Mail,
	Tag,
	MapPin,
	Star,
	Flag,
	List,
} from "lucide-react";
import Input from "../shared/Input";
import Select from "../shared/Select";
import Button from "../shared/Button";
import type { TaskRequest, TaskPriority, TaskList } from "../../types";
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

	useEffect(() => {
		if (isOpen) {
			// Load lists
			api
				.get<TaskList[]>("/lists")
				.then((data) => {
					setLists(data);
					// Set default list if no list is selected
					if (selectedListId === undefined || selectedListId === null) {
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

			// Set selected list ID if provided
			if (selectedListId !== undefined && selectedListId !== null) {
				setFormData((prev) => ({
					...prev,
					listId: selectedListId,
				}));
			}
		}
	}, [isOpen, selectedListId]);

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
		onClose();
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

					<Input
						label="Verifier Email *"
						type="email"
						placeholder="Who will verify your completion?"
						icon={Mail}
						value={formData.verifierEmail}
						onChange={(e) => handleChange("verifierEmail", e.target.value)}
						onBlur={() => handleBlur("verifierEmail")}
						error={touched.verifierEmail ? errors.verifierEmail : undefined}
						helperText="This person must have a CoSign account"
						disabled={isLoading}
					/>

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

						<Select
							label="List"
							icon={List}
							options={lists.map((l) => ({
								value: String(l.id),
								label: l.name,
							}))}
							value={
								formData.listId
									? String(formData.listId)
									: lists.find((l) => l.isDefault)?.id?.toString() || ""
							}
							onChange={(e) =>
								handleChange("listId", e.target.value ? e.target.value : "")
							}
							disabled={isLoading}
						/>
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
