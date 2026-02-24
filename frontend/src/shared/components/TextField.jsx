// src/shared/components/TextField.jsx
import React from "react";
import { Field, ErrorMessage } from "formik";

const TextField = ({ name, label, readOnly = false }) => (
  <div>
    <label>{label}</label>
    <Field name={name} readOnly={readOnly} />
    <ErrorMessage name={name} component="div" className="text-danger" />
  </div>
);

export default TextField;
