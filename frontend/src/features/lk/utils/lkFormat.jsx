import React from "react";

/** Rp. xxx.xxx.xxx,xx — tanda minus hanya untuk nilai negatif (mis. sisa defisit). */
export function formatRupiah(n) {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return "Rp. 0,00";
  const neg = v < 0;
  const body = Math.abs(v).toLocaleString("id-ID", { minimumFractionDigits: 2 });
  return `${neg ? "-" : ""}Rp. ${body}`;
}

/** LAK / arus kas: pengeluaran (negatif) ditampilkan dalam kurung, tanpa tanda minus. */
export function formatRupiahLak(n) {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return "Rp. 0,00";
  const body = Math.abs(v).toLocaleString("id-ID", { minimumFractionDigits: 2 });
  if (v < 0) return `(Rp. ${body})`;
  return `Rp. ${body}`;
}

export function formatPersen(n) {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return "0,00 %";
  return `${v.toFixed(2)} %`;
}

/** Warna realisasi vs anggaran: &lt;50 merah, 50–79 kuning, ≥80 hijau */
export function warnaPersenRealisasi(persen) {
  const p = parseFloat(persen);
  if (Number.isNaN(p) || p <= 0) return "#999";
  if (p < 50) return "#c62828";
  if (p < 80) return "#f9a825";
  return "#2e7d32";
}

/**
 * Jangan tampilkan saldo negatif mentah — absolut + label defisit (BKU bendahara).
 */
export function tampilSaldo(saldo) {
  const n = parseFloat(saldo);
  const abs = Math.abs(n).toLocaleString("id-ID", { minimumFractionDigits: 2 });
  const warna = n < 0 ? "red" : "inherit";
  const label = n < 0 ? " (defisit)" : "";
  return (
    <span style={{ color: warna }}>
      Rp. {abs}
      {label}
    </span>
  );
}
