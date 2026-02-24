// src/hooks/useRoles.js
import { useEffect, useState } from "react";
import api from "../services/api";

export function useRoles() {
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    api.get("/roles").then((res) => setRoles(res.data));
  }, []);
  return roles;
}
