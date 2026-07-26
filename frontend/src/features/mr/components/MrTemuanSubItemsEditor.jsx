// frontend/src/features/mr/components/MrTemuanSubItemsEditor.jsx
// Editor rincian bertingkat utk Kondisi/Kriteria/Sebab/Akibat pada form Temuan
// TLHP — daftar item berhuruf (a, b, c...) yg masing-masing opsional punya
// tabel bebas (jumlah kolom/baris ditentukan user sendiri, bukan skema tetap).
// Dipakai sbg Form.Item child terkontrol (value/onChange) di MrPlanningTemuanForm.jsx.

import React from "react";
import { Button, Input, Space, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, TableOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text } = Typography;

const letterFor = (index) => String.fromCharCode(97 + index);

function FreeTableEditor({ table, onChange }) {
  if (!table) {
    return (
      <Button
        size="small"
        type="dashed"
        icon={<TableOutlined />}
        onClick={() => onChange({ title: "", columns: ["Kolom 1", "Kolom 2"], rows: [["", ""]], explanation: "" })}
      >
        Tambah tabel bebas (opsional)
      </Button>
    );
  }

  const columns = table.columns || [];
  const rows = table.rows || [];

  const updateTitle = (title) => onChange({ ...table, title });
  const updateExplanation = (explanation) => onChange({ ...table, explanation });
  const updateColumn = (ci, value) => {
    const nextColumns = [...columns];
    nextColumns[ci] = value;
    onChange({ ...table, columns: nextColumns });
  };
  const addColumn = () => onChange({ ...table, columns: [...columns, "Kolom baru"], rows: rows.map((r) => [...r, ""]) });
  const removeColumn = (ci) =>
    onChange({ ...table, columns: columns.filter((_, i) => i !== ci), rows: rows.map((r) => r.filter((_, i) => i !== ci)) });
  const updateCell = (ri, ci, value) => {
    const nextRows = rows.map((r) => [...r]);
    nextRows[ri][ci] = value;
    onChange({ ...table, rows: nextRows });
  };
  const addRow = () => onChange({ ...table, rows: [...rows, columns.map(() => "")] });
  const removeRow = (ri) => onChange({ ...table, rows: rows.filter((_, i) => i !== ri) });

  return (
    <div style={{ marginTop: 8, border: "1px solid #f0f0f0", borderRadius: 6, padding: 10, background: "#fafafa" }}>
      <Input
        size="small"
        placeholder="Judul tabel (opsional)"
        value={table.title}
        onChange={(e) => updateTitle(e.target.value)}
        style={{ marginBottom: 8, fontWeight: 500 }}
      />
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}>
          <thead>
            <tr>
              {columns.map((c, ci) => (
                <th key={ci} style={{ border: "1px solid #e8e8e8", padding: 4 }}>
                  <Space.Compact style={{ width: "100%" }}>
                    <Input size="small" value={c} onChange={(e) => updateColumn(ci, e.target.value)} />
                    <Button size="small" icon={<DeleteOutlined />} onClick={() => removeColumn(ci)} aria-label="Hapus kolom" />
                  </Space.Compact>
                </th>
              ))}
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: "1px solid #e8e8e8", padding: 0 }}>
                    <Input size="small" variant="borderless" value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} />
                  </td>
                ))}
                <td style={{ textAlign: "center" }}>
                  <Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => removeRow(ri)} aria-label="Hapus baris" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Space style={{ marginTop: 8 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={addColumn}>
          Tambah kolom
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={addRow}>
          Tambah baris
        </Button>
        <Button size="small" type="text" danger onClick={() => onChange(null)}>
          Hapus tabel
        </Button>
      </Space>

      <div style={{ marginTop: 10 }}>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Uraian penjelasan tabel <Text type="secondary" style={{ fontSize: 12 }}>(opsional)</Text>
        </Text>
        <TextArea
          rows={3}
          placeholder="Tuliskan penjelasan/narasi atas tabel di atas"
          value={table.explanation}
          onChange={(e) => updateExplanation(e.target.value)}
        />
      </div>
    </div>
  );
}

function SubItemCard({ item, index, onUpdate, onRemove }) {
  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 6, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Text strong style={{ paddingTop: 6 }}>
          {letterFor(index)}.
        </Text>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Judul sub-item"
            value={item.judul}
            onChange={(e) => onUpdate({ ...item, judul: e.target.value })}
            style={{ fontWeight: 500, marginBottom: 6 }}
          />
          <TextArea
            rows={3}
            placeholder="Uraian sub-item"
            value={item.uraian}
            onChange={(e) => onUpdate({ ...item, uraian: e.target.value })}
          />
        </div>
        <Button type="text" danger icon={<DeleteOutlined />} onClick={onRemove} aria-label="Hapus sub-item" />
      </div>

      <div style={{ marginLeft: 22, marginTop: 8 }}>
        <FreeTableEditor table={item.table} onChange={(table) => onUpdate({ ...item, table })} />
      </div>
    </div>
  );
}

export default function MrTemuanSubItemsEditor({ value, onChange, label = "Sub item" }) {
  const items = Array.isArray(value) ? value : [];

  const updateItem = (index, next) => {
    const copy = [...items];
    copy[index] = { ...next, letter: letterFor(index) };
    onChange?.(copy);
  };

  const removeItem = (index) => {
    onChange?.(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange?.([...items, { letter: letterFor(items.length), judul: "", uraian: "", table: null }]);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {label} <Text type="secondary" style={{ fontSize: 12 }}>(opsional)</Text>
        </Text>
        <Button size="small" icon={<PlusOutlined />} onClick={addItem}>
          Tambah {label.toLowerCase()}
        </Button>
      </div>

      {items.map((item, index) => (
        <SubItemCard key={index} item={item} index={index} onUpdate={(next) => updateItem(index, next)} onRemove={() => removeItem(index)} />
      ))}
    </div>
  );
}
