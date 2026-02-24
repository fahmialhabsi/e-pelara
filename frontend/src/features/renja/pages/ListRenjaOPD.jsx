import React from "react";

const ListRenjaOPD = () => (
  <div>
    <table className="w-full border text-sm">
      <thead>
        <tr>
          <th className="border p-2">OPD</th>
          <th className="border p-2">Tahun</th>
          <th className="border p-2">Aksi</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border p-2">Dinas Pangan</td>
          <td className="border p-2">2025</td>
          <td className="border p-2">
            <a href="#/renja/2025/dispang" className="text-blue-600">Lihat RENJA</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

export default ListRenjaOPD;
