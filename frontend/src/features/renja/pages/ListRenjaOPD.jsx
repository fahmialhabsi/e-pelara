import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useDokumen } from "../../../hooks/useDokumen";
import { useAuth } from "../../../hooks/useAuth";
import { canManagePlanningWorkflow } from "../../../utils/roleUtils";
import { usePeriodeAktif } from "../../rpjmd/hooks/usePeriodeAktif";
import {
  createRenja,
  deleteRenja,
  getAllRenja,
  getRenjaAudit,
  updateRenja,
  updateRenjaStatus,
} from "../services/renjaApi";
import AuditTimeline from "../../planning-audit/components/AuditTimeline";
import BeforeAfterDiffCard from "../../planning-audit/components/BeforeAfterDiffCard";
import DocumentTracePanel from "../../planning-audit/components/DocumentTracePanel";
import VersionHistoryPanel from "../../planning-audit/components/VersionHistoryPanel";
import { canRestorePlanningDocumentVersion } from "../../../utils/roleUtils";

const defaultForm = {
  tahun: "",
  judul: "",
  program: "",
  kegiatan: "",
  sub_kegiatan: "",
  indikator: "",
  target: "",
  anggaran: "",
  status: "draft",
  change_reason_text: "",
  change_reason_file: "",
};

const StatusBadge = ({ value }) => {
  const status = String(value || "draft").toLowerCase();
  const palette = {
    approved: "bg-green-100 text-green-700",
    submitted: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold ${palette[status] || palette.draft}`}>
      {status}
    </span>
  );
};

const SyncBadge = ({ value }) => {
  const status = String(value || "belum_sinkron").toLowerCase();
  const palette = {
    sinkron: "bg-green-50 text-green-700",
    gagal_sinkron: "bg-red-50 text-red-700",
    belum_sinkron: "bg-yellow-50 text-yellow-800",
  };
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold ${palette[status] || palette.belum_sinkron}`}>
      {status}
    </span>
  );
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("id-ID");
};

const ListRenjaOPD = () => {
  const { tahun: tahunAktif } = useDokumen();
  const { user } = useAuth();
  const { periode_id } = usePeriodeAktif();
  const canManageWorkflow = canManagePlanningWorkflow(user?.role);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({
    ...defaultForm,
    tahun: tahunAktif || "",
  });

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditFor, setAuditFor] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await getAllRenja({
        limit: 200,
        ...(tahunAktif ? { tahun: tahunAktif } : {}),
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal memuat data Renja");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAktif]);

  const filteredRows = useMemo(() => {
    const key = String(search || "").trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((row) =>
      [
        row.tahun,
        row.judul,
        row.program,
        row.kegiatan,
        row.sub_kegiatan,
        row.status,
        row.sinkronisasi_status,
      ]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(key)),
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditingRow(null);
    setForm({
      ...defaultForm,
      tahun: tahunAktif || "",
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      tahun: row.tahun || tahunAktif || "",
      judul: row.judul || "",
      program: row.program || "",
      kegiatan: row.kegiatan || "",
      sub_kegiatan: row.sub_kegiatan || "",
      indikator: row.indikator || "",
      target: row.target || "",
      anggaran: row.anggaran || "",
      status: row.status || "draft",
      change_reason_text: "",
      change_reason_file: "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingRow(null);
  };

  const onChangeForm = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmitForm = async (event) => {
    event.preventDefault();
    if (!form.tahun) {
      toast.error("Tahun wajib diisi");
      return;
    }

    const payload = {
      tahun: form.tahun,
      periode_id: periode_id || null,
      judul: form.judul,
      program: form.program,
      kegiatan: form.kegiatan,
      sub_kegiatan: form.sub_kegiatan,
      indikator: form.indikator,
      target: form.target,
      anggaran: form.anggaran,
      status: form.status || "draft",
      jenis_dokumen: "renja",
    };

    try {
      if (editingRow?.id) {
        const rt = String(form.change_reason_text || "").trim();
        const rf = String(form.change_reason_file || "").trim();
        if (!rt && !rf) {
          toast.error("Isi alasan perubahan (teks) atau referensi berkas.");
          return;
        }
        await updateRenja(editingRow.id, {
          ...payload,
          change_reason_text: rt || undefined,
          change_reason_file: rf || undefined,
        });
        toast.success("Renja berhasil diperbarui");
      } else {
        const rt = String(form.change_reason_text || "").trim();
        const rf = String(form.change_reason_file || "").trim();
        if (!rt && !rf) {
          toast.error("Isi alasan pencatatan (teks) atau referensi berkas untuk audit CREATE.");
          return;
        }
        await createRenja({
          ...payload,
          change_reason_text: rt || undefined,
          change_reason_file: rf || undefined,
        });
        toast.success("Renja berhasil ditambahkan");
      }
      closeForm();
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan Renja");
    }
  };

  const onDelete = async (row) => {
    const ok = window.confirm(`Hapus Renja "${row?.judul || row?.program || row?.id}"?`);
    if (!ok) return;
    const reason = window.prompt("Alasan penghapusan (wajib):", "");
    if (!reason || !String(reason).trim()) {
      toast.error("Alasan penghapusan wajib diisi.");
      return;
    }
    try {
      await deleteRenja(row.id, { change_reason_text: String(reason).trim() });
      toast.success("Renja dihapus");
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal menghapus Renja");
    }
  };

  const openAudit = async (row) => {
    setAuditFor(row);
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditEvents([]);
    try {
      const list = await getRenjaAudit(row.id);
      setAuditEvents(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal memuat audit");
    } finally {
      setAuditLoading(false);
    }
  };

  const latestDiffNormalized =
    auditEvents.find((e) => e.normalized?.changed_fields?.length)?.normalized ||
    auditEvents.find((e) => e.action_type === "UPDATE" && e.normalized)?.normalized ||
    null;

  const onStatus = async (row, action) => {
    const reason = window.prompt(`Alasan transisi workflow "${action}" (wajib):`, "");
    if (!reason || !String(reason).trim()) {
      toast.error("Alasan wajib untuk audit workflow");
      return;
    }
    try {
      await updateRenjaStatus(row.id, {
        action,
        change_reason_text: String(reason).trim(),
      });
      toast.success(`Status Renja diperbarui (${action})`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal mengubah status Renja");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">M029 - Daftar Renja</h3>
          <p className="text-sm text-gray-600">
            Menampilkan field penting: tahun, judul, program, anggaran, status, dan sinkronisasi.
          </p>
        </div>
        <button
          type="button"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={openCreate}
          disabled={!canManageWorkflow}
        >
          Tambah Renja
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Cari judul / program / kegiatan / status / sinkronisasi"
      />

      {loading ? (
        <div className="text-sm text-gray-600">Memuat data Renja...</div>
      ) : (
        <table className="w-full border text-sm">
          <thead>
            <tr>
              {[
                "Tahun",
                "Judul",
                "Program/Kegiatan",
                "Anggaran",
                "Status",
                "Sinkronisasi",
                "Aksi",
              ].map((head) => (
                <th key={head} className="border p-2 text-left">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="border p-3 text-center" colSpan={7}>
                  Belum ada data Renja.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="border p-2">{row.tahun}</td>
                  <td className="border p-2">{row.judul || "-"}</td>
                  <td className="border p-2">
                    <div>{row.program || "-"}</div>
                    <div className="text-xs text-gray-600">{row.kegiatan || "-"}</div>
                  </td>
                  <td className="border p-2">
                    {formatCurrency(row.anggaran)}
                  </td>
                  <td className="border p-2">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="border p-2">
                    <SyncBadge value={row.sinkronisasi_status} />
                  </td>
                  <td className="border p-2">
                    <div className="flex flex-wrap gap-2">
                      {canManageWorkflow && (
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-slate-700 hover:underline"
                        onClick={() => openAudit(row)}
                      >
                        Audit
                      </button>
                      {canManageWorkflow && (
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => onDelete(row)}
                        >
                          Hapus
                        </button>
                      )}
                      {canManageWorkflow &&
                        String(row.status).toLowerCase() === "draft" && (
                        <button
                          type="button"
                          className="text-indigo-600 hover:underline"
                          onClick={() => onStatus(row, "submit")}
                        >
                          Submit
                        </button>
                        )}
                      {canManageWorkflow &&
                        String(row.status).toLowerCase() === "submitted" && (
                        <>
                          <button
                            type="button"
                            className="text-green-700 hover:underline"
                            onClick={() => onStatus(row, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="text-red-700 hover:underline"
                            onClick={() => onStatus(row, "reject")}
                          >
                            Reject
                          </button>
                        </>
                        )}
                      {canManageWorkflow &&
                        ["approved", "rejected"].includes(
                          String(row.status).toLowerCase(),
                        ) && (
                        <button
                          type="button"
                          className="text-amber-700 hover:underline"
                          onClick={() => onStatus(row, "revise")}
                        >
                          Revisi
                        </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {auditOpen && (
        <div className="rounded border bg-slate-50 p-4 text-sm shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold">Riwayat audit — Renja #{auditFor?.id}</h4>
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => setAuditOpen(false)}
            >
              Tutup
            </button>
          </div>
          {auditFor?.id ? (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <DocumentTracePanel documentType="renja" documentId={auditFor.id} />
              <VersionHistoryPanel
                documentType="renja"
                documentId={auditFor.id}
                allowRestore={canRestorePlanningDocumentVersion(user?.role)}
                onRestored={loadData}
              />
            </div>
          ) : null}
          {auditLoading ? (
            <p className="text-gray-600">Memuat…</p>
          ) : (
            <>
              {latestDiffNormalized ? (
                <div className="mb-4">
                  <div className="mb-1 text-xs font-medium text-gray-600">Ringkasan perubahan</div>
                  <BeforeAfterDiffCard normalized={latestDiffNormalized} />
                </div>
              ) : null}
              <AuditTimeline rows={auditEvents} loading={false} />
            </>
          )}
        </div>
      )}

      {canManageWorkflow && formOpen && (
        <div className="rounded border bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-base font-semibold">
            {editingRow ? "Edit Renja" : "Tambah Renja"}
          </h4>
          <form onSubmit={onSubmitForm} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              name="tahun"
              type="number"
              value={form.tahun}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Tahun"
              required
            />
            <input
              name="judul"
              value={form.judul}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Judul Renja"
            />
            <input
              name="program"
              value={form.program}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Program"
            />
            <input
              name="kegiatan"
              value={form.kegiatan}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Kegiatan"
            />
            <input
              name="sub_kegiatan"
              value={form.sub_kegiatan}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Sub Kegiatan"
            />
            <input
              name="indikator"
              value={form.indikator}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Indikator"
            />
            <input
              name="target"
              value={form.target}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Target"
            />
            <input
              name="anggaran"
              type="number"
              min="0"
              value={form.anggaran}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Anggaran"
            />
            <select
              name="status"
              value={form.status}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
            >
              <option value="draft">draft</option>
              <option value="submitted">submitted</option>
            </select>

            <>
              <textarea
                name="change_reason_text"
                value={form.change_reason_text}
                onChange={onChangeForm}
                className="md:col-span-2 rounded border px-3 py-2"
                rows={2}
                placeholder={
                  editingRow
                    ? "Alasan perubahan (wajib salah satu dengan berkas)"
                    : "Alasan pencatatan CREATE (wajib salah satu dengan berkas)"
                }
              />
              <input
                name="change_reason_file"
                value={form.change_reason_file}
                onChange={onChangeForm}
                className="md:col-span-2 rounded border px-3 py-2"
                placeholder="Referensi berkas (path/URL/nama)"
              />
            </>

            <div className="md:col-span-2 flex gap-2 pt-2">
              <button
                type="submit"
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                Simpan
              </button>
              <button
                type="button"
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
                onClick={closeForm}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ListRenjaOPD;
