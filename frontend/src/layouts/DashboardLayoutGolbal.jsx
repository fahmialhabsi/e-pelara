// src/layouts/DashboardLayoutGlobal.js
import React from "react";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import MuiSidebarGlobal from "../shared/components/MuiSidebarGlobal";
import MuiTopbarGlobal from "../shared/components/MuiTopbarGlobal";
import { useDokumen } from "../hooks/useDokumen";

export default function DashboardLayoutGlobal() {
  const { dokumen, tahun } = useDokumen(); // tambahkan ini
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "#f4f6f8" }}>
      <CssBaseline />
      <MuiSidebarGlobal />
      <Box sx={{ flexGrow: 1 }}>
        <MuiTopbarGlobal />
        {/* Tambahkan key di Outlet */}
        <Box sx={{ p: 3, mt: 8 }}>
          <Outlet key={dokumen + "-" + tahun} />
        </Box>
      </Box>
    </Box>
  );
}
