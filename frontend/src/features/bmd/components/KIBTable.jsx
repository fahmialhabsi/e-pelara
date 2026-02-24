import React from 'react';

const KIBTable = () => {
  return (
    <div>
      <h2>Tabel KIB A/B/C</h2>
      <table>
        <thead>
          <tr><th>No</th><th>Nama Aset</th><th>Kategori</th><th>Nilai</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Tanah A</td><td>KIB A</td><td>1.000.000</td></tr>
        </tbody>
      </table>
    </div>
  );
};

export default KIBTable;
