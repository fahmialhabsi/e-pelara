import React from "react";

const RkpdTable = ({ data = [], onEdit, onDelete }) => {
  if (!Array.isArray(data)) return null;

  return (
    <table className="w-full border text-sm">
      <thead>
        <tr>
          {[
            "Program",
            "Kegiatan",
            "Sub Kegiatan",
            "Target",
            "Realisasi",
            "Anggaran",
            "Aksi",
          ].map((label) => (
            <th key={label} className="border p-2">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="7" className="text-center p-2">
              Tidak ada data.
            </td>
          </tr>
        ) : (
          data.map((item, idx) => (
            <tr key={idx}>
              <td className="border p-2">{item.program}</td>
              <td className="border p-2">{item.kegiatan}</td>
              <td className="border p-2">{item.sub_kegiatan}</td>
              <td className="border p-2">{item.target}</td>
              <td className="border p-2">{item.realisasi}</td>
              <td className="border p-2">{item.anggaran}</td>
              <td className="border p-2">
                <button
                  onClick={() => onEdit(item)}
                  className="text-blue-600 hover:underline mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="text-red-600 hover:underline"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default RkpdTable;
