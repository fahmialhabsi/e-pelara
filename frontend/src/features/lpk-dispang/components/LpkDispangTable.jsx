// LpkDispangTable untuk modul LPK-DISPANG
import React from 'react';
import { Table, Button } from 'react-bootstrap';
import { PencilSquare, Trash } from 'react-bootstrap-icons';

const formatRp = (v) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

const LpkDispangTable = ({ data, onEdit, onDelete }) => (
  <div className="table-responsive">
    <Table striped bordered hover size="sm" className="align-middle small">
      <thead className="table-primary">
        <tr>
          <th>Sub Kegiatan (Kode)</th>
          <th>Nama Kegiatan</th>
          <th className="text-center" style={{ width: 130 }}>
            Realisasi Fisik
          </th>
          <th className="text-end" style={{ width: 170 }}>
            Realisasi Keuangan
          </th>
          <th>Keterangan</th>
          <th className="text-center" style={{ width: 110 }}>
            Aksi
          </th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && (
          <tr>
            <td colSpan={6} className="text-center text-muted fst-italic py-3">
              Belum ada data
            </td>
          </tr>
        )}
        {data.map((row) => (
          <tr key={row.id}>
            <td>{row.dpa?.kode_sub_kegiatan || '-'}</td>
            <td>{row.nama_kegiatan}</td>
            <td className="text-center">
              {row.realisasi_fisik === null || row.realisasi_fisik === undefined ? (
                <span className="text-muted">—</span>
              ) : (
                row.realisasi_fisik
              )}
            </td>
            <td className="text-end">{formatRp(row.realisasi_keuangan)}</td>
            <td>{row.keterangan || <span className="text-muted">-</span>}</td>
            <td className="text-center">
              <div className="d-flex gap-1 justify-content-center">
                <Button size="sm" variant="outline-primary" onClick={() => onEdit(row)}>
                  <PencilSquare />
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => onDelete(row.id)}>
                  <Trash />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
);

export default LpkDispangTable;
