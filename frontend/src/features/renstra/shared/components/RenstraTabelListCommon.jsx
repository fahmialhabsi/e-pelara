import React from "react";
import { Typography } from "antd";

const { Text } = Typography;

export const formatNumber = (num) =>
  num === null || num === undefined || num === ""
    ? "—"
    : Number(num).toLocaleString("id-ID", { minimumFractionDigits: 2 });

export const formatNumberShort = (num) =>
  num === null || num === undefined || num === ""
    ? "—"
    : Number(num).toLocaleString("id-ID", { maximumFractionDigits: 0 });

/** Grid 6 slot periode (target / pagu) untuk baris expand */
export function TahunGrid({ record, prefix, label }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
        {label}
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(88px, 1fr))",
          gap: "6px 10px",
          fontSize: 12,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={`${prefix}-${i}`}
            style={{
              padding: "6px 8px",
              background: "#fff",
              border: "1px solid #f0f0f0",
              borderRadius: 4,
            }}
          >
            <div style={{ color: "#8c8c8c", fontSize: 11 }}>Th {i}</div>
            <div style={{ fontVariantNumeric: "tabular-nums" }}>
              {prefix === "pagu"
                ? formatNumberShort(record[`${prefix}_tahun_${i}`])
                : formatNumber(record[`${prefix}_tahun_${i}`])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Detail expand standar: baseline + satuan + pasangan label opsional, lalu target & pagu per slot periode.
 * @param {Array<{ label: string, value: React.ReactNode }>} extraMeta
 */
export function StandardRenstraExpandedRow({ record, extraMeta = [] }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#fafafa",
        borderRadius: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 16px",
          marginBottom: 12,
          fontSize: 13,
        }}
      >
        <span>
          <Text type="secondary">Baseline: </Text>
          <Text>{record.baseline ?? "—"}</Text>
        </span>
        <span>
          <Text type="secondary">Satuan: </Text>
          <Text>{record.satuan_target ?? "—"}</Text>
        </span>
        {extraMeta.map(({ label, value }, idx) => (
          <span key={`${label}-${idx}`}>
            <Text type="secondary">{label}: </Text>
            <Text>{value ?? "—"}</Text>
          </span>
        ))}
      </div>
      <TahunGrid record={record} prefix="target" label="Target per slot periode (th. ke-1 s/d ke-6)" />
      <TahunGrid record={record} prefix="pagu" label="Pagu per slot periode (th. ke-1 s/d ke-6, Rp)" />
    </div>
  );
}

export const renstraTabelListTableProps = {
  size: "small",
  bordered: true,
  pagination: { pageSize: 10, showSizeChanger: true },
  scroll: { x: 1100 },
};

export const renstraTabelListPageShellStyle = {
  padding: 24,
  maxWidth: 1400,
  margin: "0 auto",
};
