import { useAuth } from "./auth/useAuth";
import LoginScreen from "./components/LoginScreen";
import ChatPage from "./pages/ChatPage";

export default function App() {
  const { ready, isAuthenticated } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-sm text-gray-300">
        Checking session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <ChatPage />;
}
