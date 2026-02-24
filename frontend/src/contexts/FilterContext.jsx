// src/contexts/FilterContext.js
import React, { createContext, useState, useContext } from "react";

const FilterContext = createContext(null); // 👈 default null (lebih aman)

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    prioritasNasional: null,
    misiGubernur: null,
    prioritasDaerah: null,
    prioritasGubernur: null,
    tujuan: null,
    sasaran: null,
    program: null,
    kegiatan: null,
  });

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

// 👇 helper agar lebih aman digunakan
export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
};

export { FilterContext };
