import React from "react";

const Dropdown = ({ label, options, value, onChange, disabled }) => {
  return (
    <div className="mb-3">
      {label && <label className="block font-medium mb-1">{label}</label>}
      <select
        className="form-select w-full"
        value={value}
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
