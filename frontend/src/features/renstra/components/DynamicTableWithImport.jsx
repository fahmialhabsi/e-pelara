import React, { useState } from "react";
import { Button, Form, Card, CardBody, Table, Modal } from "react-bootstrap";
import * as XLSX from "xlsx";

// validasi apakah columns yang diharapkan sudah ada di tabel import
const validateColumns = (importedCols, expectedCols) => {
  if (!expectedCols || expectedCols.length === 0)
    return { valid: true, missing: [], extra: [] };
  const missing = expectedCols.filter((col) => !importedCols.includes(col));
  const extra = importedCols.filter((col) => !expectedCols.includes(col));
  return { valid: missing.length === 0, missing, extra };
};

export default function DynamicTableWithImport({
  label,
  value,
  onChange,
  expectedColumns = [], // Optional: columns yang diharapkan (boleh kosong)
}) {
  const [tableData, setTableData] = useState(value?.tabel || []);
  const [columns, setColumns] = useState(value?.columns || []);
  const [sumber, setSumber] = useState(value?.sumber || "");
  const [importModal, setImportModal] = useState(false);
  const [colMapping, setColMapping] = useState({});
  const [importedPreview, setImportedPreview] = useState([]);
  const [importedHeader, setImportedHeader] = useState([]);

  // Import Excel logic
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!data.length) return;
      setImportedHeader(data[0]);
      setImportedPreview(data.slice(1));
      // default mapping: mapping ke expectedColumns jika cocok, else tetap
      const defaultMapping = {};
      (expectedColumns.length > 0 ? expectedColumns : data[0]).forEach(
        (col, i) => {
          defaultMapping[col] =
            data[0].find((h) => h?.toLowerCase().includes(col.toLowerCase())) ||
            data[0][i] ||
            "";
        }
      );
      setColMapping(defaultMapping);
      setImportModal(true);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Selesai mapping dan import
  const handleApplyImport = () => {
    // mapping colMapping: { "Pangkat": "Pangkat", ... }
    const mappedColumns = Object.keys(colMapping);
    const idxByCol = mappedColumns.map((col) =>
      importedHeader.indexOf(colMapping[col])
    );
    const newTable = importedPreview.map((row) =>
      Object.fromEntries(
        mappedColumns.map((col, i) => [col, row[idxByCol[i]] ?? ""])
      )
    );
    setColumns(mappedColumns);
    setTableData(newTable);
    setImportModal(false);
    if (onChange) onChange({ tabel: newTable, columns: mappedColumns, sumber });
  };

  // Update table cell
  const updateCell = (rowIdx, col, val) => {
    const updated = tableData.map((row, idx) =>
      idx === rowIdx ? { ...row, [col]: val } : row
    );
    setTableData(updated);
    if (onChange) onChange({ tabel: updated, columns, sumber });
  };

  // Add row
  const addRow = () => {
    const newRow = Object.fromEntries(columns.map((col) => [col, ""]));
    setTableData((prev) => {
      const updated = [...prev, newRow];
      if (onChange) onChange({ tabel: updated, columns, sumber });
      return updated;
    });
  };

  // Remove row
  const removeRow = (idx) => {
    const updated = tableData.filter((_, i) => i !== idx);
    setTableData(updated);
    if (onChange) onChange({ tabel: updated, columns, sumber });
  };

  // Edit nama kolom
  const updateColName = (idx, val) => {
    const newCols = columns.map((col, i) => (i === idx ? val : col));
    const newTable = tableData.map((row) => {
      const newRow = {};
      columns.forEach((col, i) => {
        newRow[newCols[i]] = row[col];
      });
      return newRow;
    });
    setColumns(newCols);
    setTableData(newTable);
    if (onChange) onChange({ tabel: newTable, columns: newCols, sumber });
  };

  // Sumber data
  const handleSumberChange = (e) => {
    setSumber(e.target.value);
    if (onChange)
      onChange({ tabel: tableData, columns, sumber: e.target.value });
  };

  // Validasi
  const { valid, missing, extra } = validateColumns(columns, expectedColumns);

  return (
    <Card className="mb-3 shadow-sm">
      <CardBody>
        <h5 className="fw-semibold">{label}</h5>
        {/* Import Excel */}
        <div className="mb-2">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            style={{ display: "none" }}
            id={`import-table-${label}`}
            onChange={handleImport}
          />
          <label htmlFor={`import-table-${label}`}>
            <Button as="span" size="sm" variant="outline-success">
              Import dari Excel
            </Button>
          </label>
          <span className="ms-2 text-muted small">
            {expectedColumns.length > 0 && (
              <>Kolom yang diharapkan: {expectedColumns.join(", ")}</>
            )}
          </span>
        </div>
        {/* Validasi Kolom */}
        {!valid && (
          <div className="mb-2 text-danger small">
            <div>Kolom belum sesuai format!</div>
            {missing.length > 0 && <div>Kurang: {missing.join(", ")}</div>}
            {extra.length > 0 && <div>Ekstra: {extra.join(", ")}</div>}
            <div>Edit nama kolom di bawah, atau ulang import/mapping.</div>
          </div>
        )}
        {/* Table with editable header */}
        {columns.length > 0 && (
          <Table bordered responsive>
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th key={col}>
                    <Form.Control
                      type="text"
                      value={col}
                      size="sm"
                      onChange={(e) => updateColName(idx, e.target.value)}
                    />
                  </th>
                ))}
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col}>
                      <Form.Control
                        type="text"
                        size="sm"
                        value={row[col] || ""}
                        onChange={(e) => updateCell(idx, col, e.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeRow(idx)}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
              <tr>
                {columns.map((col, i) => (
                  <td key={col + i}></td>
                ))}
                <td>
                  <Button size="sm" variant="success" onClick={addRow}>
                    Tambah Baris
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
        )}
        {/* Input sumber data */}
        <Form.Group className="mt-2">
          <Form.Label>Sumber Data</Form.Label>
          <Form.Control
            value={sumber}
            onChange={handleSumberChange}
            placeholder="Contoh: Data Kepegawaian Dinas Pangan Maluku Utara"
          />
        </Form.Group>

        {/* Input Analisa Tabel */}
        <Form.Group className="mt-2">
          <Form.Label>Analisa/Keterangan Tabel</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={value?.analisa || ""}
            onChange={(e) => {
              if (onChange)
                onChange({
                  ...value,
                  tabel: tableData,
                  columns,
                  sumber,
                  analisa: e.target.value,
                });
            }}
            placeholder="Tulis analisa, penjelasan, atau narasi terkait tabel ini..."
          />
        </Form.Group>

        {/* Modal untuk mapping header */}
        <Modal
          show={importModal}
          onHide={() => setImportModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Mapping Kolom dari Excel</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <div className="mb-3">
                Pilih mapping header Excel ke nama kolom tabel yang diinginkan:
              </div>
              {Object.entries(colMapping).map(([toCol, fromCol], i) => (
                <Form.Group key={i} className="mb-2">
                  <Form.Label>{toCol}</Form.Label>
                  <Form.Select
                    value={fromCol}
                    onChange={(e) =>
                      setColMapping((prev) => ({
                        ...prev,
                        [toCol]: e.target.value,
                      }))
                    }
                  >
                    {importedHeader.map((col, j) => (
                      <option key={j} value={col}>
                        {col}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              ))}
            </Form>
            <div className="mt-3">
              <b>Preview Data</b>
              <Table bordered size="sm">
                <thead>
                  <tr>
                    {Object.keys(colMapping).map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importedPreview.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.values(colMapping).map((fromCol, j) => (
                        <td key={j}>{row[importedHeader.indexOf(fromCol)]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="small text-muted">
                * Menampilkan 5 baris pertama
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setImportModal(false)}>
              Batal
            </Button>
            <Button variant="success" onClick={handleApplyImport}>
              Gunakan Data Ini
            </Button>
          </Modal.Footer>
        </Modal>
      </CardBody>
    </Card>
  );
}
