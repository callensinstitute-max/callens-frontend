import { useEffect, useMemo, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { AuthContext } from "./AuthContext";
import { auth, signInWithGoogle, signOutUser } from "./firebase";

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    ready: false,
    token: null,
    user: null,
  });

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setAuthState({
          ready: true,
          token: null,
          user: null,
        });
        return;
      }

      const token = await user.getIdToken();
      setAuthState({
        ready: true,
        token,
        user: {
          uid: user.uid,
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
        },
      });
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      ...authState,
      isAuthenticated: Boolean(authState.user && authState.token),
      signIn: signInWithGoogle,
      signOut: signOutUser,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
