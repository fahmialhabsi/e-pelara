import React from "react";
import { Form, Input } from "antd";
import { Controller } from "react-hook-form";

/**
 * InputField component with flexible validation rules
 */
const InputField = ({
  name,
  label,
  control,
  errors,
  placeholder = "Masukkan nilai...",
  required = false,
  disabled = false,
  readOnly = false,
  rules = {},
}) => {
  const validationRules = {
    ...rules,
    ...(required && !rules.required
      ? { required: `${label || name} wajib diisi` }
      : {}),
  };

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
        rules={validationRules}
        defaultValue=""
        render={({ field }) => (
          <Input
            {...field}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
          />
        )}
      />
    </Form.Item>
  );
};

export default InputField;
