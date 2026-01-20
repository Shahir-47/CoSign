import { useState, useEffect } from "react";
import { X, UserPlus, Trash2, Mail, Users, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import type { Verifier } from "../../types";
import { api } from "../../utils/api";
import Input from "../shared/Input";
import Button from "../shared/Button";
import OnlineStatusIndicator from "../shared/OnlineStatusIndicator";
import { useWebSocket } from "../../context/useWebSocket";
import type {
	SocketMessage,
	UserStatusPayload,
} from "../../context/websocket.types";
import styles from "./VerifiersModal.module.css";

interface VerifiersModalProps {
	isOpen: boolean;
	onClose: () => void;
	onVerifierAdded?: (verifier: Verifier) => void;
	onVerifierRemoved?: (verifierId: number, verifierEmail: string) => void;
}

export default function VerifiersModal({
	isOpen,
	onClose,
	onVerifierAdded,
	onVerifierRemoved,
}: VerifiersModalProps) {
	const { subscribe, isUserOnline, isConnected } = useWebSocket();

	const [verifiers, setVerifiers] = useState<Verifier[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [email, setEmail] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [showAddForm, setShowAddForm] = useState(false);

	// Subscribe to user status changes for real-time online indicator updates
	useEffect(() => {
		if (!isOpen) return;

		const handleMessage = (message: SocketMessage) => {
			if (message.type !== "USER_STATUS") return;
			const payload = message.payload as UserStatusPayload;
			setVerifiers((prev) =>
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

	const fetchVerifiers = async () => {
		try {
			setIsLoading(true);
			const data = await api.get<Verifier[]>("/verifiers");
			setVerifiers(data);
		} catch {
			setError("Failed to load verifiers");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchVerifiers();
			setShowAddForm(false);
			setEmail("");
			setError(undefined);
		}
	}, [isOpen]);

	const handleAddVerifier = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;

		setIsAdding(true);
		setError(undefined);

		try {
			const newVerifier = await api.post<Verifier>("/verifiers", {
				email: email.trim(),
			});
			setVerifiers((prev) => [...prev, newVerifier]);
			setEmail("");
			setShowAddForm(false);
			toast.success(`${newVerifier.fullName} added as verifier`);
			onVerifierAdded?.(newVerifier);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add verifier");
		} finally {
			setIsAdding(false);
		}
	};

	const handleRemoveVerifier = async (id: number, email: string) => {
		if (
			!confirm(
				"Remove this verifier? Any active tasks with them will be paused."
			)
		) {
			return;
		}

		try {
			await api.delete(`/verifiers/${id}`);
			setVerifiers((prev) => prev.filter((v) => v.id !== id));
			toast.info("Verifier removed");
			onVerifierRemoved?.(id, email);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to remove verifier"
			);
		}
	};

	if (!isOpen) return null;

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<div className={styles.titleSection}>
						<h2>
							<Users size={24} />
							My Verifiers
						</h2>
						<p>Manage trusted people who can verify your task completions.</p>
					</div>
					<button className={styles.closeButton} onClick={onClose}>
						<X size={20} />
					</button>
				</div>

				<div className={styles.content}>
					{error && (
						<div className={styles.error}>
							<AlertCircle size={18} />
							{error}
						</div>
					)}

					<div className={styles.addSection}>
						{showAddForm ? (
							<form className={styles.addForm} onSubmit={handleAddVerifier}>
								<Input
									label="Verifier Email"
									type="email"
									name="verifier-email"
									placeholder="Enter their CoSign email"
									icon={Mail}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={isAdding}
									autoComplete="off"
								/>
								<div className={styles.addFormActions}>
									<Button
										type="button"
										variant="secondary"
										onClick={() => {
											setShowAddForm(false);
											setEmail("");
										}}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										isLoading={isAdding}
										disabled={!email.trim()}
									>
										Add Verifier
									</Button>
								</div>
							</form>
						) : (
							<Button onClick={() => setShowAddForm(true)}>
								<UserPlus size={18} />
								Add New Verifier
							</Button>
						)}
					</div>

					{isLoading ? (
						<div className={styles.loading}>Loading verifiers...</div>
					) : verifiers.length === 0 ? (
						<div className={styles.empty}>
							<Users size={48} />
							<h3>No verifiers yet</h3>
							<p>
								Add trusted friends or colleagues who can verify your task
								completions.
							</p>
						</div>
					) : (
						<div className={styles.verifiersList}>
							{verifiers.map((verifier) => {
								const online = isConnected
									? isUserOnline(verifier.id)
									: verifier.isOnline ?? false;
								return (
									<div key={verifier.id} className={styles.verifierCard}>
										<div className={styles.verifierInfo}>
											<div className={styles.avatarWrapper}>
												<div className={styles.avatar}>
													{verifier.profilePictureUrl ? (
														<img
															src={verifier.profilePictureUrl}
															alt={verifier.fullName}
														/>
													) : (
														<span>
															{verifier.fullName
																.split(" ")
																.map((n) => n[0])
																.join("")
																.toUpperCase()}
														</span>
													)}
												</div>
												<div className={styles.statusIndicator}>
													<OnlineStatusIndicator isOnline={online} size="sm" />
												</div>
											</div>
											<div className={styles.verifierDetails}>
												<span className={styles.name}>{verifier.fullName}</span>
												<span className={styles.email}>{verifier.email}</span>
											</div>
										</div>
										<button
											className={styles.removeButton}
											onClick={() =>
												handleRemoveVerifier(verifier.id, verifier.email)
											}
											title="Remove verifier"
										>
											<Trash2 size={18} />
										</button>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
