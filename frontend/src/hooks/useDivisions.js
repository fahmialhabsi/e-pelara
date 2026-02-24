// src/hooks/useDivisions.js
import { useEffect, useState } from "react";
import api from "../services/api";
export function useDivisions() {
  const [divisions, setDivisions] = useState([]);
  useEffect(() => {
    api.get("/divisions").then((res) => setDivisions(res.data));
  }, []);
  return divisions;
}
