import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import LoginPage from "./pages/LoginPage";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/signup" element={<SignupPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/verify-email" element={<VerifyEmailPage />} />
				{/* Redirect root to login for now */}
				<Route path="/" element={<Navigate to="/login" replace />} />
			</Routes>
		</Router>
	);
}

export default App;
