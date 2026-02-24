import React, { useContext } from "react";
import AuthContext from "../contexts/authContext";

const RoleGuard = ({ allowedRoles, children }) => {
  const { user } = useContext(AuthContext);
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }
  return children;
};

export default RoleGuard;
