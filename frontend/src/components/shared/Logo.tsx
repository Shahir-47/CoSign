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
			{/* Stylized C shape - circular arc */}
			<path
				d="M25 7A11 11 0 1 0 25 25"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			{/* Integrated checkmark */}
			<path
				d="M18 16L20 19L26 13"
				stroke="currentColor"
				strokeWidth="3"
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
