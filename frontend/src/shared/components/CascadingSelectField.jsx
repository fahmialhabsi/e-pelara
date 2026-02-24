// src/shared/components/CascadingSelectField.jsx
import React from "react";
import { Form, Spinner } from "react-bootstrap";

function CascadingSelectField({
  label,
  fieldKey,
  value,
  onChange,
  options = [],
  loading = false,
  isMulti = false,
  getOptionLabel = (key, item) => item.nama || "",
}) {
  const controlledValue = isMulti
    ? Array.isArray(value)
      ? value.map(String)
      : []
    : value !== undefined && value !== null
    ? String(value)
    : "";

  return (
    <Form.Group className="mb-3" controlId={`select-${fieldKey}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Select
        multiple={isMulti}
        value={controlledValue}
        onChange={onChange}
        disabled={loading}
      >
        {!isMulti && (
          <option value="" disabled>
            Pilih {label}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.id} value={String(opt.id)}>
            {getOptionLabel(fieldKey, opt)}
          </option>
        ))}
      </Form.Select>
      {loading && (
        <div className="mt-1">
          <Spinner animation="border" size="sm" /> Memuat {label}...
        </div>
      )}
    </Form.Group>
  );
}

export default CascadingSelectField;
