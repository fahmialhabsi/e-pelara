// WizardContextPanel.jsx — Sidebar konteks hierarki wizard Indikator RPJMD

import React from "react";

const HIERARCHY = [
  { key: "misi",           icon: "🏛",  label: "MISI",           stepIdx: 0 },
  { key: "tujuan",         icon: "🎯",  label: "TUJUAN",          stepIdx: 1 },
  { key: "sasaran",        icon: "📊",  label: "SASARAN",         stepIdx: 2 },
  { key: "strategi",       icon: "🗺️", label: "STRATEGI",        stepIdx: 3 },
  { key: "arah_kebijakan", icon: "🧭",  label: "ARAH KEBIJAKAN",  stepIdx: 4 },
  { key: "program",        icon: "📋",  label: "PROGRAM",         stepIdx: 5 },
  { key: "kegiatan",       icon: "⚙️", label: "KEGIATAN",        stepIdx: 6 },
  { key: "sub_kegiatan",   icon: "📌",  label: "SUB KEGIATAN",    stepIdx: 7 },
];

const STATUS = {
  done:    { bg: "#d1e7dd", border: "#198754", label: "#0a3622", badge: "#198754" },
  active:  { bg: "#e7f0ff", border: "#0d6efd", label: "#084298", badge: "#0d6efd" },
  pending: { bg: "#f8f9fa", border: "#dee2e6", label: "#adb5bd", badge: "#adb5bd" },
};

function HierarchyItem({ icon, label, value, status, isLast }) {
  const c = STATUS[status] || STATUS.pending;
  const isDone    = status === "done";
  const isActive  = status === "active";

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "9px 11px",
          borderRadius: 8,
          border: `1.5px solid ${c.border}`,
          background: c.bg,
          transition: "all 0.25s",
        }}
      >
        {/* Row 1: icon + label + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: c.label,
              flex: 1,
            }}
          >
            {label}
          </span>
          {isDone && (
            <span
              style={{
                fontSize: 9,
                background: c.badge,
                color: "#fff",
                borderRadius: 10,
                padding: "2px 7px",
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              ✓ SELESAI
            </span>
          )}
          {isActive && (
            <span
              style={{
                fontSize: 9,
                background: c.badge,
                color: "#fff",
                borderRadius: 10,
                padding: "2px 7px",
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              ▶ AKTIF
            </span>
          )}
        </div>

        {/* Row 2: selected value */}
        <div
          style={{
            fontSize: 11,
            color: value ? "#1a1a2e" : "#adb5bd",
            fontStyle: value ? "normal" : "italic",
            lineHeight: 1.45,
            wordBreak: "break-word",
          }}
        >
          {value || "Belum dipilih"}
        </div>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div
          style={{
            width: 2,
            height: 10,
            background: isDone ? "#198754" : "#dee2e6",
            margin: "0 0 0 18px",
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
}

export default function WizardContextPanel({
  values,
  currentStep,
  completedSteps,
  lastSavedAt,
  dokumen,
  tahun,
}) {
  const misiLabel =
    values.no_misi && values.isi_misi
      ? `${values.no_misi} – ${values.isi_misi}`
      : null;

  const labelMap = {
    misi:           misiLabel,
    tujuan:         values.tujuan_label          || null,
    sasaran:        values.sasaran_label         || null,
    strategi:       values.strategi_label        || null,
    arah_kebijakan: values.arah_kebijakan_label  || null,
    program:        values.program_label         || null,
    kegiatan:       null,
    sub_kegiatan:   values.sub_kegiatan_label    || null,
  };

  const getStatus = (stepIdx) => {
    if (completedSteps.includes(stepIdx)) return "done";
    if (currentStep === stepIdx)          return "active";
    return "pending";
  };

  const savedTimeStr = lastSavedAt
    ? lastSavedAt.toLocaleTimeString("id-ID", {
        hour:   "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const totalDone  = completedSteps.length;
  const totalSteps = 8;
  const pct        = Math.round((totalDone / totalSteps) * 100);

  return (
    <div
      style={{
        width: 250,
        flexShrink: 0,
        position: "sticky",
        top: 72,
        alignSelf: "flex-start",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a237e 0%, #0d6efd 100%)",
          borderRadius: "12px 12px 0 0",
          padding: "14px 16px 12px",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>
          📋 Konteks Pengisian
        </div>
        {(dokumen || tahun) && (
          <div style={{ fontSize: 10, opacity: 0.75 }}>
            {[dokumen, tahun].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Progress bar */}
        <div
          style={{
            marginTop: 10,
            background: "rgba(255,255,255,0.25)",
            borderRadius: 4,
            height: 5,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "#fff",
              borderRadius: 4,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>
          {totalDone}/{totalSteps} langkah selesai
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: "0 0 12px 12px",
          border: "1px solid #dee2e6",
          borderTop: "none",
          padding: "12px 10px 10px",
        }}
      >
        {HIERARCHY.map((item, i) => (
          <HierarchyItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={labelMap[item.key]}
            status={getStatus(item.stepIdx)}
            isLast={i === HIERARCHY.length - 1}
          />
        ))}

        {/* ── Auto-save badge ── */}
        <div
          style={{
            marginTop: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: savedTimeStr ? "#d1e7dd" : "#fff3cd",
            border: `1px solid ${savedTimeStr ? "#badbcc" : "#ffc107"}`,
            fontSize: 11,
            color: savedTimeStr ? "#0a3622" : "#664d03",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{savedTimeStr ? "💾" : "⏳"}</span>
          <span>
            {savedTimeStr
              ? `Tersimpan otomatis ${savedTimeStr}`
              : "Belum ada perubahan tersimpan"}
          </span>
        </div>

        {/* ── Tip ── */}
        <div
          style={{
            marginTop: 8,
            padding: "7px 10px",
            borderRadius: 8,
            background: "#e7f0ff",
            border: "1px solid #b6d0ff",
            fontSize: 10,
            color: "#084298",
            lineHeight: 1.5,
          }}
        >
          💡 Data tersimpan otomatis. Jika halaman di-refresh, posisi &amp; isian
          akan dipulihkan.
        </div>
      </div>
    </div>
  );
}
