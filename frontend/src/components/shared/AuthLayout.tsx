import { CheckCircle, Users, Bell, Shield } from "lucide-react";
import Logo from "./Logo";
import styles from "./AuthLayout.module.css";

interface AuthLayoutProps {
	children: React.ReactNode;
}

const features = [
	{
		icon: CheckCircle,
		title: "Shared Accountability",
		description: "Assign verifiers to confirm task completion",
	},
	{
		icon: Users,
		title: "Team Collaboration",
		description: "Work together on shared lists and goals",
	},
	{
		icon: Bell,
		title: "Smart Reminders",
		description: "Stay on track with timely notifications",
	},
	{
		icon: Shield,
		title: "Built-in Consequences",
		description: "Add stakes to make commitments stick",
	},
];

export default function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<div className={styles.layout}>
			<div className={styles.backgroundPattern}>
				<div className={styles.gridOverlay} />
			</div>

			<div className={styles.splitContainer}>
				{/* Left side - Promotional content */}
				<div className={styles.promoSide}>
					<div className={styles.promoContent}>
						<Logo size="lg" />
						<h1 className={styles.tagline}>
							Commit. Verify. <span className={styles.accent}>Deliver.</span>
						</h1>
						<p className={styles.subtitle}>
							The accountability platform where promises become results. Add
							verifiers to your tasks and make every commitment count.
						</p>

						<div className={styles.features}>
							{features.map((feature) => (
								<div key={feature.title} className={styles.feature}>
									<div className={styles.featureIcon}>
										<feature.icon size={20} />
									</div>
									<div className={styles.featureText}>
										<h3>{feature.title}</h3>
										<p>{feature.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right side - Auth form */}
				<div className={styles.formSide}>
					<div className={styles.formContainer}>
						<main className={styles.main}>{children}</main>

						<footer className={styles.footer}>
							<p>
								&copy; {new Date().getFullYear()} CoSign. Enforce
								accountability, honor commitments.
							</p>
						</footer>
					</div>
				</div>
			</div>
		</div>
	);
}
