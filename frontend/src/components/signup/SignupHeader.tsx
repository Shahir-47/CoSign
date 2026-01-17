import styles from "./SignupHeader.module.css";

export default function SignupHeader() {
	return (
		<div className={styles.header}>
			<h1 className={styles.title}>Create Your Account</h1>
			<p className={styles.subtitle}>
				Join CoSign and start holding yourself accountable with verified
				commitments.
			</p>
		</div>
	);
}
