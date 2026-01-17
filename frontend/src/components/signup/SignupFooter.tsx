import { Link } from "react-router-dom";
import styles from "./SignupFooter.module.css";

export default function SignupFooter() {
	return (
		<div className={styles.footer}>
			<p className={styles.loginLink}>
				Already have an account? <Link to="/login">Sign in</Link>
			</p>
		</div>
	);
}
