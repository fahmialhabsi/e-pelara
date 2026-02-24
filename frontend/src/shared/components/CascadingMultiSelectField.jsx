// src/shared/components/CascadingMultiSelectField.jsx
import React from "react";
import Select from "react-select";
import { Form } from "react-bootstrap";

export default function CascadingMultiSelectField({
  label,
  fieldKey,
  value,
  onChange,
  options = [],
  isMulti = false,
  isLoading = false,
  getOptionLabel = (key, item) => item.nama || "",
}) {
  const stringValue = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
    ? [value]
    : [];

  const mappedOptions = options.map((item) => ({
    value: String(item.id),
    label: getOptionLabel(fieldKey, item),
  }));

  const selectedValue = isMulti
    ? mappedOptions.filter((opt) => stringValue.includes(opt.value))
    : mappedOptions.find((opt) => opt.value === String(value));

  const handleChange = (selected) => {
    console.log("🧪 MultiSelect Changed:", selected);
    if (isMulti) {
      onChange(
        fieldKey,
        selected ? selected.map((s) => s.value.toString()) : []
      );
    } else {
      onChange(fieldKey, selected ? selected.value.toString() : "");
    }
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Select
        isMulti={isMulti}
        isLoading={isLoading}
        options={mappedOptions}
        value={selectedValue}
        onChange={handleChange}
        placeholder={`Pilih ${label}`}
      />
    </Form.Group>
  );
}
