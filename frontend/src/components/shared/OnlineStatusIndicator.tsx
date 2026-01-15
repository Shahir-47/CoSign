import styles from "./OnlineStatusIndicator.module.css";

interface OnlineStatusIndicatorProps {
	isOnline: boolean;
	size?: "sm" | "md" | "lg";
	showLabel?: boolean;
}

export default function OnlineStatusIndicator({
	isOnline,
	size = "sm",
	showLabel = false,
}: OnlineStatusIndicatorProps) {
	return (
		<div className={`${styles.container} ${styles[size]}`}>
			<span
				className={`${styles.dot} ${isOnline ? styles.online : styles.offline}`}
			/>
			{showLabel && (
				<span className={styles.label}>{isOnline ? "Online" : "Offline"}</span>
			)}
		</div>
	);
}
