import { Link } from "react-router-dom";
import styles from "./SignupFooter.module.css";

export default function SignupFooter() {
	return (
		<div className={styles.footer}>
			<p className={styles.loginLink}>
				Already have an account? <Link to="/login">Sign in</Link>
			</p>

			<p className={styles.terms}>
				By creating an account, you agree to our{" "}
				<a href="#terms">Terms of Service</a> and{" "}
				<a href="#privacy">Privacy Policy</a>
			</p>
		</div>
	);
}
