// src/features/monev/context/MonevContext.jsx
import React, { createContext, useContext, useState } from "react";

// Buat context baru
const MonevContext = createContext();

// Provider untuk membungkus komponen-komponen anak
export const MonevProvider = ({ children }) => {
  const [selectedMonev, setSelectedMonev] = useState(null);

  return (
    <MonevContext.Provider value={{ selectedMonev, setSelectedMonev }}>
      {children}
    </MonevContext.Provider>
  );
};

// Hook untuk menggunakan context ini di komponen lain
export const useMonev = () => useContext(MonevContext);
