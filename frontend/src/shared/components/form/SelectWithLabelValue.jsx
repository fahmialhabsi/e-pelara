import React from "react";
import { Form, Select } from "antd";
import { Controller } from "react-hook-form";

/**
 * Ant Design 5: gunakan prop `options` (bukan <Option/>) agar value/label selaras
 * dan label terpilih tampil konsisten dengan react-hook-form.
 */
const SelectWithLabelValue = ({
  name,
  label,
  control,
  errors,
  options = [],
  loading = false,
  required = false,
  placeholder = "Pilih salah satu...",
  labelField = "label",
  valueField = "value",
  onChange = () => {},
  disabled = false,
  rules = {},
  valueAsNumber = false,
}) => {
  const normalize = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (!valueAsNumber) return v;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };

  const selectOptions = (options || [])
    .map((item) => {
      const raw = item[valueField];
      const val = normalize(raw);
      if (valueAsNumber && val === undefined) return null;
      // Ant Design 5 Select + numeric ids: gunakan string di options/value agar
      // label terpilih tidak hilang (perbandingan value/option konsisten).
      return {
        label: item[labelField],
        value: valueAsNumber ? String(val) : val,
      };
    })
    .filter(Boolean);

  return (
    <Form.Item
      label={label}
      required={required}
      validateStatus={errors?.[name] ? "error" : ""}
      help={errors?.[name]?.message}
    >
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => {
          const num = normalize(field.value);
          const selectValue = valueAsNumber
            ? num === undefined
              ? undefined
              : String(num)
            : field.value;

          return (
            <Select
              disabled={disabled}
              loading={loading}
              placeholder={placeholder}
              showSearch
              optionFilterProp="label"
              allowClear
              options={selectOptions}
              onChange={(value) => {
                if (valueAsNumber) {
                  const out =
                    value === undefined || value === null || value === ""
                      ? undefined
                      : Number(value);
                  const finalOut =
                    out === undefined || Number.isNaN(out) ? undefined : out;
                  field.onChange(finalOut);
                  onChange(finalOut);
                } else {
                  const out = normalize(value);
                  field.onChange(out);
                  onChange(out);
                }
              }}
              value={selectValue}
            />
          );
        }}
      />
    </Form.Item>
  );
};

export default SelectWithLabelValue;
