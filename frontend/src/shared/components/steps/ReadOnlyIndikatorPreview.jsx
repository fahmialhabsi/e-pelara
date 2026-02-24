import React from "react";
import { Table } from "react-bootstrap";

const ReadOnlyIndikatorPreview = ({ data }) => {
  if (!data) return null;

  const {
    tipe_indikator,
    jenis_indikator,
    kriteria_kuantitatif,
    kriteria_kualitatif,
    satuan,
    definisi_operasional,
    metode_penghitungan,
    baseline,
    sumber_data,
    penanggung_jawab_label,
  } = data;

  const getKriteria = () =>
    jenis_indikator === "Kuantitatif"
      ? kriteria_kuantitatif
      : kriteria_kualitatif;

  return (
    <Table bordered size="sm">
      <tbody>
        <tr>
          <th style={{ width: "30%" }}>Tipe Indikator</th>
          <td>{tipe_indikator}</td>
        </tr>
        <tr>
          <th>Jenis Indikator</th>
          <td>{jenis_indikator}</td>
        </tr>
        <tr>
          <th>Kriteria</th>
          <td>{getKriteria()}</td>
        </tr>
        <tr>
          <th>Satuan</th>
          <td>{satuan}</td>
        </tr>
        <tr>
          <th>Definisi Operasional</th>
          <td>{definisi_operasional}</td>
        </tr>
        <tr>
          <th>Metode Penghitungan</th>
          <td>{metode_penghitungan}</td>
        </tr>
        <tr>
          <th>Baseline</th>
          <td>{baseline}</td>
        </tr>
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={`target-${i}`}>
            <th>{`Target Tahun ${i}`}</th>
            <td>{data[`target_tahun_${i}`]}</td>
          </tr>
        ))}
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={`capaian-${i}`}>
            <th>{`Capaian Tahun ${i}`}</th>
            <td>{data[`capaian_tahun_${i}`] || "-"}</td>
          </tr>
        ))}
        <tr>
          <th>Sumber Data</th>
          <td>{sumber_data}</td>
        </tr>
        <tr>
          <th>Penanggung Jawab</th>
          <td>{penanggung_jawab_label || "-"}</td>
        </tr>
        {data.rekomendasi_ai && (
          <tr>
            <th>Rekomendasi</th>
            <td>{data.rekomendasi_ai}</td>
          </tr>
        )}
      </tbody>
    </Table>
  );
};

export default ReadOnlyIndikatorPreview;
