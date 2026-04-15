import React, { useMemo } from "react";

/** Nilai aman untuk <select>: jika value tidak ada di options, pakai "" agar tidak "nyangkut" ke opsi salah. */
function normalizeSelectValue(value, options) {
  const v = value === null || value === undefined ? "" : String(value);
  if (!v) return "";
  const ok = (options || []).some((o) => String(o.id) === v);
  return ok ? v : "";
}

const Dropdown = ({ label, options, value, onChange, disabled }) => {
  const safeValue = useMemo(
    () => normalizeSelectValue(value, options),
    [value, options],
  );

  return (
    <div className="mb-3">
      {label && <label className="block font-medium mb-1">{label}</label>}
      <select
        className="form-select w-full"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">-- Pilih --</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
