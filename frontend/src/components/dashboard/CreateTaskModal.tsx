import { useState, useEffect, useRef, useCallback } from "react";
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
	Lock,
} from "lucide-react";
import { toast } from "react-toastify";
import Input from "../shared/Input";
import Select from "../shared/Select";
import Button from "../shared/Button";
import RichTextEditor from "../shared/RichTextEditor";
import FileUploader from "../shared/FileUploader";
import type { UploadedFile } from "../shared/FileUploader";
import OnlineStatusIndicator from "../shared/OnlineStatusIndicator";
import RecurrenceSelector from "./RecurrenceSelector";
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
import { useWebSocket } from "../../context/useWebSocket";
import type {
	SocketMessage,
	UserStatusPayload,
} from "../../context/websocket.types";
import {
	saveTaskDraft,
	loadTaskDraft,
	clearTaskDraft,
} from "../../utils/persistence";
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
	// Repeat modal URL tracking
	isRepeatModalOpen?: boolean;
	onRepeatModalOpenChange?: (open: boolean) => void;
}

interface FormErrors {
	title?: string;
	deadline?: string;
	verifierEmail?: string;
	penaltyContent?: string;
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
	isRepeatModalOpen,
	onRepeatModalOpenChange,
}: CreateTaskModalProps) {
	const { subscribe } = useWebSocket();
	const draftLoadedRef = useRef(false);
	const saveDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	// Subscribe to user status changes for real-time online indicator updates
	useEffect(() => {
		if (!isOpen) return;

		const handleMessage = (message: SocketMessage) => {
			if (message.type !== "USER_STATUS") return;
			const payload = message.payload as UserStatusPayload;
			setSavedVerifiers((prev) =>
				prev.map((verifier) =>
					verifier.id === payload.userId
						? { ...verifier, isOnline: payload.isOnline }
						: verifier,
				),
			);
		};

		const unsubscribe = subscribe(handleMessage);
		return unsubscribe;
	}, [isOpen, subscribe]);

	const getInitialFormData = useCallback(
		(): TaskRequest => ({
			title: "",
			description: "",
			deadline: "",
			verifierEmail: "",
			tags: "",
			listId: selectedListId ?? undefined,
			priority: "MEDIUM",
			location: "",
			repeatPattern: undefined,
			starred: false,
			penaltyContent: "",
		}),
		[selectedListId],
	);

	const [formData, setFormData] = useState<TaskRequest>(getInitialFormData);
	const [penaltyFiles, setPenaltyFiles] = useState<UploadedFile[]>([]);

	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [serverError, setServerError] = useState<string | undefined>();
	const [lists, setLists] = useState<TaskList[]>([]);
	const [savedVerifiers, setSavedVerifiers] = useState<Verifier[]>([]);
	const [showVerifierDropdown, setShowVerifierDropdown] = useState(false);
	const [showListDropdown, setShowListDropdown] = useState(false);
	const [hasDraft, setHasDraft] = useState(false);

	// Load draft when modal opens
	useEffect(() => {
		if (isOpen && !draftLoadedRef.current) {
			const draft = loadTaskDraft();
			if (draft) {
				setFormData({
					title: draft.title,
					description: draft.description,
					deadline: draft.deadline,
					verifierEmail: draft.verifierEmail,
					tags: draft.tags,
					listId: draft.listId,
					priority: draft.priority as TaskPriority,
					location: draft.location,
					repeatPattern: draft.repeatPattern,
					starred: draft.starred,
					penaltyContent: draft.penaltyContent || "",
				});
				setHasDraft(true);
				toast.info("📝 Draft restored", { icon: false, autoClose: 2000 });
			}
			draftLoadedRef.current = true;
		}
		if (!isOpen) {
			draftLoadedRef.current = false;
		}
	}, [isOpen]);

	// Auto-save draft on form changes (debounced)
	useEffect(() => {
		if (!isOpen) return;

		// Only save if there's meaningful content
		const hasContent =
			formData.title.trim() ||
			formData.description?.trim() ||
			formData.tags?.trim() ||
			formData.penaltyContent?.trim();
		if (!hasContent) return;

		if (saveDraftTimeoutRef.current) {
			clearTimeout(saveDraftTimeoutRef.current);
		}

		saveDraftTimeoutRef.current = setTimeout(() => {
			saveTaskDraft({
				title: formData.title,
				description: formData.description || "",
				deadline: formData.deadline,
				verifierEmail: formData.verifierEmail,
				tags: formData.tags || "",
				listId: formData.listId,
				priority: formData.priority || "MEDIUM",
				location: formData.location || "",
				repeatPattern: formData.repeatPattern,
				starred: formData.starred ?? false,
				penaltyContent: formData.penaltyContent || "",
			});
		}, 1000); // Save after 1s of inactivity

		return () => {
			if (saveDraftTimeoutRef.current) {
				clearTimeout(saveDraftTimeoutRef.current);
			}
		};
	}, [isOpen, formData]);

	// Function to clear draft and reset form
	const clearDraftAndReset = useCallback(() => {
		clearTaskDraft();
		setHasDraft(false);
		setFormData(getInitialFormData());
		setErrors({});
		setTouched({});
		setServerError(undefined);
	}, [getInitialFormData]);

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
				// Use getMinDateTime to get the current time in user's timezone
				// The datetime-local input value represents time in user's timezone
				const minDateTime = getMinDateTime(0); // Get current time with no offset
				if (value <= minDateTime) return "Deadline must be in the future";
				return undefined;
			}
			case "verifierEmail": {
				if (!value.trim()) return "Verifier email is required";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "Please enter a valid email";
				return undefined;
			}
			case "penaltyContent": {
				// Penalty is valid if there's text content OR files attached
				// This function only checks text - file validation is done separately in handleSubmit
				const textContent = value.replace(/<[^>]*>/g, "").trim();
				// Return undefined here - we'll do combined validation in handleSubmit
				if (!textContent) return undefined; // Will be validated with files in handleSubmit
				if (textContent.length < 10)
					return "Penalty text must be at least 10 characters (or just upload files)";
				return undefined;
			}
			default:
				return undefined;
		}
	};

	const handleChange = (
		name: keyof TaskRequest,
		value: string | boolean | number | undefined,
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

		// Validate required fields (excluding penaltyContent which has special validation)
		const newErrors: FormErrors = {};
		(["title", "deadline", "verifierEmail"] as const).forEach((key) => {
			const value = formData[key];
			if (typeof value === "string") {
				const error = validateField(key, value);
				if (error) newErrors[key] = error;
			}
		});

		// Special validation for penalty: must have content OR attachments
		const penaltyTextContent = formData.penaltyContent
			.replace(/<[^>]*>/g, "")
			.trim();
		const hasPenaltyContent =
			penaltyTextContent.length > 0 && formData.penaltyContent !== "<p></p>";
		const hasPenaltyFiles = penaltyFiles.length > 0;

		if (!hasPenaltyContent && !hasPenaltyFiles) {
			newErrors.penaltyContent =
				"A penalty is required. Provide text content or upload files.";
		} else if (hasPenaltyContent && penaltyTextContent.length < 10) {
			newErrors.penaltyContent =
				"Penalty text must be at least 10 characters (or just upload files)";
		}

		setErrors(newErrors);
		setTouched({
			title: true,
			deadline: true,
			verifierEmail: true,
			penaltyContent: true,
		});

		if (Object.keys(newErrors).length > 0) return;

		setIsLoading(true);
		setServerError(undefined);

		try {
			// Format deadline for backend (user's timezone is preserved in the datetime string)
			const payload: TaskRequest = {
				...formData,
				deadline: formatForBackend(formData.deadline),
				penaltyAttachments: penaltyFiles.map((f) => ({
					s3Key: f.s3Key,
					originalFilename: f.originalFilename,
					mimeType: f.mimeType,
					contentHash: f.contentHash,
				})),
			};

			await api.post("/tasks", payload);
			toast.success("Task created successfully!");
			clearTaskDraft(); // Clear draft on success
			setHasDraft(false);
			onSuccess();
			handleClose();
		} catch (err) {
			setServerError(
				err instanceof Error ? err.message : "Failed to create task",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		// Note: We intentionally keep the draft on close so user can continue later
		setFormData(getInitialFormData());
		setPenaltyFiles([]);
		setErrors({});
		setTouched({});
		setServerError(undefined);
		setShowVerifierDropdown(false);
		setShowListDropdown(false);
		onClose();
	};

	const handleDiscardDraft = () => {
		clearDraftAndReset();
		toast.info("Draft discarded", { icon: false, autoClose: 2000 });
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
					{hasDraft && (
						<button
							type="button"
							className={styles.discardDraft}
							onClick={handleDiscardDraft}
						>
							Discard Draft
						</button>
					)}
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
						name="task-title"
						placeholder="What do you commit to doing?"
						icon={FileText}
						value={formData.title}
						onChange={(e) => handleChange("title", e.target.value)}
						onBlur={() => handleBlur("title")}
						error={touched.title ? errors.title : undefined}
						disabled={isLoading}
						autoComplete="off"
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
											(v) => v.email === formData.verifierEmail,
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
									{savedVerifiers.map((verifier) => {
										const online = verifier.isOnline ?? false;
										return (
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
												<div className={styles.verifierAvatarWrapper}>
													<div className={styles.verifierAvatar}>
														{verifier.fullName
															.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase()}
													</div>
													<OnlineStatusIndicator isOnline={online} size="sm" />
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
										);
									})}
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

					{/* Recurrence Pattern */}
					<div className={styles.field}>
						<label className={styles.label}>Repeat</label>
						<RecurrenceSelector
							value={formData.repeatPattern}
							onChange={(rrule) => handleChange("repeatPattern", rrule)}
							disabled={isLoading}
							isModalOpen={isRepeatModalOpen}
							onModalOpenChange={onRepeatModalOpenChange}
						/>
					</div>

					<label className={styles.checkbox}>
						<input
							type="checkbox"
							checked={formData.starred}
							onChange={(e) => handleChange("starred", e.target.checked)}
							disabled={isLoading}
							className={styles.hiddenCheckbox}
						/>
						<Star
							size={20}
							className={`${styles.starIcon} ${
								formData.starred ? styles.starFilled : styles.starOutline
							}`}
							fill={formData.starred ? "#f59e0b" : "none"}
						/>
						<span>Mark as starred (high importance)</span>
					</label>

					{/* Penalty/Secret Content */}
					<div className={styles.penaltySection}>
						<label className={styles.label}>
							<Lock size={18} />
							Penalty/Secret *
						</label>
						<p className={styles.penaltyDescription}>
							This secret will be encrypted and only revealed to your verifier
							if you fail to complete the task. Provide either a written secret,
							upload files (like embarrassing photos), or both!
						</p>
						<div
							className={`${styles.penaltyEditorWrapper} ${
								touched.penaltyContent &&
								errors.penaltyContent &&
								penaltyFiles.length === 0
									? styles.hasError
									: ""
							}`}
						>
							<RichTextEditor
								content={formData.penaltyContent}
								onChange={(html) => handleChange("penaltyContent", html)}
								onBlur={() => handleBlur("penaltyContent")}
								placeholder="Write your secret here... (optional if you upload files below)"
								disabled={isLoading}
							/>
						</div>

						{/* Penalty Attachments */}
						<div className={styles.penaltyAttachments}>
							<label className={styles.attachmentLabel}>Or Upload Files</label>
							<p className={styles.attachmentHint}>
								Upload embarrassing photos, documents, or any files as your
								penalty. Files are stored securely and only revealed if you miss
								the deadline.
							</p>
							<FileUploader
								files={penaltyFiles}
								onChange={setPenaltyFiles}
								maxFiles={5}
								maxSizeMB={25}
							/>
						</div>

						{/* Combined error for penalty (text or files) */}
						{touched.penaltyContent && errors.penaltyContent && (
							<span className={styles.error}>{errors.penaltyContent}</span>
						)}
					</div>

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
