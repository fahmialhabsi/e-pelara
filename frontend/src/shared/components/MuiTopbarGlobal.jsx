// src/shared/components/MuiTopbarGlobal.js

import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import GlobalDokumenTahunPicker from "./GlobalDokumenTahunPicker";
import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal";
import SuperAdminTenantSwitcher from "./SuperAdminTenantSwitcher";
import TenantOverrideBanner from "./TenantOverrideBanner";
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
      <TenantOverrideBanner />
      <Toolbar sx={{ justifyContent: "space-between", minHeight: 64, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
          <GlobalDokumenTahunPicker />
          <SuperAdminTenantSwitcher />
        </Box>

        <Box>
          <GlobalDokumenTahunPickerModal />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
