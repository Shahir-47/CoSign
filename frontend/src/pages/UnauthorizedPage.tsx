import { useNavigate } from "react-router-dom";
import { ShieldX, LogIn, Home, ArrowLeft } from "lucide-react";
import Button from "../components/shared/Button";
import styles from "./UnauthorizedPage.module.css";

export default function UnauthorizedPage() {
	const navigate = useNavigate();

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<div className={styles.iconWrapper}>
					<ShieldX size={48} />
				</div>

				<h1 className={styles.title}>Access Denied</h1>
				<p className={styles.message}>
					You don't have permission to access this page. Please log in with an
					authorized account or contact support if you believe this is an error.
				</p>

				<div className={styles.actions}>
					<Button
						variant="secondary"
						onClick={() => navigate(-1)}
					>
						<ArrowLeft size={18} />
						Go Back
					</Button>
					<Button onClick={() => navigate("/login")}>
						<LogIn size={18} />
						Log In
					</Button>
					<Button
						variant="ghost"
						onClick={() => navigate("/")}
					>
						<Home size={18} />
						Home
					</Button>
				</div>
			</div>
		</div>
	);
}
