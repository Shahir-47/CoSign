import { LogIn, Shield, Users } from "lucide-react";
import styles from "./LoginHeader.module.css";

export default function LoginHeader() {
	return (
		<div className={styles.header}>
			<h1 className={styles.title}>Welcome Back</h1>
			<p className={styles.subtitle}>
				Sign in to continue managing your accountability contracts and verify
				your peers' commitments.
			</p>

			<div className={styles.features}>
				<div className={styles.feature}>
					<LogIn size={18} />
					<span>Secure Access</span>
				</div>
				<div className={styles.feature}>
					<Shield size={18} />
					<span>JWT Protected</span>
				</div>
				<div className={styles.feature}>
					<Users size={18} />
					<span>Peer Verification</span>
				</div>
			</div>
		</div>
	);
}
