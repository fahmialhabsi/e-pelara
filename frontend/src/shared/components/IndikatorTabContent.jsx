// src/components/IndikatorTabContent.jsx

import React from "react";
import { Col, Form } from "react-bootstrap";
import Select from "react-select";
import { formatOpdPenanggungLabel } from "@/utils/opdDisplayLabel";

export default function IndikatorTabContent({
  tabKey,
  fields,
  values,
  errors,
  touched,
  setFieldValue,
  opdOptions = [],
  stepOptions = [],
  handleFieldChange,
  handleFieldChangeWithUnit,
}) {
  return (
    <>
      {fields[tabKey]?.map((field) => {
        if (!field) return null;

        // Dropdown Tujuan
        if (field.type === "tujuan") {
          const tujuanOptions = (stepOptions.length > 0 ? stepOptions : []).map(
            (t) => ({
              value: t.id,
              label: `${t.no_tujuan} - ${t.isi_tujuan}`,
            })
          );

          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Select
                name={field.name}
                options={tujuanOptions}
                value={
                  tujuanOptions.find(
                    (opt) => opt.value === values[field.name]
                  ) || null
                }
                onChange={(selected) =>
                  setFieldValue(field.name, selected?.value || "")
                }
                placeholder={field.placeholder}
                isClearable
              />
            </Form.Group>
          );
        }

        // Dropdown Sasaran
        if (field.name === "sasaran_id") {
          const sasaranOptions = (
            stepOptions.length > 0 ? stepOptions : []
          ).map((s) => ({
            value: s.id,
            label: `${s.nomor} - ${s.isi_sasaran}`,
          }));

          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label || "Pilih Sasaran"}</Form.Label>
              <Select
                name={field.name}
                options={sasaranOptions}
                value={
                  sasaranOptions.find(
                    (opt) => opt.value === values[field.name]
                  ) || null
                }
                onChange={(selected) =>
                  setFieldValue(field.name, selected?.value || "")
                }
                placeholder="Pilih Sasaran"
                isClearable
              />
            </Form.Group>
          );
        }

        // Dropdown OPD — value string konsisten dengan normalizeListItems + Yup penanggung_jawab string
        if (field.type === "opd") {
          const opdList = opdOptions.map((opd) => ({
            value: String(opd.value ?? opd.id ?? ""),
            label: formatOpdPenanggungLabel(opd),
          }));

          const raw = values[field.name];
          const hasId =
            raw !== null &&
            raw !== undefined &&
            String(raw).trim() !== "";
          const selectedOption = hasId
            ? opdList.find((opt) => String(opt.value) === String(raw)) ?? null
            : null;

          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Select
                name={field.name}
                options={opdList}
                value={selectedOption}
                onChange={(opt) =>
                  setFieldValue(
                    field.name,
                    opt != null && opt.value !== "" && opt.value != null
                      ? String(opt.value)
                      : "",
                  )
                }
                placeholder={field.placeholder || "Pilih OPD"}
                isClearable
              />
            </Form.Group>
          );
        }

        // Textarea
        if (field.type === "textarea") {
          return (
            <Form.Group as={Col} md={12} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={values[field.name] || ""}
                onChange={handleFieldChange(field.name)}
                isInvalid={touched[field.name] && !!errors[field.name]}
              />
              <Form.Control.Feedback type="invalid">
                {errors[field.name]}
              </Form.Control.Feedback>
            </Form.Group>
          );
        }

        // Select umum
        if (field.type === "select") {
          const opts = field.options || [];
          return (
            <Form.Group as={Col} md={6} key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              <Form.Select
                name={field.name}
                value={values[field.name] || ""}
                onChange={(e) => setFieldValue(field.name, e.target.value)}
                isInvalid={touched[field.name] && !!errors[field.name]}
              >
                <option value="">-</option>
                {opts.map((opt, i) => (
                  <option key={i} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {errors[field.name]}
              </Form.Control.Feedback>
            </Form.Group>
          );
        }

        // Input default
        const numericFields = [
          "baseline",
          "target_tahun_1",
          "target_tahun_2",
          "target_tahun_3",
          "target_tahun_4",
          "target_tahun_5",
          "capaian_tahun_1",
          "capaian_tahun_2",
          "capaian_tahun_3",
          "capaian_tahun_4",
          "capaian_tahun_5",
        ];

        const isNumericField = numericFields.includes(field.name);

        return (
          <Form.Group as={Col} md={6} key={field.name}>
            <Form.Label>{field.label}</Form.Label>
            <Form.Control
              name={field.name}
              type="text"
              value={values[field.name] || ""}
              onChange={
                field.readOnly
                  ? undefined
                  : isNumericField
                  ? handleFieldChangeWithUnit(field.name)
                  : handleFieldChange(field.name)
              }
              isInvalid={touched[field.name] && !!errors[field.name]}
              readOnly={field.readOnly || false}
              placeholder={
                field.placeholder ||
                (isNumericField ? "Masukkan angka saja" : "")
              }
            />
            <Form.Control.Feedback type="invalid">
              {errors[field.name]}
            </Form.Control.Feedback>
          </Form.Group>
        );
      })}
    </>
  );
}
