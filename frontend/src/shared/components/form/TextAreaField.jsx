import React from "react";
import { Form, Input } from "antd";
import { Controller } from "react-hook-form";

const TextAreaField = ({
  name,
  label,
  control,
  errors,
  placeholder = "Masukkan deskripsi...",
  required = false,
  rows = 4,
}) => (
  <Form.Item
    label={label}
    required={required}
    validateStatus={errors?.[name] ? "error" : ""}
    help={errors?.[name]?.message}
  >
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Input.TextArea {...field} placeholder={placeholder} rows={rows} />
      )}
    />
  </Form.Item>
);

export default TextAreaField;
