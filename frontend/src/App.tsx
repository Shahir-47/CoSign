import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/signup" element={<SignupPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/verify-email" element={<VerifyEmailPage />} />
			</Routes>
		</Router>
	);
}

export default App;
