import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import { useDokumen } from "../../../hooks/useDokumen";
import { useAuth } from "../../../hooks/useAuth";
import { canManagePlanningWorkflow, canRestorePlanningDocumentVersion } from "../../../utils/roleUtils";
import { normalizeListItems } from "../../../utils/apiResponse";
import {
  createRenstraDoc,
  deleteRenstraDoc,
  getAllRenstraDocs,
  getRenstraAudit,
  syncRenstraDocs,
  updateRenstraDoc,
  updateRenstraDocStatus,
} from "../services/renstraApi";
import AuditTimeline from "../../planning-audit/components/AuditTimeline";
import BeforeAfterDiffCard from "../../planning-audit/components/BeforeAfterDiffCard";
import DocumentTracePanel from "../../planning-audit/components/DocumentTracePanel";
import VersionHistoryPanel from "../../planning-audit/components/VersionHistoryPanel";

const defaultForm = {
  periode_awal: "",
  periode_akhir: "",
  judul: "",
  dokumen_url: "",
  status: "draft",
  rpjmd_id: "",
  pagu_tahun_1: "",
  pagu_tahun_2: "",
  pagu_tahun_3: "",
  pagu_tahun_4: "",
  pagu_tahun_5: "",
  total_pagu: "",
  change_reason_text: "",
};

const statusBadgeClass = (status) => {
  const value = String(status || "draft").toLowerCase();
  if (value === "approved") return "bg-green-100 text-green-700";
  if (value === "submitted") return "bg-blue-100 text-blue-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const syncBadgeClass = (status) => {
  const value = String(status || "belum_sinkron").toLowerCase();
  if (value === "sinkron") return "bg-green-50 text-green-700";
  if (value === "gagal_sinkron") return "bg-red-50 text-red-700";
  return "bg-yellow-50 text-yellow-800";
};

const ListRenstraOPD = () => {
  const { tahun: tahunAktif } = useDokumen();
  const { user } = useAuth();
  const canManageWorkflow = canManagePlanningWorkflow(user?.role);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [rpjmdOptions, setRpjmdOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({
    ...defaultForm,
    periode_awal: tahunAktif || "",
    periode_akhir: tahunAktif || "",
  });

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditFor, setAuditFor] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadRpjmdOptions = async () => {
    try {
      const res = await api.get("/rpjmd");
      setRpjmdOptions(normalizeListItems(res.data));
    } catch {
      setRpjmdOptions([]);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await getAllRenstraDocs({
        limit: 200,
        ...(tahunAktif ? { tahun: tahunAktif } : {}),
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal memuat data Renstra");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
    loadRpjmdOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAktif]);

  const filteredRows = useMemo(() => {
    const key = String(search || "").trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((row) =>
      [
        row.periode_awal,
        row.periode_akhir,
        row.judul,
        row.status,
        row.sinkronisasi_status,
        row.total_pagu,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(key)),
    );
  }, [rows, search]);

  const rpjmdLabel = (id) => {
    if (id == null || id === "") return "";
    const hit = rpjmdOptions.find((r) => String(r.id) === String(id));
    return hit?.nama_rpjmd ? `${hit.nama_rpjmd} (#${id})` : `#${id}`;
  };

  const openCreate = () => {
    setEditingRow(null);
    setForm({
      ...defaultForm,
      periode_awal: tahunAktif || "",
      periode_akhir: tahunAktif || "",
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      periode_awal: row.periode_awal || "",
      periode_akhir: row.periode_akhir || "",
      judul: row.judul || "",
      dokumen_url: row.dokumen_url || "",
      status: row.status || "draft",
      rpjmd_id: row.rpjmd_id != null ? String(row.rpjmd_id) : "",
      pagu_tahun_1: row.pagu_tahun_1 ?? "",
      pagu_tahun_2: row.pagu_tahun_2 ?? "",
      pagu_tahun_3: row.pagu_tahun_3 ?? "",
      pagu_tahun_4: row.pagu_tahun_4 ?? "",
      pagu_tahun_5: row.pagu_tahun_5 ?? "",
      total_pagu: row.total_pagu ?? "",
      change_reason_text: "",
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
    if (!form.periode_awal || !form.periode_akhir) {
      toast.error("Periode awal dan akhir wajib diisi");
      return;
    }
    const reasonCreate = String(form.change_reason_text || "").trim();
    if (editingRow?.id) {
      if (!reasonCreate) {
        toast.error("Alasan perubahan wajib diisi untuk penyimpanan audit");
        return;
      }
    } else if (!reasonCreate) {
      toast.error("Alasan pencatatan wajib untuk pembuatan dokumen (audit)");
      return;
    }

    const payload = {
      periode_awal: form.periode_awal,
      periode_akhir: form.periode_akhir,
      judul: form.judul,
      dokumen_url: form.dokumen_url,
      status: form.status || "draft",
      rpjmd_id: form.rpjmd_id === "" ? null : form.rpjmd_id,
      pagu_tahun_1: form.pagu_tahun_1,
      pagu_tahun_2: form.pagu_tahun_2,
      pagu_tahun_3: form.pagu_tahun_3,
      pagu_tahun_4: form.pagu_tahun_4,
      pagu_tahun_5: form.pagu_tahun_5,
      total_pagu: form.total_pagu,
    };
    payload.change_reason_text = reasonCreate;

    try {
      if (editingRow?.id) {
        await updateRenstraDoc(editingRow.id, payload);
        toast.success("Renstra berhasil diperbarui");
      } else {
        await createRenstraDoc(payload);
        toast.success("Renstra berhasil ditambahkan");
      }
      closeForm();
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan Renstra");
    }
  };

  const onDelete = async (row) => {
    const ok = window.confirm(`Hapus Renstra "${row?.judul || row?.id}"?`);
    if (!ok) return;
    const reason = window.prompt("Alasan penghapusan (wajib untuk audit):", "");
    if (!reason || !String(reason).trim()) {
      toast.error("Alasan penghapusan wajib diisi");
      return;
    }
    try {
      await deleteRenstraDoc(row.id, { change_reason_text: String(reason).trim() });
      toast.success("Renstra dihapus");
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal menghapus Renstra");
    }
  };

  const openAudit = async (row) => {
    setAuditFor(row);
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditEvents([]);
    try {
      const list = await getRenstraAudit(row.id);
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
      await updateRenstraDocStatus(row.id, {
        action,
        change_reason_text: String(reason).trim(),
      });
      toast.success(`Status Renstra diperbarui (${action})`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal mengubah status Renstra");
    }
  };

  const onSync = async () => {
    try {
      const result = await syncRenstraDocs(tahunAktif ? { tahun: tahunAktif } : {});
      toast.success(
        `Sync Renstra selesai. Inserted ${result?.inserted || 0}, updated ${result?.updated || 0}`,
      );
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal sinkronisasi Renstra");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">M027 - Daftar Renstra</h3>
          <p className="text-sm text-gray-600">
            Periode, judul, pagu per slot periode, referensi RPJMD, audit mutasi, dan status workflow.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            onClick={onSync}
          >
            Sync Renstra
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            onClick={openCreate}
            disabled={!canManageWorkflow}
          >
            Tambah Renstra
          </button>
        </div>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Cari periode / judul / status / sinkronisasi / pagu"
      />

      {loading ? (
        <div className="text-sm text-gray-600">Memuat data Renstra...</div>
      ) : (
        <table className="w-full border text-sm">
          <thead>
            <tr>
              {["Periode", "Judul", "Pagu", "RPJMD", "Workflow", "Sinkronisasi", "Aksi"].map(
                (head) => (
                  <th key={head} className="border p-2 text-left">
                    {head}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="border p-3 text-center" colSpan={7}>
                  Belum ada data Renstra.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const status = String(row.status || "draft").toLowerCase();
                return (
                  <tr key={row.id}>
                    <td className="border p-2">
                      {row.periode_awal || "-"} - {row.periode_akhir || "-"}
                    </td>
                    <td className="border p-2">
                      <div className="font-medium">{row.judul || "-"}</div>
                      <div className="text-xs text-gray-600">{row.dokumen_url || "-"}</div>
                    </td>
                    <td className="border p-2 text-xs">
                      <div>Total: {row.total_pagu ?? "—"}</div>
                      <div className="text-gray-600">
                        Th. ke-1 s/d 5: {[1, 2, 3, 4, 5].map((i) => row[`pagu_tahun_${i}`] ?? "—").join(" / ")}
                      </div>
                    </td>
                    <td className="border p-2 text-xs">
                      {row.rpjmd_id != null ? rpjmdLabel(row.rpjmd_id) : "—"}
                    </td>
                    <td className="border p-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="border p-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${syncBadgeClass(row.sinkronisasi_status)}`}
                      >
                        {row.sinkronisasi_status || "belum_sinkron"}
                      </span>
                    </td>
                    <td className="border p-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-gray-700 hover:underline"
                          onClick={() => openAudit(row)}
                        >
                          Audit
                        </button>
                        {canManageWorkflow && (
                          <button
                            type="button"
                            className="text-blue-600 hover:underline"
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </button>
                        )}
                        {canManageWorkflow && (
                          <button
                            type="button"
                            className="text-red-600 hover:underline"
                            onClick={() => onDelete(row)}
                          >
                            Hapus
                          </button>
                        )}
                        {canManageWorkflow && status === "draft" && (
                          <button
                            type="button"
                            className="text-indigo-600 hover:underline"
                            onClick={() => onStatus(row, "submit")}
                          >
                            Submit
                          </button>
                        )}
                        {canManageWorkflow && status === "submitted" && (
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
                        {canManageWorkflow && ["approved", "rejected"].includes(status) && (
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
                );
              })
            )}
          </tbody>
        </table>
      )}

      {auditOpen && (
        <div className="rounded border bg-slate-50 p-4 text-sm shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold">Riwayat audit — {auditFor?.judul || auditFor?.id}</h4>
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
              <DocumentTracePanel documentType="renstra" documentId={auditFor.id} />
              <VersionHistoryPanel
                documentType="renstra"
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
                  <div className="mb-1 text-xs font-medium text-gray-600">Ringkasan perubahan (update)</div>
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
            {editingRow ? "Edit Renstra" : "Tambah Renstra"}
          </h4>
          <form onSubmit={onSubmitForm} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              name="periode_awal"
              type="number"
              value={form.periode_awal}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Periode awal"
              required
            />
            <input
              name="periode_akhir"
              type="number"
              value={form.periode_akhir}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Periode akhir"
              required
            />
            <input
              name="judul"
              value={form.judul}
              onChange={onChangeForm}
              className="rounded border px-3 py-2 md:col-span-2"
              placeholder="Judul Renstra"
            />
            <input
              name="dokumen_url"
              value={form.dokumen_url}
              onChange={onChangeForm}
              className="rounded border px-3 py-2 md:col-span-2"
              placeholder="URL Dokumen (opsional)"
            />
            <select
              name="rpjmd_id"
              value={form.rpjmd_id}
              onChange={onChangeForm}
              className="rounded border px-3 py-2 md:col-span-2"
            >
              <option value="">— Tanpa referensi RPJMD —</option>
              {rpjmdOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama_rpjmd || `RPJMD #${r.id}`}
                </option>
              ))}
            </select>
            {[1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                name={`pagu_tahun_${i}`}
                type="number"
                step="0.01"
                value={form[`pagu_tahun_${i}`]}
                onChange={onChangeForm}
                className="rounded border px-3 py-2"
                placeholder={`Pagu (th. ke-${i})`}
              />
            ))}
            <input
              name="total_pagu"
              type="number"
              step="0.01"
              value={form.total_pagu}
              onChange={onChangeForm}
              className="rounded border px-3 py-2"
              placeholder="Total pagu (opsional)"
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
            <textarea
              name="change_reason_text"
              value={form.change_reason_text}
              onChange={onChangeForm}
              className="rounded border px-3 py-2 md:col-span-2"
              rows={2}
              placeholder={
                editingRow
                  ? "Alasan perubahan (wajib untuk audit)"
                  : "Alasan pencatatan dokumen (wajib untuk audit)"
              }
              required
            />
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

export default ListRenstraOPD;
