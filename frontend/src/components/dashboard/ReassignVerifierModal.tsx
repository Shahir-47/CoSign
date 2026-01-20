import { useState, useEffect } from "react";
import { X, User, UserPlus, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import type { Task, Verifier } from "../../types";
import { api } from "../../utils/api";
import { useWebSocket } from "../../context/useWebSocket";
import type {
	SocketMessage,
	UserStatusPayload,
} from "../../context/websocket.types";
import Button from "../shared/Button";
import OnlineStatusIndicator from "../shared/OnlineStatusIndicator";
import styles from "./ReassignVerifierModal.module.css";

interface ReassignVerifierModalProps {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	onOpenVerifiersModal?: () => void;
	refreshVerifiersKey?: number;
	newlyAddedVerifierEmail?: string | null;
	removedVerifierEmail?: string | null;
}

export default function ReassignVerifierModal({
	task,
	isOpen,
	onClose,
	onSuccess,
	onOpenVerifiersModal,
	refreshVerifiersKey,
	newlyAddedVerifierEmail,
	removedVerifierEmail,
}: ReassignVerifierModalProps) {
	const [savedVerifiers, setSavedVerifiers] = useState<Verifier[]>([]);
	const [verifierEmail, setVerifierEmail] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const { subscribe, isUserOnline, isConnected } = useWebSocket();

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

	useEffect(() => {
		if (isOpen) {
			api
				.get<Verifier[]>("/verifiers")
				.then((data) => {
					setSavedVerifiers(data);
				})
				.catch(() => {});
		}
	}, [isOpen, refreshVerifiersKey]);

	// Handle newly added verifier - auto-select it
	useEffect(() => {
		if (newlyAddedVerifierEmail && isOpen) {
			setVerifierEmail(newlyAddedVerifierEmail);
		}
	}, [newlyAddedVerifierEmail, isOpen]);

	// Handle removed verifier - clear selection if it was selected
	useEffect(() => {
		if (removedVerifierEmail && isOpen) {
			if (verifierEmail === removedVerifierEmail) {
				setVerifierEmail("");
			}
		}
	}, [removedVerifierEmail, isOpen, verifierEmail]);

	const handleSubmit = async () => {
		if (!task || !verifierEmail.trim()) return;

		setIsLoading(true);
		setError(undefined);

		try {
			await api.put(`/tasks/${task.id}/reassign`, {
				email: verifierEmail.trim(),
			});
			toast.success("Verifier reassigned successfully!");
			onSuccess();
			handleClose();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to reassign verifier"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setVerifierEmail("");
		setShowDropdown(false);
		setError(undefined);
		onClose();
	};

	const selectVerifier = (verifier: Verifier) => {
		setVerifierEmail(verifier.email);
		setShowDropdown(false);
	};

	if (!isOpen || !task) return null;

	return (
		<div className={styles.overlay} onClick={handleClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<div className={styles.warningIcon}>
						<AlertTriangle size={24} />
					</div>
					<h2>Reassign Verifier</h2>
					<p>
						The previous verifier was removed. Choose a new verifier for this
						task to resume it.
					</p>
					<button className={styles.closeButton} onClick={handleClose}>
						<X size={20} />
					</button>
				</div>

				<div className={styles.content}>
					<div className={styles.taskInfo}>
						<span className={styles.taskLabel}>Task:</span>
						<span className={styles.taskTitle}>{task.title}</span>
					</div>

					{error && <div className={styles.error}>{error}</div>}

					<div className={styles.verifierSection}>
						<label className={styles.label}>
							<User size={18} />
							New Verifier
						</label>

						<div className={styles.verifierDropdownWrapper}>
							<button
								type="button"
								className={styles.verifierDropdownTrigger}
								onClick={() => setShowDropdown(!showDropdown)}
								disabled={isLoading}
							>
								{verifierEmail ? (
									<span className={styles.selectedVerifier}>
										{savedVerifiers.find((v) => v.email === verifierEmail)
											?.fullName || verifierEmail}
									</span>
								) : (
									<span className={styles.placeholderText}>
										Select a verifier...
									</span>
								)}
								<ChevronDown
									size={18}
									className={showDropdown ? styles.rotated : ""}
								/>
							</button>

							{showDropdown && (
								<div className={styles.verifierDropdown}>
									{savedVerifiers.map((verifier) => (
										<button
											key={verifier.id}
											type="button"
											className={`${styles.verifierOption} ${
												verifierEmail === verifier.email ? styles.selected : ""
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
											<div className={styles.statusIndicator}>
												<OnlineStatusIndicator
													isOnline={
														isConnected
															? isUserOnline(verifier.id)
															: verifier.isOnline ?? false
													}
													size="sm"
												/>
											</div>
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
											setShowDropdown(false);
											onOpenVerifiersModal?.();
										}}
									>
										<UserPlus size={16} />
										Add New Verifier
									</button>
								</div>
							)}
						</div>
					</div>

					<div className={styles.actions}>
						<Button
							variant="secondary"
							onClick={handleClose}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							isLoading={isLoading}
							disabled={!verifierEmail.trim()}
						>
							Reassign & Resume
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
