import { Link } from "react-router-dom";
import styles from "./LoginFooter.module.css";

export default function LoginFooter() {
	return (
		<div className={styles.footer}>
			<p className={styles.signupLink}>
				Don't have an account? <Link to="/signup">Sign up</Link>
			</p>

			<Link to="/forgot-password" className={styles.forgotPassword}>
				Forgot your password?
			</Link>
		</div>
	);
}
