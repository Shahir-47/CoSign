import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from "lucide-react";
import styles from "./VerifyEmailStatus.module.css";

interface VerifyEmailStatusProps {
	status: "loading" | "success" | "error";
	error?: string;
	onRetry?: () => void;
}

export default function VerifyEmailStatus({
	status,
	error,
	onRetry,
}: VerifyEmailStatusProps) {
	return (
		<div className={styles.container}>
			{status === "loading" && (
				<>
					<div className={`${styles.iconWrapper} ${styles.loading}`}>
						<Loader2 size={48} className={styles.spinner} />
					</div>
					<h1 className={styles.title}>Verifying Your Email</h1>
					<p className={styles.description}>
						Please wait while we verify your email address...
					</p>
				</>
			)}

			{status === "success" && (
				<>
					<div className={`${styles.iconWrapper} ${styles.success}`}>
						<CheckCircle size={48} />
					</div>
					<h1 className={styles.title}>Email Verified!</h1>
					<p className={styles.description}>
						Your email has been successfully verified. You can now sign in to
						your account and start creating accountability contracts.
					</p>
					<div className={styles.successFeatures}>
						<div className={styles.feature}>
							<Mail size={18} />
							<span>Account activated</span>
						</div>
						<div className={styles.feature}>
							<CheckCircle size={18} />
							<span>Ready to create contracts</span>
						</div>
					</div>
				</>
			)}

			{status === "error" && (
				<>
					<div className={`${styles.iconWrapper} ${styles.error}`}>
						<XCircle size={48} />
					</div>
					<h1 className={styles.title}>Verification Failed</h1>
					<p className={styles.description}>
						{error ||
							"We couldn't verify your email. The link may have expired or is invalid."}
					</p>
					{onRetry && (
						<button className={styles.retryButton} onClick={onRetry}>
							<RefreshCw size={18} />
							<span>Try Again</span>
						</button>
					)}
				</>
			)}
		</div>
	);
}
