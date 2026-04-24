import React, { useState, useEffect } from "react";

const RkpdFormModal = ({
  isOpen,
  onClose,
  onSave,
  initialData = {},
  options = {},
}) => {
  const [form, setForm] = useState({ ...initialData });

  useEffect(() => {
    setForm({ ...initialData });
  }, [initialData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl">
        <h2 className="text-lg font-bold mb-4">Form RKPD</h2>
        <div className="grid grid-cols-2 gap-4">
          <select
            name="periode_id"
            onChange={handleChange}
            value={form.periode_id || ""}
          >
            <option value="">Pilih Periode</option>
            {(options.periode || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>

          <select
            name="opd_id"
            onChange={handleChange}
            value={form.opd_id || ""}
          >
            <option value="">Pilih OPD</option>
            {(options.opd || []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nama}
              </option>
            ))}
          </select>

          <select
            name="program_id"
            onChange={handleChange}
            value={form.program_id || ""}
          >
            <option value="">Pilih Program</option>
            {options.program?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama_program || p.isi_program}
              </option>
            ))}
          </select>

          <select
            name="kegiatan_id"
            onChange={handleChange}
            value={form.kegiatan_id || ""}
          >
            <option value="">Pilih Kegiatan</option>
            {options.kegiatan?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kegiatan || k.isi_kegiatan}
              </option>
            ))}
          </select>

          <select
            name="sub_kegiatan_id"
            onChange={handleChange}
            value={form.sub_kegiatan_id || ""}
          >
            <option value="">Pilih Sub Kegiatan</option>
            {options.subkegiatan?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama_subkegiatan || s.isi_subkegiatan}
              </option>
            ))}
          </select>

          <input
            name="target"
            value={form.target || ""}
            onChange={handleChange}
            placeholder="Target"
          />
          <input
            name="satuan"
            value={form.satuan || ""}
            onChange={handleChange}
            placeholder="Satuan"
          />
          <input
            name="pagu_anggaran"
            value={form.pagu_anggaran || ""}
            onChange={handleChange}
            placeholder="Pagu Anggaran"
            type="number"
          />
          <input
            name="realisasi"
            value={form.realisasi || ""}
            onChange={handleChange}
            placeholder="Realisasi"
            type="number"
          />
          <input
            name="sumber_dana"
            value={form.sumber_dana || ""}
            onChange={handleChange}
            placeholder="Sumber Dana"
          />
          <select
            name="status"
            onChange={handleChange}
            value={form.status || ""}
          >
            <option value="">Status</option>
            <option value="draft">draft</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <textarea
            name="keterangan"
            value={form.keterangan || ""}
            onChange={handleChange}
            placeholder="Keterangan"
          />
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

export default RkpdFormModal;
