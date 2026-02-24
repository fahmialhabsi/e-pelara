import React from "react";
import { Form, Select } from "antd";
import { Controller } from "react-hook-form";

const { Option } = Select;

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
  rules = {}, // 🆕 Tambahkan rules
}) => {
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
        rules={rules} // 🆕 Pasang rules di Controller
        render={({ field }) => (
          <Select
            disabled={disabled}
            loading={loading}
            placeholder={placeholder}
            showSearch
            optionFilterProp="children"
            allowClear
            onChange={(value) => {
              field.onChange(value);
              onChange(value);
            }}
            value={field.value}
          >
            {options.map((item) => (
              <Option key={item[valueField]} value={item[valueField]}>
                {item[labelField]}
              </Option>
            ))}
          </Select>
        )}
      />
    </Form.Item>
  );
};

export default SelectWithLabelValue;
