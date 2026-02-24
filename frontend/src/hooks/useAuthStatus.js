// src/hooks/useAuthStatus.js
import { useContext } from "react";
import AuthContext from "../contexts/authContext";

// Hook untuk akses status auth
export const useAuthStatus = () => {
  const { user, userReady, loading, logout } = useContext(AuthContext);
  return { user, isAuthenticated: !!user, userReady, loading, logout };
};
