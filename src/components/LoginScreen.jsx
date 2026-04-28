import { useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function LoginScreen() {
  const { signIn, authError } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      await signIn();
    } catch (err) {
      console.error(err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="inline-flex items-center rounded-full bg-blue-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.26em] text-blue-200">
          Private Access
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Sign in to Callens AI
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          This app is private. Sign in with your authorized Google account to continue.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        {!error && authError ? <p className="mt-4 text-sm text-red-400">{authError}</p> : null}
      </div>
    </div>
  );
}
