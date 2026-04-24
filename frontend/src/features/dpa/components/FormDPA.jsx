/**
 * FormDPA.jsx
 * Dropdown berantai dari master Program → Kegiatan → Sub Kegiatan → Indikator (data perencanaan),
 * tanpa menunggu alur RKPD→Renja→RKA lengkap. Fallback input teks jika master kosong.
 * + Autocomplete kode rekening Permendagri 90.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Select, Spin, Collapse, Typography, Alert, message } from "antd";
import KodeRekeningAutocomplete from "./KodeRekeningAutocomplete";
import {
  fetchProgramsForDpa,
  fetchKegiatanByProgram,
  fetchSubKegiatanByKegiatan,
  fetchIndikatorByKegiatan,
  formatProgramLabel,
  formatKegiatanLabel,
  formatSubKegiatanLabel,
} from "../services/dpaMasterApi";

const { Text } = Typography;

const INITIAL = {
  tahun: String(new Date().getFullYear()),
  periode_id: "",
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
};

function targetOptionsFromIndikator(row) {
  if (!row) return [];
  const keys = [
    "target_kinerja",
    "target_akhir",
    "target_awal",
    "target_tahun_1",
    "target_tahun_2",
    "target_tahun_3",
    "target_tahun_4",
    "target_tahun_5",
  ];
  const out = [];
  const seen = new Set();
  for (const k of keys) {
    const v = row[k];
    if (v == null || v === "") continue;
    const s = String(v).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push({ value: s, label: s });
  }
  return out;
}

const FormDPA = ({
  data: initialData = null,
  onChange,
  onSubmit,
  loading = false,
  periodeList = [],
}) => {
  const [form, setForm] = useState(() =>
    initialData ? { ...INITIAL, ...initialData } : INITIAL,
  );
  const [kodeErr, setKodeErr] = useState("");

  const [programs, setPrograms] = useState([]);
  const [kegiatans, setKegiatans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [indikators, setIndikators] = useState([]);

  const [lp, setLp] = useState(false);
  const [lk, setLk] = useState(false);
  const [ls, setLs] = useState(false);
  const [li, setLi] = useState(false);

  const [pid, setPid] = useState(null);
  const [kid, setKid] = useState(null);
  const [sid, setSid] = useState(null);
  const [iid, setIid] = useState(null);

  const [manualOpen, setManualOpen] = useState(false);
  const committedTahun = useRef(String(form.tahun || ""));

  const pushForm = useCallback(
    (next) => {
      setForm(next);
      if (onChange) onChange(next);
    },
    [onChange],
  );

  useEffect(() => {
    if (initialData) {
      const next = { ...INITIAL, ...initialData };
      pushForm(next);
      committedTahun.current = String(next.tahun || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  /* ── Muat program saat tahun berubah ───────────────────────────── */
  useEffect(() => {
    const th = String(form.tahun || "").trim();
    if (!th) {
      setPrograms([]);
      return;
    }
    let cancel = false;
    (async () => {
      setLp(true);
      try {
        const rows = await fetchProgramsForDpa(th);
        if (!cancel) setPrograms(rows);
      } catch {
        if (!cancel) setPrograms([]);
      } finally {
        if (!cancel) setLp(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [form.tahun]);

  /* ── Cocokkan pilihan master dengan teks tersimpan (mode edit) ───── */
  useEffect(() => {
    if (!initialData?.id || programs.length === 0) return;
    const wantP = (initialData.program || "").trim();
    if (!wantP) return;
    const hit = programs.find(
      (p) =>
        formatProgramLabel(p) === wantP ||
        wantP.includes(p.nama_program) ||
        p.nama_program.includes(wantP),
    );
    if (hit) setPid(hit.id);
  }, [initialData?.id, initialData?.program, programs]);

  useEffect(() => {
    if (!pid) {
      setKegiatans([]);
      setSubs([]);
      setIndikators([]);
      setKid(null);
      setSid(null);
      setIid(null);
      return;
    }
    let cancel = false;
    (async () => {
      setLk(true);
      try {
        const rows = await fetchKegiatanByProgram(pid);
        if (!cancel) setKegiatans(rows);
      } catch {
        if (!cancel) setKegiatans([]);
      } finally {
        if (!cancel) setLk(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pid]);

  useEffect(() => {
    if (!initialData?.id || kegiatans.length === 0) return;
    const wantK = (initialData.kegiatan || "").trim();
    if (!wantK) return;
    const hit = kegiatans.find(
      (k) =>
        formatKegiatanLabel(k) === wantK ||
        wantK.includes(k.nama_kegiatan) ||
        k.nama_kegiatan.includes(wantK),
    );
    if (hit) setKid(hit.id);
  }, [initialData?.id, initialData?.kegiatan, kegiatans]);

  useEffect(() => {
    if (!kid || !form.tahun) {
      setSubs([]);
      setSid(null);
      return;
    }
    let cancel = false;
    (async () => {
      setLs(true);
      try {
        const rows = await fetchSubKegiatanByKegiatan(kid, form.tahun);
        if (!cancel) setSubs(rows);
      } catch {
        if (!cancel) setSubs([]);
      } finally {
        if (!cancel) setLs(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [kid, form.tahun]);

  useEffect(() => {
    if (!initialData?.id || subs.length === 0) return;
    const wantS = (initialData.sub_kegiatan || "").trim();
    if (!wantS) return;
    const hit = subs.find(
      (s) =>
        formatSubKegiatanLabel(s) === wantS ||
        wantS.includes(s.nama_sub_kegiatan) ||
        s.nama_sub_kegiatan.includes(wantS),
    );
    if (hit) {
      setSid(hit.id);
      const fillPagu =
        hit.pagu_anggaran != null &&
        (initialData.anggaran === "" ||
          initialData.anggaran == null ||
          initialData.anggaran === undefined);
      if (fillPagu) {
        setForm((prev) => {
          const next = { ...prev, anggaran: hit.pagu_anggaran };
          if (onChange) onChange(next);
          return next;
        });
      }
    }
  }, [
    initialData?.id,
    initialData?.sub_kegiatan,
    initialData?.anggaran,
    subs,
    onChange,
  ]);

  useEffect(() => {
    if (!kid || !form.tahun) {
      setIndikators([]);
      setIid(null);
      return;
    }
    let cancel = false;
    (async () => {
      setLi(true);
      try {
        const rows = await fetchIndikatorByKegiatan(kid, form.tahun);
        if (!cancel) setIndikators(rows);
      } catch {
        if (!cancel) setIndikators([]);
      } finally {
        if (!cancel) setLi(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [kid, form.tahun]);

  const selectedIndikator = useMemo(
    () => indikators.find((x) => String(x.id) === String(iid)),
    [indikators, iid],
  );

  const targetOpts = useMemo(
    () => targetOptionsFromIndikator(selectedIndikator),
    [selectedIndikator],
  );

  const handle = (e) => {
    const { name, value } = e.target;
    pushForm({ ...form, [name]: value });
  };

  const handleRekening = ({ kode_rekening, nama_rekening }) => {
    setKodeErr("");
    pushForm({ ...form, kode_rekening, nama_rekening });
  };

  const onPickProgram = (value) => {
    const id = value ? Number(value) : null;
    setPid(id);
    setKid(null);
    setSid(null);
    setIid(null);
    const p = programs.find((x) => x.id === id);
    const label = p ? formatProgramLabel(p) : "";
    pushForm({
      ...form,
      program: label,
      kegiatan: "",
      sub_kegiatan: "",
      indikator: "",
      target: "",
      anggaran: "",
    });
  };

  const onPickKegiatan = (value) => {
    const id = value ? Number(value) : null;
    setKid(id);
    setSid(null);
    setIid(null);
    const k = kegiatans.find((x) => x.id === id);
    const label = k ? formatKegiatanLabel(k) : "";
    pushForm({
      ...form,
      kegiatan: label,
      sub_kegiatan: "",
      indikator: "",
      target: "",
      anggaran: "",
    });
  };

  const onPickSub = (value) => {
    const id = value ? Number(value) : null;
    setSid(id);
    const s = subs.find((x) => x.id === id);
    const label = s ? formatSubKegiatanLabel(s) : "";
    const pagu =
      s && s.pagu_anggaran != null ? Number(s.pagu_anggaran) : form.anggaran;
    pushForm({
      ...form,
      sub_kegiatan: label,
      anggaran: pagu === "" || pagu == null ? "" : pagu,
    });
  };

  const onPickIndikator = (value) => {
    const id = value ? Number(value) : null;
    setIid(id);
    const row = indikators.find((x) => x.id === id);
    const nama = row?.nama_indikator ? String(row.nama_indikator) : "";
    const t0 = targetOptionsFromIndikator(row)[0]?.value || "";
    pushForm({ ...form, indikator: nama, target: t0 || form.target });
  };

  const onPickTarget = (value) => {
    pushForm({ ...form, target: value != null ? String(value) : "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.kode_rekening && !form.nama_rekening) {
      setKodeErr(
        "Pilih kode rekening dari daftar referensi (gunakan hasil pencarian).",
      );
      return;
    }
    if (!String(form.program || "").trim()) {
      message.warning("Program wajib diisi (pilih dari master atau isi manual).");
      return;
    }
    if (!String(form.kegiatan || "").trim()) {
      message.warning("Kegiatan wajib diisi.");
      return;
    }
    if (!String(form.sub_kegiatan || "").trim()) {
      message.warning("Sub kegiatan wajib diisi.");
      return;
    }
    if (onSubmit) onSubmit(form);
  };

  const inputStyle = {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    fontSize: 13,
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block",
    marginBottom: 4,
    fontWeight: 600,
    fontSize: 13,
    color: "#333",
  };
  const fieldStyle = { marginBottom: 14 };
  const errStyle = { color: "#f5222d", fontSize: 11, marginTop: 3 };

  const selectProps = {
    showSearch: true,
    allowClear: true,
    optionFilterProp: "label",
    style: { width: "100%" },
    size: "middle",
  };

  const masterEmpty =
    !lp && programs.length === 0 && String(form.tahun || "").trim();

  return (
    <form onSubmit={handleSubmit} style={{ padding: "4px 0" }}>
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Tahun <span style={{ color: "red" }}>*</span>
        </label>
        <input
          style={inputStyle}
          type="text"
          name="tahun"
          value={form.tahun}
          onChange={handle}
          onBlur={() => {
            const t = String(form.tahun || "").trim();
            if (t && t !== committedTahun.current) {
              committedTahun.current = t;
              setPid(null);
              setKid(null);
              setSid(null);
              setIid(null);
            }
          }}
          required
          placeholder="2025"
        />
        <Text type="secondary" style={{ fontSize: 11 }}>
          Digunakan untuk memuat Program / Sub Kegiatan sesuai tahun anggaran.
        </Text>
      </div>

      {periodeList.length > 0 && (
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Periode RPJMD <span style={{ color: "red" }}>*</span>
          </label>
          <select
            style={inputStyle}
            name="periode_id"
            value={form.periode_id}
            onChange={handle}
            required
          >
            <option value="">— Pilih Periode —</option>
            {periodeList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      {masterEmpty && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Belum ada data Program untuk tahun ini di master perencanaan."
          description="Anda bisa mengisi teks manual di bagian bawah, atau lengkapi data Program di modul perencanaan terlebih dahulu."
        />
      )}

      {/* Program */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Program <span style={{ color: "red" }}>*</span>
        </label>
        <Spin spinning={lp}>
          {programs.length > 0 ? (
            <Select
              {...selectProps}
              placeholder="Pilih program dari master"
              value={pid != null ? String(pid) : undefined}
              onChange={onPickProgram}
              options={programs.map((p) => ({
                value: String(p.id),
                label: formatProgramLabel(p),
              }))}
            />
          ) : (
            <input
              style={inputStyle}
              type="text"
              name="program"
              value={form.program}
              onChange={handle}
              required
              placeholder="Nama / kode program..."
            />
          )}
        </Spin>
      </div>

      {/* Kegiatan */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Kegiatan <span style={{ color: "red" }}>*</span>
        </label>
        <Spin spinning={lk}>
          {pid && kegiatans.length > 0 ? (
            <Select
              {...selectProps}
              placeholder="Pilih kegiatan"
              value={kid != null ? String(kid) : undefined}
              onChange={onPickKegiatan}
              options={kegiatans.map((k) => ({
                value: String(k.id),
                label: formatKegiatanLabel(k),
              }))}
            />
          ) : (
            <input
              style={inputStyle}
              type="text"
              name="kegiatan"
              value={form.kegiatan}
              onChange={handle}
              required
              placeholder={
                pid ? "Memuat kegiatan… atau ketik manual" : "Pilih program dulu"
              }
              disabled={Boolean(pid) && lk}
            />
          )}
        </Spin>
      </div>

      {/* Sub Kegiatan */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Sub Kegiatan <span style={{ color: "red" }}>*</span>
        </label>
        <Spin spinning={ls}>
          {kid && subs.length > 0 ? (
            <Select
              {...selectProps}
              placeholder="Pilih sub kegiatan"
              value={sid != null ? String(sid) : undefined}
              onChange={onPickSub}
              options={subs.map((s) => ({
                value: String(s.id),
                label: formatSubKegiatanLabel(s),
              }))}
            />
          ) : (
            <input
              style={inputStyle}
              type="text"
              name="sub_kegiatan"
              value={form.sub_kegiatan}
              onChange={handle}
              required
              placeholder={
                kid ? "Memuat sub kegiatan… atau ketik manual" : "Pilih kegiatan dulu"
              }
              disabled={Boolean(kid) && ls}
            />
          )}
        </Spin>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Memilih sub kegiatan akan mengisi Pagu dari master (bisa diubah).
        </Text>
      </div>

      {/* Indikator */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Indikator</label>
        <Spin spinning={li}>
          {kid && indikators.length > 0 ? (
            <Select
              {...selectProps}
              placeholder="Pilih indikator (dari master indikator kegiatan)"
              value={iid != null ? String(iid) : undefined}
              onChange={onPickIndikator}
              options={indikators.map((r) => ({
                value: String(r.id),
                label: r.nama_indikator || r.kode_indikator || `ID ${r.id}`,
              }))}
            />
          ) : (
            <input
              style={inputStyle}
              type="text"
              name="indikator"
              value={form.indikator}
              onChange={handle}
              placeholder="Indikator kinerja..."
            />
          )}
        </Spin>
      </div>

      {/* Target */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Target</label>
        {targetOpts.length > 0 ? (
          <Select
            {...selectProps}
            placeholder="Pilih target"
            value={form.target || undefined}
            onChange={onPickTarget}
            options={targetOpts}
          />
        ) : (
          <input
            style={inputStyle}
            type="text"
            name="target"
            value={form.target}
            onChange={handle}
            placeholder="Misal: 100%"
          />
        )}
      </div>

      {/* Anggaran */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Pagu Anggaran (Rp)</label>
        <input
          style={inputStyle}
          type="number"
          name="anggaran"
          value={form.anggaran}
          onChange={handle}
          placeholder="0"
          min="0"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Jenis Dokumen</label>
        <select
          style={inputStyle}
          name="jenis_dokumen"
          value={form.jenis_dokumen}
          onChange={handle}
        >
          <option value="DPA">DPA</option>
          <option value="DPA-P">DPA-P (Perubahan)</option>
          <option value="DPPA">DPPA</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>rka_id (opsional, taut ke RKA)</label>
        <input
          style={inputStyle}
          type="text"
          name="rka_id"
          value={form.rka_id}
          onChange={handle}
          placeholder="ID RKA terkait"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>rpjmd_id (opsional, baseline RPJMD)</label>
        <input
          style={inputStyle}
          type="text"
          name="rpjmd_id"
          value={form.rpjmd_id}
          onChange={handle}
          placeholder="ID dokumen RPJMD"
        />
      </div>

      <Collapse
        ghost
        activeKey={manualOpen ? ["m"] : []}
        onChange={(k) => setManualOpen(k.includes("m"))}
        items={[
          {
            key: "m",
            label: "Isi manual (teks bebas) untuk Program / Kegiatan / Sub / Indikator",
            children: (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  style={inputStyle}
                  name="program"
                  value={form.program}
                  onChange={handle}
                  placeholder="Program (teks disimpan ke DPA)"
                />
                <input
                  style={inputStyle}
                  name="kegiatan"
                  value={form.kegiatan}
                  onChange={handle}
                  placeholder="Kegiatan"
                />
                <input
                  style={inputStyle}
                  name="sub_kegiatan"
                  value={form.sub_kegiatan}
                  onChange={handle}
                  placeholder="Sub kegiatan"
                />
                <input
                  style={inputStyle}
                  name="indikator"
                  value={form.indikator}
                  onChange={handle}
                  placeholder="Indikator"
                />
                <input
                  style={inputStyle}
                  name="target"
                  value={form.target}
                  onChange={handle}
                  placeholder="Target"
                />
              </div>
            ),
          },
        ]}
      />

      <div
        style={{
          ...fieldStyle,
          borderTop: "1px dashed #e8e8e8",
          paddingTop: 14,
          marginTop: 4,
        }}
      >
        <label style={labelStyle}>
          Kode Rekening (Permendagri 90)
          <span
            style={{ fontWeight: 400, color: "#888", marginLeft: 6, fontSize: 11 }}
          >
            — Opsional, ketik 2+ karakter untuk mencari
          </span>
        </label>
        <KodeRekeningAutocomplete
          value={form.kode_rekening || ""}
          namaValue={form.nama_rekening || ""}
          onChange={handleRekening}
          placeholder="Misal: 5.1 atau Belanja Pegawai..."
        />
        {kodeErr && <div style={errStyle}>⚠ {kodeErr}</div>}
        {form.kode_rekening && form.nama_rekening && (
          <div style={{ fontSize: 11, color: "#595959", marginTop: 4 }}>
            Akan disimpan: <strong>{form.kode_rekening}</strong> —{" "}
            {form.nama_rekening}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 24px",
            background: loading ? "#d9d9d9" : "#1677ff",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Menyimpan..." : "Simpan DPA"}
        </button>
      </div>
    </form>
  );
};

export default FormDPA;
