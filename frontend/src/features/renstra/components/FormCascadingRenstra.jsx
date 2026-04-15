import React, { useCallback, useEffect, useRef, useState } from "react";
import { Form, Row, Col } from "react-bootstrap";
import api from "../../../services/api";
import { useDokumen } from "../../../hooks/useDokumen";
import { normalizeListItems } from "../../../utils/apiResponse";

const FIELD_CONFIG = [
  {
    field: "tujuan_id",
    label: "Tujuan",
    endpoint: "/tujuan",
    parentField: null,
    optionKey: "tujuan",
    getLabel: (item) => `${item.no_tujuan || "-"} - ${item.isi_tujuan || "-"}`,
  },
  {
    field: "sasaran_id",
    label: "Sasaran",
    endpoint: "/sasaran",
    parentField: "tujuan_id",
    optionKey: "sasaran",
    getLabel: (item) => `${item.nomor || "-"} - ${item.isi_sasaran || "-"}`,
  },
  {
    field: "strategi_id",
    label: "Strategi",
    endpoint: "/strategi",
    parentField: "sasaran_id",
    optionKey: "strategi",
    getLabel: (item) =>
      `${item.kode_strategi || "-"} - ${item.deskripsi || "-"}`,
  },
  {
    field: "arah_kebijakan_id",
    label: "Arah Kebijakan",
    endpoint: "/arah-kebijakan",
    parentField: "strategi_id",
    optionKey: "arahKebijakan",
    getLabel: (item) => `${item.kode_arah || "-"} - ${item.deskripsi || "-"}`,
  },
  {
    field: "program_id",
    label: "Program",
    endpoint: "/programs",
    parentField: "sasaran_id",
    optionKey: "program",
    getLabel: (item) => `${item.kode_program || "-"} - ${item.nama_program || "-"}`,
  },
  {
    field: "kegiatan_id",
    label: "Kegiatan",
    endpoint: "/kegiatan",
    parentField: "program_id",
    optionKey: "kegiatan",
    getLabel: (item) =>
      `${item.kode_kegiatan || "-"} - ${item.nama_kegiatan || "-"}`,
  },
  {
    field: "sub_kegiatan_id",
    label: "Sub Kegiatan",
    endpoint: "/sub-kegiatan",
    parentField: "kegiatan_id",
    optionKey: "subKegiatan",
    getLabel: (item) =>
      `${item.kode_sub_kegiatan || "-"} - ${item.nama_sub_kegiatan || "-"}`,
  },
];

const EMPTY_OPTIONS = {
  tujuan: [],
  sasaran: [],
  strategi: [],
  arahKebijakan: [],
  program: [],
  kegiatan: [],
  subKegiatan: [],
};

const FIELD_TO_QUERY = {
  tujuan_id: null,
  sasaran_id: "tujuan_id",
  strategi_id: "sasaran_id",
  arah_kebijakan_id: "strategi_id",
  program_id: "sasaran_id",
  kegiatan_id: "program_id",
  sub_kegiatan_id: "kegiatan_id",
};

const ENDPOINT_PARAM_KEY = {
  sasaran_id: "tujuan_id",
  strategi_id: "sasaran_id",
  arah_kebijakan_id: "strategi_id",
  program_id: "sasaran_id",
  kegiatan_id: "program_id",
  sub_kegiatan_id: "kegiatan_id",
};

const FormCascadingRenstra = ({
  onChange,
  value = {},
  disabled = false,
  required = false,
}) => {
  const { dokumen, tahun } = useDokumen();
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [loadingField, setLoadingField] = useState("");
  const controllersRef = useRef({});

  const abortFieldRequest = useCallback((field) => {
    controllersRef.current[field]?.abort?.();
    delete controllersRef.current[field];
  }, []);

  const clearChildren = useCallback(
    (changedField, baseValue) => {
      const nextValue = { ...baseValue };
      let shouldReset = false;

      FIELD_CONFIG.forEach((config) => {
        if (config.field === changedField) {
          shouldReset = true;
          return;
        }

        if (shouldReset) {
          nextValue[config.field] = "";
        }
      });

      return nextValue;
    },
    [],
  );

  const clearChildOptions = useCallback((changedField) => {
    let shouldReset = false;

    setOptions((prev) => {
      const nextOptions = { ...prev };

      FIELD_CONFIG.forEach((config) => {
        if (config.field === changedField) {
          shouldReset = true;
          return;
        }

        if (shouldReset) {
          nextOptions[config.optionKey] = [];
          abortFieldRequest(config.field);
        }
      });

      return nextOptions;
    });
  }, [abortFieldRequest]);

  const fetchOptions = useCallback(
    async (field, parentValue = "") => {
      const config = FIELD_CONFIG.find((item) => item.field === field);
      if (!config || !dokumen || !tahun) return;

      const params = {
        jenis_dokumen: dokumen,
        tahun,
      };

      const paramKey = ENDPOINT_PARAM_KEY[field];
      if (paramKey && parentValue) {
        params[paramKey] = parentValue;
      }

      abortFieldRequest(field);
      const controller = new AbortController();
      controllersRef.current[field] = controller;
      setLoadingField(field);

      try {
        const res = await api.get(config.endpoint, {
          params,
          signal: controller.signal,
        });
        const rows = normalizeListItems(res.data);

        setOptions((prev) => ({
          ...prev,
          [config.optionKey]: rows,
        }));

        if (value[field] && !rows.some((item) => String(item.id) === String(value[field]))) {
          const nextValue = clearChildren(field, {
            ...value,
            [field]: "",
          });
          onChange?.(nextValue);
        }
      } catch (error) {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          return;
        }

        setOptions((prev) => ({
          ...prev,
          [config.optionKey]: [],
        }));
      } finally {
        if (controllersRef.current[field] === controller) {
          delete controllersRef.current[field];
        }
        setLoadingField((current) => (current === field ? "" : current));
      }
    },
    [abortFieldRequest, clearChildren, dokumen, onChange, tahun, value],
  );

  useEffect(() => {
    if (!dokumen || !tahun) return;

    setOptions(EMPTY_OPTIONS);
    fetchOptions("tujuan_id");
  }, [dokumen, tahun, fetchOptions]);

  useEffect(() => {
    if (value.tujuan_id) {
      fetchOptions("sasaran_id", value.tujuan_id);
    }
  }, [fetchOptions, value.tujuan_id]);

  useEffect(() => {
    if (value.sasaran_id) {
      fetchOptions("strategi_id", value.sasaran_id);
      fetchOptions("program_id", value.sasaran_id);
    }
  }, [fetchOptions, value.sasaran_id]);

  useEffect(() => {
    if (value.strategi_id) {
      fetchOptions("arah_kebijakan_id", value.strategi_id);
    }
  }, [fetchOptions, value.strategi_id]);

  useEffect(() => {
    if (value.program_id) {
      fetchOptions("kegiatan_id", value.program_id);
    }
  }, [fetchOptions, value.program_id]);

  useEffect(() => {
    if (value.kegiatan_id) {
      fetchOptions("sub_kegiatan_id", value.kegiatan_id);
    }
  }, [fetchOptions, value.kegiatan_id]);

  useEffect(() => {
    return () => {
      Object.values(controllersRef.current).forEach((controller) =>
        controller?.abort?.(),
      );
    };
  }, []);

  const handleChange = async (field, selectedId) => {
    const normalizedValue = selectedId ? String(selectedId) : "";
    const nextValue = clearChildren(field, {
      ...value,
      [field]: normalizedValue,
    });

    onChange?.(nextValue);
    clearChildOptions(field);

    const nextFields = FIELD_CONFIG.filter((item) => {
      const queryField = FIELD_TO_QUERY[item.field];
      return queryField === field;
    });

    for (const nextField of nextFields) {
      if (normalizedValue) {
        await fetchOptions(nextField.field, normalizedValue);
      }
    }
  };

  const renderSelect = (config) => {
    const parentValue = config.parentField ? value[config.parentField] : true;
    const fieldOptions = options[config.optionKey] || [];

    return (
      <Form.Group as={Col} md={6} className="mb-3" key={config.field}>
        <Form.Label>
          {config.label} {required && <span className="text-danger">*</span>}
        </Form.Label>
        <Form.Select
          value={value[config.field] || ""}
          onChange={(event) => handleChange(config.field, event.target.value)}
          disabled={disabled || loadingField === config.field || !parentValue}
          isInvalid={required && !value[config.field]}
        >
          <option value="">-- Pilih {config.label} --</option>
          {fieldOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {config.getLabel(option)}
            </option>
          ))}
        </Form.Select>
        {required && !value[config.field] && (
          <Form.Control.Feedback type="invalid">
            {config.label} wajib dipilih.
          </Form.Control.Feedback>
        )}
      </Form.Group>
    );
  };

  return (
    <Form noValidate>
      <Row>{FIELD_CONFIG.map(renderSelect)}</Row>
    </Form>
  );
};

export default FormCascadingRenstra;
