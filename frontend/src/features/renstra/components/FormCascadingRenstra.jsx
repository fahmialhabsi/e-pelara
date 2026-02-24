// src/features/renstra/components/FormCascadingRenstra.jsx
import React, { useEffect, useState } from "react";
import { Form, Row, Col } from "react-bootstrap";
import api from "../../../services/api";

const FormCascadingRenstra = ({
  onChange,
  value = {},
  disabled = false,
  required = false,
}) => {
  const [options, setOptions] = useState({
    tujuan: [],
    sasaran: [],
    strategi: [],
    arahKebijakan: [],
    program: [],
    kegiatan: [],
    subKegiatan: [],
  });
  const [loadingField, setLoadingField] = useState("");

  const fetchOptions = async (field, endpoint, query = {}) => {
    setLoadingField(field);
    try {
      const res = await api.get(endpoint, { params: query });
      setOptions((prev) => ({ ...prev, [field]: res.data || [] }));
    } catch {
      setOptions((prev) => ({ ...prev, [field]: [] }));
    } finally {
      setLoadingField("");
    }
  };

  useEffect(() => {
    fetchOptions("tujuan", "/rpjmd/tujuan");
  }, []);

  const handleChange = (field, selectedId) => {
    const newVal = { ...value, [field]: selectedId };
    onChange(newVal);

    const resetFields = {
      tujuan_id: [
        "sasaran_id",
        "strategi_id",
        "arah_kebijakan_id",
        "program_id",
        "kegiatan_id",
        "sub_kegiatan_id",
      ],
      sasaran_id: [
        "strategi_id",
        "arah_kebijakan_id",
        "program_id",
        "kegiatan_id",
        "sub_kegiatan_id",
      ],
      strategi_id: ["arah_kebijakan_id"],
      program_id: ["kegiatan_id", "sub_kegiatan_id"],
      kegiatan_id: ["sub_kegiatan_id"],
    };

    if (resetFields[field]) {
      const reset = {};
      resetFields[field].forEach((f) => (reset[f] = ""));
      onChange({ ...newVal, ...reset });
    }

    switch (field) {
      case "tujuan_id":
        fetchOptions("sasaran", "/rpjmd/sasaran", { tujuan_id: selectedId });
        break;
      case "sasaran_id":
        fetchOptions("strategi", "/rpjmd/strategi", { sasaran_id: selectedId });
        fetchOptions("program", "/rpjmd/program", { sasaran_id: selectedId });
        break;
      case "strategi_id":
        fetchOptions("arahKebijakan", "/rpjmd/arah-kebijakan", {
          strategi_id: selectedId,
        });
        break;
      case "program_id":
        fetchOptions("kegiatan", "/rpjmd/kegiatan", { program_id: selectedId });
        break;
      case "kegiatan_id":
        fetchOptions("subKegiatan", "/rpjmd/sub-kegiatan", {
          kegiatan_id: selectedId,
        });
        break;
      default:
        break;
    }
  };

  const renderSelect = (field, label, dataKey = field) => (
    <Form.Group as={Col} md={6} className="mb-3">
      <Form.Label>
        {label} {required && <span className="text-danger">*</span>}
      </Form.Label>
      <Form.Select
        value={value[field] || ""}
        onChange={(e) => handleChange(field, e.target.value)}
        disabled={disabled || loadingField === field}
        isInvalid={required && !value[field]}
      >
        <option value="">-- Pilih {label} --</option>
        {options[dataKey].map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.nama || opt.judul || opt.kode || "-"}
          </option>
        ))}
      </Form.Select>
      {required && !value[field] && (
        <Form.Control.Feedback type="invalid">
          {label} wajib dipilih.
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );

  return (
    <Form noValidate>
      <Row>
        {renderSelect("tujuan_id", "Tujuan")}
        {renderSelect("sasaran_id", "Sasaran")}
        {renderSelect("strategi_id", "Strategi")}
        {renderSelect("arah_kebijakan_id", "Arah Kebijakan", "arahKebijakan")}
        {renderSelect("program_id", "Program")}
        {renderSelect("kegiatan_id", "Kegiatan")}
        {renderSelect("sub_kegiatan_id", "Sub Kegiatan", "subKegiatan")}
      </Row>
    </Form>
  );
};

export default FormCascadingRenstra;
