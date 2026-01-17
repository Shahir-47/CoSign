import styles from "./LoginHeader.module.css";

export default function LoginHeader() {
	return (
		<div className={styles.header}>
			<h1 className={styles.title}>Welcome Back</h1>
			<p className={styles.subtitle}>
				Sign in to continue managing your tasks and verifying commitments.
			</p>
		</div>
	);
}
