import { User } from "lucide-react";
import styles from "./Avatar.module.css";

interface AvatarProps {
	src?: string | null;
	name: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	showOnlineStatus?: boolean;
	isOnline?: boolean;
	className?: string;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export default function Avatar({
	src,
	name,
	size = "md",
	showOnlineStatus = false,
	isOnline = false,
	className = "",
}: AvatarProps) {
	const initials = getInitials(name);

	return (
		<div className={`${styles.avatar} ${styles[size]} ${className}`}>
			{src ? (
				<img src={src} alt={name} />
			) : initials ? (
				<span className={styles.initials}>{initials}</span>
			) : (
				<User
					size={
						size === "xs"
							? 12
							: size === "sm"
								? 14
								: size === "lg"
									? 24
									: size === "xl"
										? 32
										: 18
					}
				/>
			)}
			{showOnlineStatus && (
				<span
					className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`}
				/>
			)}
		</div>
	);
}
