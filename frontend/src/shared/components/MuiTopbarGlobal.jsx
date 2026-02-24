// src/shared/components/MuiTopbarGlobal.js

import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import GlobalDokumenTahunPicker from "./GlobalDokumenTahunPicker";
import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal";
// Optional: import Avatar, Menu, IconButton, etc.

export default function MuiTopbarGlobal() {
  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - 220px)`,
        ml: "220px",
        bgcolor: "#fff",
        color: "#222",
        boxShadow: "none",
        borderBottom: "1px solid #e0e0e0",
        zIndex: 1101,
      }}
      elevation={0}
    >
      <Toolbar sx={{ justifyContent: "space-between", minHeight: 64 }}>
        {/* Left: Dokumen/Tahun Picker */}
        <GlobalDokumenTahunPicker />

        {/* Right: Modal trigger (Ganti Dokumen/Tahun), avatar, dsb */}
        <Box>
          <GlobalDokumenTahunPickerModal />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
