import React from "react";

export function MrConfirmSubmitDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:8, padding:24, maxWidth:420, width:"90%", boxShadow:"0 4px 24px rgba(0,0,0,0.15)" }}>
        <h3 style={{ margin:"0 0 8px", fontSize:16, fontWeight:700 }}>{title || "Konfirmasi Aksi"}</h3>
        <p style={{ margin:"0 0 20px", fontSize:14, color:"#555" }}>{message || "Apakah Anda yakin ingin melanjutkan aksi ini?"}</p>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding:"8px 16px", border:"1px solid #ccc", borderRadius:6, background:"#fff", cursor:"pointer" }}>Batal</button>
          <button onClick={onConfirm} style={{ padding:"8px 16px", border:"none", borderRadius:6, background:"#dc2626", color:"#fff", cursor:"pointer", fontWeight:600 }}>Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
  );
}