import { useState, useEffect } from "react";
import {
	X,
	CheckCircle2,
	XCircle,
	File,
	Image,
	Film,
	FileText,
	Music,
	Eye,
	Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import type {
	Task,
	TaskDetails,
	ReviewTaskRequest,
	ProofAttachment,
} from "../../types";
import Button from "../shared/Button";
import ViewAttachmentModal from "../shared/ViewAttachmentModal";
import { api } from "../../utils/api";
import styles from "./ReviewProofModal.module.css";

interface ReviewProofModalProps {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

function getFileIcon(mimeType: string) {
	if (mimeType.startsWith("image/")) return Image;
	if (mimeType.startsWith("video/")) return Film;
	if (mimeType.startsWith("audio/")) return Music;
	if (mimeType.includes("pdf") || mimeType.includes("document"))
		return FileText;
	return File;
}

export default function ReviewProofModal({
	task,
	isOpen,
	onClose,
	onSuccess,
}: ReviewProofModalProps) {
	const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null);
	const [isLoadingDetails, setIsLoadingDetails] = useState(false);
	const [feedback, setFeedback] = useState("");
	const [isApproving, setIsApproving] = useState(false);
	const [isDenying, setIsDenying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [viewingAttachment, setViewingAttachment] =
		useState<ProofAttachment | null>(null);

	// Fetch task details with presigned URLs
	useEffect(() => {
		if (isOpen && task) {
			setIsLoadingDetails(true);
			api
				.get<TaskDetails>(`/tasks/${task.id}`)
				.then((data) => {
					setTaskDetails(data);
				})
				.catch((err) => {
					setError(err instanceof Error ? err.message : "Failed to load proof");
				})
				.finally(() => {
					setIsLoadingDetails(false);
				});
		}
	}, [isOpen, task]);

	const handleReview = async (approved: boolean) => {
		if (!task) return;

		// Require feedback for denial
		if (!approved && !feedback.trim()) {
			setError(
				"Please provide feedback explaining why the proof was not accepted."
			);
			return;
		}

		if (approved) {
			setIsApproving(true);
		} else {
			setIsDenying(true);
		}
		setError(null);

		try {
			const request: ReviewTaskRequest = {
				approved,
				comment: feedback.trim() || undefined,
			};

			await api.post(`/tasks/${task.id}/review`, request);
			toast.success(approved ? "Task approved!" : "Proof rejected");
			onSuccess();
			handleClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit review");
		} finally {
			setIsApproving(false);
			setIsDenying(false);
		}
	};

	const handleClose = () => {
		setTaskDetails(null);
		setFeedback("");
		setError(null);
		onClose();
	};

	if (!isOpen || !task) return null;

	return (
		<div className={styles.overlay} onClick={handleClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<div>
						<h2>Review Proof</h2>
						<p className={styles.taskTitle}>{task.title}</p>
					</div>
					<button className={styles.closeButton} onClick={handleClose}>
						<X size={20} />
					</button>
				</div>

				<div className={styles.content}>
					{isLoadingDetails ? (
						<div className={styles.loading}>
							<Loader2 size={24} className={styles.spinner} />
							<p>Loading proof...</p>
						</div>
					) : (
						<>
							{error && <div className={styles.error}>{error}</div>}

							{/* Proof Description */}
							{taskDetails?.proofDescription && (
								<div className={styles.section}>
									<h3 className={styles.sectionTitle}>Description</h3>
									<div
										className={styles.proofDescription}
										dangerouslySetInnerHTML={{
											__html: taskDetails.proofDescription,
										}}
									/>
								</div>
							)}

							{/* Attachments */}
							{taskDetails?.attachments &&
								taskDetails.attachments.length > 0 && (
									<div className={styles.section}>
										<h3 className={styles.sectionTitle}>
											Attachments ({taskDetails.attachments.length})
										</h3>
										<div className={styles.attachments}>
											{taskDetails.attachments.map((attachment, index) => {
												const FileIcon = getFileIcon(attachment.mimeType);
												const isImage =
													attachment.mimeType.startsWith("image/");
												const isVideo =
													attachment.mimeType.startsWith("video/");

												return (
													<div key={index} className={styles.attachment}>
														{isImage ? (
															<button
																type="button"
																className={styles.imagePreview}
																onClick={() => setViewingAttachment(attachment)}
															>
																<img
																	src={attachment.url}
																	alt={attachment.filename}
																/>
																<div className={styles.imageOverlay}>
																	<Eye size={20} />
																</div>
															</button>
														) : isVideo ? (
															<video
																src={attachment.url}
																controls
																className={styles.videoPreview}
															/>
														) : (
															<button
																type="button"
																className={styles.filePreview}
																onClick={() => setViewingAttachment(attachment)}
															>
																<FileIcon size={32} />
															</button>
														)}
														<div className={styles.attachmentInfo}>
															<span className={styles.attachmentName}>
																{attachment.filename}
															</span>
															<button
																type="button"
																className={styles.viewLink}
																onClick={() => setViewingAttachment(attachment)}
															>
																<Eye size={14} />
																View
															</button>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								)}

							{/* No proof submitted */}
							{!taskDetails?.proofDescription &&
								(!taskDetails?.attachments ||
									taskDetails.attachments.length === 0) && (
									<div className={styles.noProof}>
										<p>No proof has been submitted yet.</p>
									</div>
								)}

							{/* Feedback */}
							<div className={styles.section}>
								<h3 className={styles.sectionTitle}>
									Feedback{" "}
									<span className={styles.optional}>(required for denial)</span>
								</h3>
								<textarea
									className={styles.feedbackInput}
									placeholder="Add feedback for the task creator..."
									value={feedback}
									onChange={(e) => setFeedback(e.target.value)}
									rows={3}
								/>
							</div>
						</>
					)}
				</div>

				<div className={styles.footer}>
					<Button variant="secondary" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						variant="danger"
						onClick={() => handleReview(false)}
						isLoading={isDenying}
						disabled={isApproving || isLoadingDetails}
					>
						<XCircle size={16} />
						Deny
					</Button>
					<Button
						variant="success"
						onClick={() => handleReview(true)}
						isLoading={isApproving}
						disabled={isDenying || isLoadingDetails}
					>
						<CheckCircle2 size={16} />
						Approve
					</Button>
				</div>
			</div>

			{/* View Attachment Modal */}
			<ViewAttachmentModal
				attachment={viewingAttachment}
				isOpen={!!viewingAttachment}
				onClose={() => setViewingAttachment(null)}
			/>
		</div>
	);
}
