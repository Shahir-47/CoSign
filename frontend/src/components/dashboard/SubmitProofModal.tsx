import { useState, useEffect, useRef } from "react";
import { X, Send, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import type { Task, ProofSubmissionRequest } from "../../types";
import RichTextEditor from "../shared/RichTextEditor";
import FileUploader from "../shared/FileUploader";
import type { UploadedFile } from "../shared/FileUploader";
import Button from "../shared/Button";
import { api } from "../../utils/api";
import {
	saveProofDraft,
	loadProofDraft,
	clearProofDraft,
} from "../../utils/persistence";
import styles from "./SubmitProofModal.module.css";

interface SubmitProofModalProps {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export default function SubmitProofModal({
	task,
	isOpen,
	onClose,
	onSuccess,
}: SubmitProofModalProps) {
	const [description, setDescription] = useState("");
	const [files, setFiles] = useState<UploadedFile[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasDraft, setHasDraft] = useState(false);
	const draftLoadedRef = useRef(false);
	const saveDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

	// Load draft when modal opens
	useEffect(() => {
		if (isOpen && task && !draftLoadedRef.current) {
			const draft = loadProofDraft(task.id);
			if (draft) {
				setDescription(draft.description);
				// Note: Files can't be restored from localStorage, just show notification
				if (draft.fileNames.length > 0) {
					toast.info(
						`📝 Draft restored. Previously attached files (${draft.fileNames.join(
							", "
						)}) need to be re-uploaded.`,
						{ icon: false, autoClose: 4000 }
					);
				} else {
					toast.info("📝 Draft restored", { icon: false, autoClose: 2000 });
				}
				setHasDraft(true);
			}
			draftLoadedRef.current = true;
		}
		if (!isOpen) {
			draftLoadedRef.current = false;
		}
	}, [isOpen, task]);

	// Auto-save draft on changes (debounced)
	useEffect(() => {
		if (!isOpen || !task) return;

		// Only save if there's meaningful content
		const hasContent = description.trim() && description !== "<p></p>";
		if (!hasContent && files.length === 0) return;

		if (saveDraftTimeoutRef.current) {
			clearTimeout(saveDraftTimeoutRef.current);
		}

		saveDraftTimeoutRef.current = setTimeout(() => {
			saveProofDraft(task.id, {
				description,
				fileNames: files.map((f) => f.originalFilename),
			});
		}, 1000);

		return () => {
			if (saveDraftTimeoutRef.current) {
				clearTimeout(saveDraftTimeoutRef.current);
			}
		};
	}, [isOpen, task, description, files]);

	const handleSubmit = async () => {
		if (!task) return;

		// Validate - need either description or files
		const hasDescription =
			description.trim().length > 0 && description !== "<p></p>";
		const hasFiles = files.length > 0;

		if (!hasDescription && !hasFiles) {
			setError(
				"Please provide a description or upload at least one file as proof."
			);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const request: ProofSubmissionRequest = {
				description: description,
				attachments: files.map((f) => ({
					s3Key: f.s3Key,
					originalFilename: f.originalFilename,
					mimeType: f.mimeType,
				})),
			};

			await api.post(`/tasks/${task.id}/proof`, request);
			toast.success("Proof submitted successfully!");
			clearProofDraft(task.id); // Clear draft on success
			setHasDraft(false);
			onSuccess();
			handleClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit proof");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		// Note: Keep draft on close so user can continue later
		setDescription("");
		setFiles([]);
		setError(null);
		onClose();
	};

	const handleDiscardDraft = () => {
		if (task) {
			clearProofDraft(task.id);
			setHasDraft(false);
			setDescription("");
			setFiles([]);
			toast.info("Draft discarded", { icon: false, autoClose: 2000 });
		}
	};

	if (!isOpen || !task) return null;

	const isDenied = task.status === "MISSED" || task.denialReason;

	return (
		<div className={styles.overlay} onClick={handleClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<div>
						<h2>Submit Proof</h2>
						<p className={styles.taskTitle}>{task.title}</p>
					</div>
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

				<div className={styles.content}>
					{/* Show denial reason if resubmitting */}
					{isDenied && task.denialReason && (
						<div className={styles.denialBanner}>
							<AlertTriangle size={18} />
							<div>
								<strong>Previous submission was not accepted</strong>
								<p>{task.denialReason}</p>
							</div>
						</div>
					)}

					{error && <div className={styles.error}>{error}</div>}

					{/* Rich Text Editor */}
					<div className={styles.section}>
						<label className={styles.label}>Description</label>
						<p className={styles.hint}>
							Describe what you did to complete this task. Use formatting to
							make your proof clear and easy to review.
						</p>
						<RichTextEditor
							content={description}
							onChange={setDescription}
							placeholder="Explain how you completed this task..."
						/>
					</div>

					{/* File Uploader */}
					<div className={styles.section}>
						<label className={styles.label}>Attachments</label>
						<p className={styles.hint}>
							Upload screenshots, documents, videos, or any files that prove you
							completed the task.
						</p>
						<FileUploader
							files={files}
							onChange={setFiles}
							maxFiles={10}
							maxSizeMB={50}
						/>
					</div>
				</div>

				<div className={styles.footer}>
					<Button
						variant="secondary"
						onClick={handleClose}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} isLoading={isLoading}>
						<Send size={16} />
						Submit Proof
					</Button>
				</div>
			</div>
		</div>
	);
}
