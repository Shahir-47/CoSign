import { Link } from "react-router-dom";
import Button from "../shared/Button";
import styles from "./VerifyEmailActions.module.css";

interface VerifyEmailActionsProps {
	status: "loading" | "success" | "error";
}

export default function VerifyEmailActions({
	status,
}: VerifyEmailActionsProps) {
	if (status === "loading") {
		return null;
	}

	return (
		<div className={styles.actions}>
			{status === "success" && (
				<Link to="/login" className={styles.link}>
					<Button fullWidth>Sign In to Your Account</Button>
				</Link>
			)}

			{status === "error" && (
				<>
					<Link to="/signup" className={styles.link}>
						<Button variant="secondary" fullWidth>
							Create New Account
						</Button>
					</Link>
					<p className={styles.helpText}>
						Need help? <a href="mailto:support@cosign.app">Contact Support</a>
					</p>
				</>
			)}
		</div>
	);
}
