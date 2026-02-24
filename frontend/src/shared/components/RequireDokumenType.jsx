// src/shared/components/RequireDokumenType.js
import React, { useEffect, useState } from "react";
import { useDokumen } from "../../contexts/DokumenContext";
import { Navigate } from "react-router-dom";

export default function RequireDokumenType({ dokType, children }) {
  const { dokumen } = useDokumen();
  const [match, setMatch] = useState(false);

  useEffect(() => {
    const isMatch =
      dokumen?.trim().toLowerCase() === dokType?.trim().toLowerCase();
    setMatch(isMatch);
    console.log("[DEBUG] RequireDokumenType:", { dokumen, dokType, isMatch });
  }, [dokumen, dokType]);

  if (!dokumen) return null;
  if (!match) return <Navigate to="/" replace />;
  return children;
}
