// src/hooks/useDokumen.js
import { useContext } from "react";
import { DokumenContext } from "../contexts/DokumenContext";

export const useDokumen = () => {
  const context = useContext(DokumenContext);
  if (!context) {
    throw new Error("useDokumen must be used within a DokumenProvider");
  }
  return context;
};
