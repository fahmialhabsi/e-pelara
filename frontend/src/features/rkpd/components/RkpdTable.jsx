import React from "react";

const getStatusBadgeClass = (status) => {
  const val = String(status || "draft").toLowerCase();
  if (val === "approved") return "bg-green-100 text-green-700";
  if (val === "submitted") return "bg-blue-100 text-blue-700";
  if (val === "rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const getSyncBadgeClass = (status) => {
  const val = String(status || "belum_sinkron").toLowerCase();
  if (val === "sinkron") return "bg-green-50 text-green-700";
  if (val === "gagal_sinkron") return "bg-red-50 text-red-700";
  return "bg-yellow-50 text-yellow-800";
};

const fmtNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("id-ID");
};

const RkpdTable = ({ data = [], onEdit, onDelete, onStatus, canManageStatus = true }) => {
  if (!Array.isArray(data)) return null;

  return (
    <table className="w-full border text-sm">
      <thead>
        <tr>
          {[
            "Tahun",
            "Sub Kegiatan",
            "Program/Kegiatan",
            "Pagu",
            "OPD",
            "Status",
            "Sinkronisasi",
            "Aksi",
          ].map((label) => (
            <th key={label} className="border p-2 text-left">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={8} className="text-center p-3">
              Tidak ada data.
            </td>
          </tr>
        ) : (
          data.map((item) => {
            const status = String(item.status || "draft").toLowerCase();
            return (
              <tr key={item.id}>
                <td className="border p-2">{item.tahun || "-"}</td>
                <td className="border p-2">
                  <div className="font-medium">
                    {item.kode_sub_kegiatan || item.sub_kegiatan_id || "-"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {item.nama_sub_kegiatan || "-"}
                  </div>
                </td>
                <td className="border p-2">
                  <div>{item.nama_program || "-"}</div>
                  <div className="text-xs text-gray-600">
                    {item.nama_kegiatan || "-"}
                  </div>
                </td>
                <td className="border p-2">{fmtNumber(item.pagu_anggaran)}</td>
                <td className="border p-2">{item.opd_penanggung_jawab || "-"}</td>
                <td className="border p-2">
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      status,
                    )}`}
                  >
                    {status}
                  </span>
                </td>
                <td className="border p-2">
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${getSyncBadgeClass(
                      item.sinkronisasi_status,
                    )}`}
                  >
                    {item.sinkronisasi_status || "belum_sinkron"}
                  </span>
                </td>
                <td className="border p-2">
                  <div className="flex flex-wrap gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="text-blue-600 hover:underline"
                        type="button"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item)}
                        className="text-red-600 hover:underline"
                        type="button"
                      >
                        Hapus
                      </button>
                    )}
                    {onStatus && canManageStatus && status === "draft" && (
                      <button
                        onClick={() => onStatus(item, "submit")}
                        className="text-indigo-600 hover:underline"
                        type="button"
                      >
                        Submit
                      </button>
                    )}
                    {onStatus && canManageStatus && status === "submitted" && (
                      <>
                        <button
                          onClick={() => onStatus(item, "approve")}
                          className="text-green-700 hover:underline"
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onStatus(item, "reject")}
                          className="text-red-700 hover:underline"
                          type="button"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {onStatus &&
                      canManageStatus &&
                      ["approved", "rejected"].includes(status) && (
                      <button
                        onClick={() => onStatus(item, "revise")}
                        className="text-amber-700 hover:underline"
                        type="button"
                      >
                        Revisi
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
};

export default RkpdTable;
