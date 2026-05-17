import React, { useState } from "react";
import { Controller } from "react-hook-form";

const formatRupiah = (value) => {
  const num = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const onlyNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : 0;
  }

  let raw = String(value).trim();

  // Format backend/desimal: 180000000.00
  if (/^\d+\.\d{1,2}$/.test(raw)) {
    return Math.round(Number(raw));
  }

  // Format Indonesia/Rupiah: Rp 180.000.000
  raw = raw.replace(/[^\d,-]/g, "");
  raw = raw.replace(/\./g, "");
  raw = raw.replace(",", ".");

  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

export default function CurrencyInputField({
  name,
  label,
  control,
  errors,
  required = false,
  disabled = false,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <label style={{ display: "block", marginBottom: 4 }}>
          {required && <span style={{ color: "red" }}>* </span>}
          {label}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            {...field}
            disabled={disabled}
            value={
              focused
                ? String(onlyNumber(field.value ?? 0))
                : formatRupiah(onlyNumber(field.value))
            }
            onFocus={() => setFocused(true)}
            onBlur={() => {
              field.onChange(onlyNumber(field.value));
              setFocused(false);
              field.onBlur();
            }}
            onChange={(e) => {
              field.onChange(onlyNumber(e.target.value));
            }}
            style={{
              width: "100%",
              padding: "6px 10px",
              border: errors?.[name] ? "1px solid #ff4d4f" : "1px solid #d9d9d9",
              borderRadius: 6,
              backgroundColor: disabled ? "#f5f5f5" : "#fff",
            }}
          />
        )}
      />

      {errors?.[name] && (
        <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>
          {errors[name]?.message}
        </div>
      )}
    </div>
  );
}