// src/hooks/useDarkMode.js
import { useState, useEffect } from "react";

export const useDarkMode = () => {
  const getInitialMode = () => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      return savedMode === "true";
    }
    // fallback ke preferensi sistem
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const [darkMode, setDarkMode] = useState(getInitialMode);

  useEffect(() => {
    const classMethod = darkMode ? "add" : "remove";
    document.body.classList[classMethod]("dark-mode");
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  return [darkMode, setDarkMode];
};
