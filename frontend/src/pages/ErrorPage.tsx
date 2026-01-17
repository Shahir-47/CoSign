import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from "lucide-react";
import Button from "../components/shared/Button";
import styles from "./ErrorPage.module.css";

interface ErrorState {
	code?: number;
	message?: string;
}

export default function ErrorPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as ErrorState | undefined;

	const errorCode = state?.code || 404;
	const errorMessage = state?.message || getDefaultMessage(errorCode);

	function getDefaultMessage(code: number): string {
		switch (code) {
			case 404:
				return "The page you're looking for doesn't exist or has been moved.";
			case 500:
				return "Something went wrong on our end. Please try again later.";
			case 503:
				return "Service temporarily unavailable. Please try again in a few minutes.";
			default:
				return "An unexpected error occurred.";
		}
	}

	function getErrorTitle(code: number): string {
		switch (code) {
			case 404:
				return "Page Not Found";
			case 500:
				return "Server Error";
			case 503:
				return "Service Unavailable";
			default:
				return "Something Went Wrong";
		}
	}

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<div className={styles.iconWrapper}>
					<AlertTriangle size={48} />
				</div>

				<span className={styles.errorCode}>{errorCode}</span>
				<h1 className={styles.title}>{getErrorTitle(errorCode)}</h1>
				<p className={styles.message}>{errorMessage}</p>

				<div className={styles.actions}>
					<Button
						variant="secondary"
						onClick={() => navigate(-1)}
					>
						<ArrowLeft size={18} />
						Go Back
					</Button>
					<Button onClick={() => navigate("/")}>
						<Home size={18} />
						Home
					</Button>
					<Button
						variant="ghost"
						onClick={() => window.location.reload()}
					>
						<RefreshCw size={18} />
						Retry
					</Button>
				</div>
			</div>
		</div>
	);
}
