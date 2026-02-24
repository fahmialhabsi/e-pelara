// src/components/RenstraBabEditor.js

import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Form,
  ListGroup,
  Spinner,
} from "react-bootstrap";
import * as XLSX from "xlsx";

export default function RenstraBabEditor({
  title,
  subbabFields,
  initialData,
  onSave,
  loading,
}) {
  const [form, setForm] = useState(initialData || {});
  const [editKey, setEditKey] = useState(null);

  const [newListValue, setNewListValue] = useState("");
  const [newTableRow, setNewTableRow] = useState({});

  useEffect(() => {
    setForm(initialData || {});
  }, [initialData]);

  const handleAddToList = (key) => {
    if (newListValue.trim()) {
      setForm((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), newListValue],
      }));
      setNewListValue("");
    }
  };

  const handleDeleteFromList = (key, idx) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  const handleAddTableRow = (key, columns) => {
    if (!columns.every((col) => newTableRow[col]?.toString().trim() !== ""))
      return;
    setForm((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newTableRow],
    }));
    setNewTableRow({});
  };

  const handleDeleteTableRow = (key, idx) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  const handleImportTable = (key, columns, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const [header, ...rows] = data;
      const colIndex = columns.map((col) =>
        header.findIndex((h) =>
          h?.toString().toLowerCase().includes(col.toLowerCase())
        )
      );
      const tableData = rows
        .filter(
          (row) =>
            row.length &&
            row.some(
              (cell) => cell !== undefined && cell !== null && cell !== ""
            )
        )
        .map((row) =>
          Object.fromEntries(
            columns.map((col, i) => [
              col,
              row[colIndex[i]] !== undefined ? row[colIndex[i]] : "",
            ])
          )
        );

      setForm((prev) => ({
        ...prev,
        [key]: tableData,
      }));
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = () => {
    if (typeof onSave === "function") onSave(form);
    setEditKey(null);
  };

  return (
    <div>
      <h3 className="fw-bold mb-4">{title}</h3>
      {subbabFields.map(({ key, label, type, columns, sumber }) => (
        <Card className="mb-3 shadow-sm" key={key}>
          <CardBody>
            <h5 className="fw-semibold">{label}</h5>
            {sumber && (
              <div className="text-muted small mb-2">
                <em>Sumber: {sumber}</em>
              </div>
            )}

            {editKey === key ? (
              type === "list" ? (
                <>
                  <ListGroup className="mb-2">
                    {(form[key] || []).map((item, idx) => (
                      <ListGroup.Item
                        key={idx}
                        className="d-flex justify-content-between align-items-center"
                      >
                        {item}
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDeleteFromList(key, idx)}
                        >
                          Hapus
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                  <div className="d-flex mb-2">
                    <Form.Control
                      value={newListValue}
                      onChange={(e) => setNewListValue(e.target.value)}
                      placeholder="Tambah item..."
                      className="me-2"
                    />
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleAddToList(key)}
                    >
                      Tambah
                    </Button>
                  </div>
                </>
              ) : type === "table" ? (
                <>
                  <div className="mb-2">
                    <input
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      style={{ display: "none" }}
                      id={`import-excel-${key}`}
                      onChange={(e) => handleImportTable(key, columns, e)}
                    />
                    <label htmlFor={`import-excel-${key}`}>
                      <Button as="span" size="sm" variant="outline-success">
                        Import dari Excel
                      </Button>
                    </label>
                    <span className="text-muted ms-2 small">
                      Format header: {columns.join(", ")}
                    </span>
                  </div>
                  <table className="table table-bordered mb-2">
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form[key] || []).map((row, idx) => (
                        <tr key={idx}>
                          {columns.map((col) => (
                            <td key={col}>{row[col]}</td>
                          ))}
                          <td>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDeleteTableRow(key, idx)}
                            >
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        {columns.map((col) => (
                          <td key={col}>
                            <Form.Control
                              value={newTableRow[col] || ""}
                              onChange={(e) =>
                                setNewTableRow((prev) => ({
                                  ...prev,
                                  [col]: e.target.value,
                                }))
                              }
                              size="sm"
                              placeholder={col}
                            />
                          </td>
                        ))}
                        <td>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleAddTableRow(key, columns)}
                          >
                            Tambah
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <Form.Control
                  as="textarea"
                  rows={type === "textarea" ? 5 : 3}
                  value={form[key] || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mb-2"
                />
              )
            ) : type === "list" ? (
              <ul>
                {(form[key] || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : type === "table" ? (
              <table className="table table-bordered">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(form[key] || []).map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => (
                        <td key={col}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="mb-2">{form[key]}</div>
            )}

            <div className="mt-2">
              {editKey === key ? (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleSave}
                    className="me-2"
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Simpan"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditKey(null)}
                  >
                    Batal
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setEditKey(key)}
                >
                  Edit
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
