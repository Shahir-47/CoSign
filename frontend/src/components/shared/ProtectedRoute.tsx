import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated, isLoading } = useAuth();
	const location = useLocation();

	// Show nothing while checking auth state
	if (isLoading) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					background: "#0a0a0a",
					color: "#888",
				}}
			>
				Loading...
			</div>
		);
	}

	// Redirect to login if not authenticated
	if (!isAuthenticated) {
		// Save the attempted URL for redirecting after login
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
}
