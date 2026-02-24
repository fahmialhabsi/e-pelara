// src/shared/components/TablerTopbarGlobal.js

import React from "react";
import GlobalDokumenTahunPicker from "./GlobalDokumenTahunPicker";
import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal";

export default function TablerTopbarGlobal() {
  return (
    <div
      style={{
        height: 58,
        background: "#fff",
        borderBottom: "1px solid #e3e6ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 1110,
      }}
    >
      <GlobalDokumenTahunPicker />
      <GlobalDokumenTahunPickerModal />
    </div>
  );
}
