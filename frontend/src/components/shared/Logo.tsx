import styles from "./Logo.module.css";

interface LogoProps {
	size?: "sm" | "md" | "lg";
	showText?: boolean;
}

// Custom CoSign logo - stylized "C" with a checkmark integrated
function CoSignIcon({ size = 32 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Stylized C shape */}
			<path
				d="M22 8C19.5 5.5 15.5 4.5 12 6C7 8 5 13 6 18C7 23 11 26 16 26C19 26 21.5 25 23.5 23"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
			{/* Integrated checkmark at the end */}
			<path
				d="M18 14L21 17L27 11"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default function Logo({ size = "md", showText = true }: LogoProps) {
	const iconSizes = {
		sm: 22,
		md: 28,
		lg: 40,
	};

	return (
		<div className={`${styles.logo} ${styles[size]}`}>
			<div className={styles.iconWrapper}>
				<CoSignIcon size={iconSizes[size]} />
			</div>
			{showText && <span className={styles.text}>CoSign</span>}
		</div>
	);
}
