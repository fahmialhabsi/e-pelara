/**
 * Halaman form tambah / ubah DPA.
 * Rute: /dpa/form/new | /dpa/form/:id
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Spin, Alert, Input, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import FormDPA from "../components/FormDPA";
import { getDpaById, createDpa, updateDpa, getDpaAudit } from "../services/dpaApi";
import { usePeriodeAktif } from "../../rpjmd/hooks/usePeriodeAktif";
import { useAuth } from "../../../hooks/useAuth";
import { canRestorePlanningDocumentVersion } from "../../../utils/roleUtils";
import PlanningAuditSection from "../../planning-audit/components/PlanningAuditSection";

const { TextArea } = Input;
const { Text } = Typography;

function buildPayload(form) {
  const p = {
    tahun: String(form.tahun || "").trim(),
    periode_id: Number(form.periode_id),
    program: String(form.program || "").trim(),
    kegiatan: String(form.kegiatan || "").trim(),
    sub_kegiatan: String(form.sub_kegiatan || "").trim(),
    indikator: form.indikator != null ? String(form.indikator) : "",
    target: form.target != null ? String(form.target) : "",
    jenis_dokumen: form.jenis_dokumen || "DPA",
  };
  if (form.anggaran === "" || form.anggaran == null || Number.isNaN(Number(form.anggaran))) {
    p.anggaran = null;
  } else {
    p.anggaran = Number(form.anggaran);
  }
  if (form.kode_rekening) {
    p.kode_rekening = String(form.kode_rekening).trim();
    p.nama_rekening = form.nama_rekening != null ? String(form.nama_rekening) : "";
  }
  if (form.rka_id !== "" && form.rka_id != null && !Number.isNaN(Number(form.rka_id))) {
    p.rka_id = Number(form.rka_id);
  }
  if (form.rpjmd_id !== "" && form.rpjmd_id != null && !Number.isNaN(Number(form.rpjmd_id))) {
    p.rpjmd_id = Number(form.rpjmd_id);
  }
  return p;
}

const DpaFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === "new" || !id;
  const { tahun, periode_id, periodeList, loading: periodeLoading } = usePeriodeAktif();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [initial, setInitial] = useState(null);
  const [liveForm, setLiveForm] = useState(null);
  const [baselinePayload, setBaselinePayload] = useState(null);
  const [changeReasonText, setChangeReasonText] = useState("");
  const [changeReasonFile, setChangeReasonFile] = useState("");
  const [auditRows, setAuditRows] = useState([]);

  const periodeOptions = useMemo(
    () =>
      (periodeList || []).map((p) => ({
        id: p.id,
        nama: p.nama || `${p.tahun_awal}–${p.tahun_akhir}`,
      })),
    [periodeList],
  );

  const loadAudit = useCallback(async (docId) => {
    try {
      const rows = await getDpaAudit(docId);
      setAuditRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadExisting = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getDpaById(id);
      const row = data?.data ?? data;
      if (!row || typeof row !== "object") {
        throw new Error("Data DPA tidak valid");
      }
      const nextInitial = {
        id: row.id,
        tahun: String(row.tahun ?? ""),
        periode_id: row.periode_id != null ? String(row.periode_id) : "",
        program: row.program ?? "",
        kegiatan: row.kegiatan ?? "",
        sub_kegiatan: row.sub_kegiatan ?? "",
        indikator: row.indikator ?? "",
        target: row.target ?? "",
        anggaran: row.anggaran != null ? row.anggaran : "",
        jenis_dokumen: row.jenis_dokumen ?? "DPA",
        kode_rekening: row.kode_rekening ?? "",
        nama_rekening: row.nama_rekening ?? "",
        rka_id: row.rka_id != null ? String(row.rka_id) : "",
        rpjmd_id: row.rpjmd_id != null ? String(row.rpjmd_id) : "",
      };
      setInitial(nextInitial);
      setLiveForm(nextInitial);
      setBaselinePayload(buildPayload(nextInitial));
      setChangeReasonText("");
      setChangeReasonFile("");
      await loadAudit(id);
    } catch (e) {
      console.error(e);
      setLoadError(e.message || "Gagal memuat DPA");
      toast.error("Gagal memuat data DPA");
    } finally {
      setLoading(false);
    }
  }, [id, isNew, loadAudit]);

  useEffect(() => {
    if (isNew) {
      setInitial({
        tahun: tahun ? String(tahun) : String(new Date().getFullYear()),
        periode_id: periode_id != null ? String(periode_id) : "",
        program: "",
        kegiatan: "",
        sub_kegiatan: "",
        indikator: "",
        target: "",
        anggaran: "",
        jenis_dokumen: "DPA",
        kode_rekening: "",
        nama_rekening: "",
        rka_id: "",
        rpjmd_id: "",
      });
      setLiveForm(null);
      setBaselinePayload(null);
      setAuditRows([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    loadExisting();
  }, [isNew, tahun, periode_id, loadExisting]);

  const handleSubmit = async (formValues) => {
    const payload = buildPayload(formValues);
    if (!payload.periode_id || Number.isNaN(payload.periode_id)) {
      toast.error("Pilih Periode RPJMD terlebih dahulu.");
      return;
    }
    const rt = changeReasonText.trim();
    const rf = changeReasonFile.trim();
    if (!rt && !rf) {
      toast.error(
        isNew
          ? "Isi alasan pencatatan (teks) atau referensi berkas (wajib untuk audit CREATE)."
          : "Isi alasan perubahan (teks) atau referensi berkas dasar perubahan.",
      );
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const res = await createDpa({
          ...payload,
          change_reason_text: rt || undefined,
          change_reason_file: rf || undefined,
        });
        const created = res?.data ?? res;
        toast.success("DPA berhasil dibuat");
        if (created?.id) navigate(`/dpa/form/${created.id}`, { replace: true });
        else navigate("/dashboard-dpa", { replace: true });
      } else {
        await updateDpa(id, {
          ...payload,
          change_reason_text: changeReasonText.trim() || undefined,
          change_reason_file: changeReasonFile.trim() || undefined,
        });
        toast.success("DPA berhasil diperbarui");
        await loadExisting();
      }
    } catch (e) {
      const body = e.response?.data;
      const msg =
        body?.error ||
        body?.message ||
        e.message ||
        "Gagal menyimpan DPA";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (periodeLoading && isNew) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
        <p>Memuat periode...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
        <p>Memuat data DPA...</p>
      </div>
    );
  }

  if (loadError && !isNew) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <Alert type="error" message={loadError} showIcon />
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate("/dashboard-dpa")} style={{ marginTop: 16 }}>
          Kembali ke daftar DPA
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 24px", maxWidth: 900 }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate("/dashboard-dpa")}>
          Kembali
        </Button>
        <h1 style={{ margin: 0, fontSize: 20 }}>{isNew ? "Tambah DPA" : `Edit DPA #${id}`}</h1>
      </div>

      {periodeOptions.length === 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Daftar periode RPJMD kosong. Pastikan data periode tersedia dan tahun dokumen sesuai."
        />
      )}

      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, padding: 20 }}>
        <FormDPA
          key={isNew ? "new" : String(id)}
          data={initial}
          periodeList={periodeOptions}
          loading={saving}
          onChange={!isNew ? (next) => setLiveForm(next) : undefined}
          onSubmit={handleSubmit}
        />

        <div style={{ marginTop: 20, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
          <Text strong>
            {isNew
              ? "Alasan pencatatan (wajib salah satu untuk simpan)"
              : "Alasan perubahan (wajib salah satu untuk simpan)"}
          </Text>
          <TextArea
            style={{ marginTop: 8 }}
            rows={3}
            value={changeReasonText}
            onChange={(e) => setChangeReasonText(e.target.value)}
            placeholder={isNew ? "Ringkas alasan pembuatan DPA" : "Ringkas alasan perubahan"}
          />
          <Input
            style={{ marginTop: 8 }}
            value={changeReasonFile}
            onChange={(e) => setChangeReasonFile(e.target.value)}
            placeholder="Referensi berkas (path/URL/nama berkas)"
          />
        </div>
      </div>

      {!isNew && (
        <div style={{ marginTop: 20 }}>
          <PlanningAuditSection
            documentType="dpa"
            documentId={Number(id)}
            auditRows={auditRows}
            auditLoading={false}
            allowRestore={canRestorePlanningDocumentVersion(user?.role)}
            onVersionRestored={() => loadExisting()}
          />
        </div>
      )}
    </div>
  );
};

export default DpaFormPage;
