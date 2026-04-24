import React from "react";
import { Table, Button } from "react-bootstrap";
import { FaTrash } from "react-icons/fa";

export default function IndikatorPreviewTable({ list = [], onDelete }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <Table bordered hover responsive size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th>No</th>
            <th>Level Dokumen</th>
            <th>Nama</th>
            <th>Satuan</th>
            <th>Baseline</th>
            {[1, 2, 3, 4, 5].map((i) => (
              <th key={i}>{`Th. ke-${i}`}</th>
            ))}
            <th>Awal periode</th>
            <th>Akhir periode</th>
            <th>Target Awal</th>
            <th>Target Akhir</th>
            <th>Penanggung Jawab</th>
            <th>Metode Penghitungan</th>
            <th>Keterangan</th>
            <th>Rekomendasi</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={13} className="text-center text-muted">
                Belum ada indikator ditambahkan.
              </td>
            </tr>
          ) : (
            list.map((item, idx) => (
              <tr key={idx} className={item.hasError ? "table-danger" : ""}>
                <td>{idx + 1}</td>
                <td>{item.level_dokumen}</td>
                <td>{item.nama_indikator}</td>
                <td>{item.satuan}</td>
                <td>{item.baseline}</td>
                {[1, 2, 3, 4, 5].map((j) => (
                  <td key={j}>{item[`target_tahun_${j}`]}</td>
                ))}
                <td>{item.tahun_awal}</td>
                <td>{item.tahun_akhir}</td>
                <td>{item.target_awal}</td>
                <td>{item.target_akhir}</td>
                <td>{item.penanggung_jawab_label}</td>
                <td>{item.metode_penghitungan}</td>
                <td>{item.keterangan}</td>
                <td>
                  {item.rekomendasi_ai && (
                    <div>
                      <span className="badge bg-info text-dark">AI</span>
                      <div className="small mt-1">{item.rekomendasi_ai}</div>
                    </div>
                  )}
                </td>
                <td className="text-center">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(idx)}
                    title="Hapus indikator"
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
