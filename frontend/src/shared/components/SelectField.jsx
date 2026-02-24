// src/shared/components/SelectField.jsx
import React from "react";
import { Form, Spinner } from "react-bootstrap";

const getOptionLabel = (key, item) => {
  switch (key) {
    case "misi":
      return `${item.no_misi} - ${item.isi_misi}`;
    case "priorNasional":
      return `${item.kode_prionas} - ${item.nama_prionas}`;
    case "priorDaerah":
      return `${item.kode_prioda} - ${item.nama_prioda}`;
    case "priorKepda":
      return `${item.kode_priogub} - ${item.nama_priogub}`;
    case "tujuan":
      return `${item.no_tujuan} - ${item.isi_tujuan}`;
    case "sasaran":
      return `${item.nomor} - ${item.isi_sasaran}`;
    case "strategi":
      return `${item.kode_strategi} - ${item.deskripsi}`;
    case "arahKebijakan":
      return `${item.kode_arah} - ${item.nama_arah || item.deskripsi}`;
    case "program":
      return `${item.kode_program} - ${item.nama_program}`;
    case "kegiatan":
      return `${item.kode_kegiatan} - ${item.nama_kegiatan}`;
    default:
      return item.nama || "";
  }
};

const SelectField = ({
  label,
  fieldKey,
  value,
  onChange,
  options = [],
  loading = false,
}) => (
  <Form.Group className="mb-3">
    <Form.Label>{label}</Form.Label>
    <Form.Select value={value ?? ""} onChange={onChange} disabled={loading}>
      <option value="">— Pilih {label} —</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {getOptionLabel(fieldKey, opt)}
        </option>
      ))}
    </Form.Select>
    {loading && <Spinner size="sm" animation="border" className="mt-1" />}
  </Form.Group>
);

export default SelectField;
