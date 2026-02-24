import React from "react";
import { Table } from "react-bootstrap";

export default function RecapTable({ data }) {
  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Level</th>
          <th>Jumlah Indikator</th>
          <th>Baseline Rata-rata</th>
          <th>Target</th>
          <th>Realisasi</th>
          <th>Penanggung Jawab</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{row.level}</td>
            <td>{row.count}</td>
            <td>{row.baseline}</td>
            <td>{row.target}</td>
            <td>{row.realization}</td>
            <td>{row.owner}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
