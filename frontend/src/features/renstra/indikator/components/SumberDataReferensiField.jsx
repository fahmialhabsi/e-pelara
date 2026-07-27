import React from 'react';
import { Form, Segmented, Input, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { emptySumberDataTabel } from './sumberDataUtils';

const { TextArea } = Input;

/**
 * Field "Sumber Data" untuk form indikator Renstra (Tujuan/Sasaran/Program/
 * Kegiatan/Sub Kegiatan) — mendukung input teks biasa ATAU tabel dinamis
 * (kolom bisa ditambah/diedit bebas), plus daftar Referensi independen.
 *
 * Menggunakan `watch`/`setValue` dari react-hook-form (bukan Controller)
 * karena field ini mengelola beberapa nama field sekaligus
 * (sumber_data, sumber_data_mode, sumber_data_tabel, referensi).
 */
const SumberDataReferensiField = ({ watch, setValue }) => {
  const mode = watch('sumber_data_mode') || 'teks';
  const sumberData = watch('sumber_data') || '';
  const tabel = watch('sumber_data_tabel') || emptySumberDataTabel();
  const referensi = watch('referensi') || [];

  const columns = tabel.columns?.length ? tabel.columns : emptySumberDataTabel().columns;
  const rows = tabel.rows || [];

  const updateTabel = (patch) => setValue('sumber_data_tabel', { columns, rows, ...patch });

  const addRow = () => {
    const newRow = Object.fromEntries(columns.map((c) => [c, '']));
    updateTabel({ rows: [...rows, newRow] });
  };
  const addGroupRow = () => {
    updateTabel({ rows: [...rows, { _type: 'group', _label: '' }] });
  };
  const removeRow = (idx) => updateTabel({ rows: rows.filter((_, i) => i !== idx) });
  const updateCell = (idx, col, val) => {
    updateTabel({ rows: rows.map((r, i) => (i === idx ? { ...r, [col]: val } : r)) });
  };
  const updateGroupLabel = (idx, val) => {
    updateTabel({ rows: rows.map((r, i) => (i === idx ? { ...r, _label: val } : r)) });
  };

  // Nomor urut hanya dihitung untuk baris data, baris judul kelompok dilewati.
  let itemCounter = 0;
  const rowNumbers = rows.map((row) => (row?._type === 'group' ? null : ++itemCounter));
  const addColumn = () => {
    const name = `Kolom ${columns.length + 1}`;
    updateTabel({ columns: [...columns, name] });
  };
  const renameColumn = (idx, val) => {
    const oldName = columns[idx];
    const newColumns = columns.map((c, i) => (i === idx ? val : c));
    const newRows = rows.map((r) => {
      const { [oldName]: moved, ...rest } = r;
      return { ...rest, [val]: moved ?? '' };
    });
    updateTabel({ columns: newColumns, rows: newRows });
  };
  const removeColumn = (idx) => {
    const name = columns[idx];
    const newColumns = columns.filter((_, i) => i !== idx);
    const newRows = rows.map((r) => {
      const { [name]: _drop, ...rest } = r;
      return rest;
    });
    updateTabel({ columns: newColumns, rows: newRows });
  };

  const addReferensi = () => setValue('referensi', [...referensi, '']);
  const updateReferensi = (idx, val) =>
    setValue(
      'referensi',
      referensi.map((r, i) => (i === idx ? val : r)),
    );
  const removeReferensi = (idx) =>
    setValue(
      'referensi',
      referensi.filter((_, i) => i !== idx),
    );

  return (
    <>
      <Form.Item label="Sumber Data">
        <Segmented
          value={mode}
          onChange={(val) => setValue('sumber_data_mode', val)}
          options={[
            { label: 'Teks', value: 'teks' },
            { label: 'Tabel', value: 'tabel' },
          ]}
          style={{ marginBottom: 8, display: 'block', width: 'fit-content' }}
        />
        {mode === 'teks' ? (
          <TextArea
            rows={3}
            value={sumberData}
            onChange={(e) => setValue('sumber_data', e.target.value)}
            placeholder="Contoh: BPS Provinsi Maluku Utara"
          />
        ) : (
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #f0f0f0', padding: 4, width: 40 }}>No.</th>
                    {columns.map((col, idx) => (
                      <th key={idx} style={{ border: '1px solid #f0f0f0', padding: 4 }}>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            size="small"
                            value={col}
                            onChange={(e) => renameColumn(idx, e.target.value)}
                          />
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeColumn(idx)}
                          />
                        </Space.Compact>
                      </th>
                    ))}
                    <th style={{ border: '1px solid #f0f0f0', padding: 4, width: 40 }}>
                      <Button size="small" icon={<PlusOutlined />} onClick={addColumn} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) =>
                    row?._type === 'group' ? (
                      <tr key={rIdx}>
                        <td
                          colSpan={columns.length + 2}
                          style={{ border: '1px solid #f0f0f0', padding: 4, background: '#fafafa' }}
                        >
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              size="small"
                              value={row._label || ''}
                              onChange={(e) => updateGroupLabel(rIdx, e.target.value)}
                              placeholder="Judul kelompok, contoh: A. Ketersediaan Pangan"
                              style={{ fontWeight: 600 }}
                            />
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeRow(rIdx)}
                            />
                          </Space.Compact>
                        </td>
                      </tr>
                    ) : (
                      <tr key={rIdx}>
                        <td style={{ border: '1px solid #f0f0f0', padding: 4, textAlign: 'center' }}>
                          {rowNumbers[rIdx]}
                        </td>
                        {columns.map((col) => (
                          <td key={col} style={{ border: '1px solid #f0f0f0', padding: 4 }}>
                            <Input
                              size="small"
                              value={row[col] || ''}
                              onChange={(e) => updateCell(rIdx, col, e.target.value)}
                            />
                          </td>
                        ))}
                        <td style={{ border: '1px solid #f0f0f0', padding: 4 }}>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeRow(rIdx)}
                          />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <Space style={{ marginTop: 8 }}>
              <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addRow}>
                Tambah Baris
              </Button>
              <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addGroupRow}>
                Tambah Judul Kelompok
              </Button>
            </Space>
          </div>
        )}
      </Form.Item>

      <Form.Item label="Referensi">
        <Space direction="vertical" style={{ width: '100%' }}>
          {referensi.map((ref, idx) => (
            <Space.Compact key={idx} style={{ width: '100%' }}>
              <Input
                addonBefore={`[${idx + 1}]`}
                value={ref}
                onChange={(e) => updateReferensi(idx, e.target.value)}
                placeholder="Contoh: Badan Pusat Statistik. (n.d.). Detail Metadata Indikator Statistik..."
              />
              <Button danger icon={<DeleteOutlined />} onClick={() => removeReferensi(idx)} />
            </Space.Compact>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={addReferensi}>
            Tambah Referensi
          </Button>
        </Space>
      </Form.Item>
    </>
  );
};

export default SumberDataReferensiField;
