import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Table,
  Row,
  Col,
  Badge,
  Collapse,
} from "react-bootstrap";
import api from "@/services/api";
import { extractListResponse } from "@/utils/apiResponse";
import { useDokumen } from "@/hooks/useDokumen";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";

function yearOptionsForPeriode(periode) {
  if (!periode) return [];
  const a = Number(periode.tahun_awal);
  const b = Number(periode.tahun_akhir);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out = [];
  for (let y = lo; y <= hi; y += 1) out.push(y);
  return out;
}

function clampTahunToPeriode(tahunStr, periode) {
  const opts = yearOptionsForPeriode(periode);
  if (!opts.length) return "";
  const t = parseInt(tahunStr, 10);
  if (Number.isInteger(t) && opts.includes(t)) return String(t);
  return String(opts[0]);
}

function parseIdList(text) {
  if (!text || !String(text).trim()) return [];
  return [
    ...new Set(
      String(text)
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isInteger(n) && n >= 1),
    ),
  ];
}

export function parseOpdPenanggungJawabIds(row) {
  if (!row || typeof row !== "object") return [];
  if (row.opd_penanggung_jawab_ids != null && String(row.opd_penanggung_jawab_ids).trim()) {
    return [
      ...new Set(
        String(row.opd_penanggung_jawab_ids)
          .split(",")
          .map((s) => parseInt(String(s).trim(), 10))
          .filter((n) => Number.isInteger(n) && n >= 1),
      ),
    ];
  }
  const n = parseInt(String(row.id), 10);
  return Number.isInteger(n) && n >= 1 ? [n] : [];
}

/**
 * Dropdown OPD saat ini bersifat grouped (berdasarkan nama_opd) dan id yang dikirim UI bisa bukan
 * id yang dipakai transaksi (mis. program.opd_penanggung_jawab). Adapter ini memilih id yang
 * paling relevan berdasarkan data program yang tersedia pada konteks saat ini.
 */
export function resolveEffectiveOpdPenanggungJawabId({
  selected_dropdown_id,
  opd_list,
  programs_for_context,
}) {
  const raw = parseInt(String(selected_dropdown_id || ""), 10);
  if (!Number.isInteger(raw) || raw < 1) {
    return { raw_dropdown_id: null, candidate_ids: [], effective_id: null };
  }

  const row =
    Array.isArray(opd_list) && opd_list.length
      ? opd_list.find((o) => String(o.id) === String(raw))
      : null;
  const candidateIds = row ? parseOpdPenanggungJawabIds(row) : [raw];

  // Jika ada data program yang sudah dibatasi konteks (tahun/periode), pilih kandidat id
  // dengan jumlah program terbanyak agar filter tidak kosong.
  const counts = new Map();
  for (const id of candidateIds) counts.set(Number(id), 0);
  const programs = Array.isArray(programs_for_context) ? programs_for_context : [];
  for (const p of programs) {
    const pid = parseInt(String(p?.opd_penanggung_jawab ?? ""), 10);
    if (counts.has(pid)) counts.set(pid, (counts.get(pid) || 0) + 1);
  }
  let effectiveId = candidateIds[0] ?? null;
  let best = -1;
  for (const [id, c] of counts.entries()) {
    if (c > best) {
      best = c;
      effectiveId = id;
    }
  }

  return {
    raw_dropdown_id: raw,
    candidate_ids: candidateIds,
    effective_id: effectiveId != null ? Number(effectiveId) : null,
  };
}

function normJenis(v) {
  return String(v || "").trim().toLowerCase();
}

function labelTruncate(s, n = 72) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}...`;
}

const AUTO_MAP_DATASET_KEY = "kepmendagri_provinsi_900_2024";

const AUTO_MAP_LEVEL_CONFIG = Object.freeze({
  program: {
    title: "Program",
    previewPath: "/rpjmd/program-auto-map/preview",
    executePath: "/rpjmd/program-auto-map/execute",
    idField: "program_ids",
    readyKey: "ready_exact_match",
    totalKey: "total_programs_scanned",
    entityNoun: "program",
  },
  kegiatan: {
    title: "Kegiatan",
    previewPath: "/rpjmd/kegiatan-auto-map/preview",
    executePath: "/rpjmd/kegiatan-auto-map/execute",
    idField: "kegiatan_ids",
    readyKey: "ready_exact_match",
    totalKey: "total_kegiatans_scanned",
    entityNoun: "kegiatan",
  },
  sub: {
    title: "Sub Kegiatan",
    previewPath: "/rpjmd/sub-auto-map/preview",
    executePath: "/rpjmd/sub-auto-map/execute",
    idField: "sub_kegiatan_ids",
    readyKey: "ready_exact_match",
    totalKey: "total_sub_kegiatans_scanned",
    entityNoun: "sub kegiatan",
  },
});

export function syncCategoryMeta(category) {
  const key = String(category || "").trim().toLowerCase();
  const meta = {
    ready: {
      label: "Siap diproses",
      problem: "Data aman untuk diproses.",
      action: "Lanjutkan ke commit setelah review sampel baris.",
    },
    duplicate_mapped: {
      label: "Duplikat yang sudah termapping",
      problem: "Data serupa sudah tersedia di target RKPD.",
      action: "Tidak perlu tindakan; sistem akan melewati data ini.",
    },
    duplicate_by_code: {
      label: "Kode yang sama sudah ada di target",
      problem: "Kode sudah dipakai di target sehingga baris baru berisiko bentrok.",
      action: "Periksa data target yang ada dan hindari insert ganda.",
    },
    duplicate_by_name: {
      label: "Nama serupa sudah ada di target",
      problem: "Nama sama/serupa terdeteksi sehingga berisiko duplikasi logis.",
      action: "Verifikasi baris target yang serupa sebelum commit.",
    },
    source_unmapped: {
      label: "Data sumber belum terhubung ke master",
      problem: "Baris RPJMD belum memiliki relasi master yang dibutuhkan.",
      action:
        "Jalankan Auto Mapping Program/Kegiatan/Sub atau backfill, lalu preview ulang.",
    },
    target_parent_missing: {
      label: "Parent tujuan belum tersedia",
      problem: "Program/kegiatan parent di RKPD belum ada.",
      action:
        "Aktifkan opsi 'Buat parent tujuan jika belum ada' atau lengkapi parent target lebih dulu.",
    },
    target_parent_conflict: {
      label: "Parent tujuan bertentangan dengan mapping sumber",
      problem: "Parent di target tidak selaras dengan master pada sumber.",
      action: "Perbaiki mapping parent agar konsisten lalu jalankan preview ulang.",
    },
    hierarchy_conflict: {
      label: "Struktur parent-child tidak sesuai",
      problem: "Hierarki sumber dan target tidak berada pada cabang yang sama.",
      action: "Periksa relasi program-kegiatan-sub sebelum commit.",
    },
    ownership_conflict: {
      label: "Konteks OPD tidak sesuai",
      problem: "Validasi OPD ketat menemukan perbedaan kepemilikan data.",
      action: "Periksa filter OPD atau nonaktifkan validasi OPD ketat bila sesuai kebijakan.",
    },
    cross_document_program_slot: {
      label: "Slot program lintas dokumen sudah dipakai",
      problem:
        "Kode/nama program periode target telah dipakai dokumen lain sehingga berisiko melanggar constraint.",
      action: "Gunakan konteks periode target yang tepat atau rapikan data lintas dokumen.",
    },
    cross_document_sub_slot: {
      label: "Slot sub kegiatan lintas dokumen sudah dipakai",
      problem:
        "Kode/nama sub kegiatan periode target telah dipakai dokumen lain sehingga berisiko melanggar constraint.",
      action: "Gunakan konteks periode target yang tepat atau rapikan data lintas dokumen.",
    },
    fatal_validation_error: {
      label: "Validasi fatal",
      problem: "Ada pelanggaran aturan kritis.",
      action: "Selesaikan seluruh validasi fatal sebelum commit.",
    },
  };
  return (
    meta[key] || {
      label: key || "-",
      problem: "Kategori belum memiliki deskripsi.",
      action: "Tinjau detail preview sebelum melanjutkan.",
    }
  );
}

export default function RpjmdRkpdSyncPage() {
  const { tahun: dokumenTahun } = useDokumen();
  const { periode_id: periodeAktif } = usePeriodeAktif();

  const [periodeList, setPeriodeList] = useState([]);
  const [opdList, setOpdList] = useState([]);

  const [srcPeriodeId, setSrcPeriodeId] = useState("");
  const [srcTahun, setSrcTahun] = useState(
    String(dokumenTahun || new Date().getFullYear()),
  );
  const [tgtPeriodeId, setTgtPeriodeId] = useState("");
  const [tgtTahun, setTgtTahun] = useState(
    String(dokumenTahun || new Date().getFullYear()),
  );
  /** Pilihan tunggal (dropdown) — diprioritaskan di atas input teks ID. */
  const [selProgramId, setSelProgramId] = useState("");
  const [selKegiatanId, setSelKegiatanId] = useState("");
  const [selSubId, setSelSubId] = useState("");
  const [filterMasterSelect, setFilterMasterSelect] = useState("");
  const [programOptions, setProgramOptions] = useState([]);
  const [kegiatanOptions, setKegiatanOptions] = useState([]);
  const [subOptions, setSubOptions] = useState([]);
  const [progLoading, setProgLoading] = useState(false);
  const [kegLoading, setKegLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [showAdvancedIds, setShowAdvancedIds] = useState(false);

  const [filterProgram, setFilterProgram] = useState("");
  const [filterKegiatan, setFilterKegiatan] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterMasterProgram, setFilterMasterProgram] = useState("");
  const [filterMasterKegiatan, setFilterMasterKegiatan] = useState("");
  const [filterMasterSubKegiatan, setFilterMasterSubKegiatan] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [strictParent, setStrictParent] = useState(true);
  const [strictOpd, setStrictOpd] = useState(false);
  const [allowCreateParents, setAllowCreateParents] = useState(false);
  const [opdId, setOpdId] = useState("");
  const [commitReason, setCommitReason] = useState("");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [lastBody, setLastBody] = useState(null);
  const [autoMapState, setAutoMapState] = useState({
    program: {
      previewLoading: false,
      executeLoading: false,
      previewData: null,
      executeData: null,
      message: "",
      lastPayload: null,
      confirm: false,
    },
    kegiatan: {
      previewLoading: false,
      executeLoading: false,
      previewData: null,
      executeData: null,
      message: "",
      lastPayload: null,
      confirm: false,
    },
    sub: {
      previewLoading: false,
      executeLoading: false,
      previewData: null,
      executeData: null,
      message: "",
      lastPayload: null,
      confirm: false,
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/periode-rpjmd");
        const { data } = extractListResponse(res.data);
        if (!cancelled) setPeriodeList(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setPeriodeList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!periodeList.length || !periodeAktif) return;
    const idStr = String(periodeAktif);
    const exists = periodeList.some((p) => String(p.id) === idStr);
    if (!exists) return;
    setSrcPeriodeId((cur) => (cur ? cur : idStr));
    setTgtPeriodeId((cur) => (cur ? cur : idStr));
  }, [periodeList, periodeAktif]);

  const srcPeriode = useMemo(
    () => periodeList.find((p) => String(p.id) === String(srcPeriodeId)),
    [periodeList, srcPeriodeId],
  );
  const tgtPeriode = useMemo(
    () => periodeList.find((p) => String(p.id) === String(tgtPeriodeId)),
    [periodeList, tgtPeriodeId],
  );

  const srcYearOptions = useMemo(() => yearOptionsForPeriode(srcPeriode), [srcPeriode]);
  const tgtYearOptions = useMemo(() => yearOptionsForPeriode(tgtPeriode), [tgtPeriode]);

  useEffect(() => {
    if (!srcPeriodeId || !srcPeriode) {
      setSrcTahun("");
      return;
    }
    setSrcTahun((cur) => clampTahunToPeriode(cur, srcPeriode));
  }, [srcPeriodeId, srcPeriode]);

  useEffect(() => {
    if (!tgtPeriodeId || !tgtPeriode) {
      setTgtTahun("");
      return;
    }
    setTgtTahun((cur) => clampTahunToPeriode(cur, tgtPeriode));
  }, [tgtPeriodeId, tgtPeriode]);

  useEffect(() => {
    let cancelled = false;
    const tahun = parseInt(srcTahun, 10);
    const params = { jenis_dokumen: "rpjmd" };
    if (Number.isInteger(tahun)) params.tahun = tahun;
    (async () => {
      try {
        const res = await api.get("/opd-penanggung-jawab/dropdown", { params });
        const { data } = extractListResponse(res.data);
        if (!cancelled) setOpdList(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setOpdList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [srcTahun]);

  useEffect(() => {
    setSelProgramId("");
    setSelKegiatanId("");
    setSelSubId("");
    setFilterMasterSelect("");
  }, [srcPeriodeId, srcTahun, opdId]);

  const patchAutoMapLevel = useCallback((level, patch) => {
    setAutoMapState((cur) => ({
      ...cur,
      [level]: {
        ...cur[level],
        ...patch,
      },
    }));
  }, []);

  useEffect(() => {
    setAutoMapState({
      program: {
        previewLoading: false,
        executeLoading: false,
        previewData: null,
        executeData: null,
        message: "",
        lastPayload: null,
        confirm: false,
      },
      kegiatan: {
        previewLoading: false,
        executeLoading: false,
        previewData: null,
        executeData: null,
        message: "",
        lastPayload: null,
        confirm: false,
      },
      sub: {
        previewLoading: false,
        executeLoading: false,
        previewData: null,
        executeData: null,
        message: "",
        lastPayload: null,
        confirm: false,
      },
    });
  }, [srcPeriodeId, srcTahun, selProgramId, selKegiatanId, selSubId]);

  useEffect(() => {
    if (!srcPeriodeId || !srcTahun) {
      setProgramOptions([]);
      return;
    }
    let cancelled = false;
    setProgLoading(true);
    (async () => {
      try {
        const res = await api.get("/programs/all", {
          params: { tahun: srcTahun, jenis_dokumen: "rpjmd" },
        });
        const { data } = extractListResponse(res.data);
        let rows = Array.isArray(data) ? data : [];
        rows = rows.filter((p) => String(p.periode_id) === String(srcPeriodeId));

        // Adapter: opdId (dropdown) bisa berbeda dengan program.opd_penanggung_jawab.
        // Gunakan daftar kandidat dari dropdown, lalu pilih effective id paling relevan agar hasil tidak kosong.
        if (opdId) {
          const resolved = resolveEffectiveOpdPenanggungJawabId({
            selected_dropdown_id: opdId,
            opd_list: opdList,
            programs_for_context: rows,
          });
          const idSet = new Set((resolved.candidate_ids || []).map((x) => Number(x)));
          const before = rows.length;
          rows = rows.filter((p) => idSet.has(Number(p.opd_penanggung_jawab)));

          if (!cancelled) {
            console.debug("[RpjmdRkpdSyncPage] OPD filter debug", {
              opd_id_ui: resolved.raw_dropdown_id,
              opd_id_final: resolved.effective_id,
              opd_id_candidates: resolved.candidate_ids || [],
              programs_before_opd_filter: before,
              programs_found: rows.length,
            });
          }
        }

        rows.sort((a, b) =>
          String(a.kode_program || "").localeCompare(String(b.kode_program || ""), "id"),
        );
        if (!cancelled) setProgramOptions(rows);
      } catch {
        if (!cancelled) setProgramOptions([]);
      } finally {
        if (!cancelled) setProgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [srcPeriodeId, srcTahun, opdId, opdList]);

  useEffect(() => {
    setSelKegiatanId("");
    setSelSubId("");
    if (!selProgramId) {
      setKegiatanOptions([]);
      return;
    }
    let cancelled = false;
    setKegLoading(true);
    (async () => {
      try {
        const res = await api.get(`/kegiatan/by-program/${selProgramId}`);
        const { data } = extractListResponse(res.data);
        let rows = Array.isArray(data) ? data : [];
        rows = rows.filter((k) => {
          if (String(k.program_id) !== String(selProgramId)) return false;
          if (String(k.periode_id) !== String(srcPeriodeId)) return false;
          if (String(k.tahun) !== String(srcTahun)) return false;
          return normJenis(k.jenis_dokumen) === "rpjmd";
        });
        rows.sort((a, b) =>
          String(a.kode_kegiatan || "").localeCompare(String(b.kode_kegiatan || ""), "id"),
        );
        if (!cancelled) setKegiatanOptions(rows);
      } catch {
        if (!cancelled) setKegiatanOptions([]);
      } finally {
        if (!cancelled) setKegLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selProgramId, srcPeriodeId, srcTahun]);

  useEffect(() => {
    setSelSubId("");
    if (!selKegiatanId || !srcTahun) {
      setSubOptions([]);
      return;
    }
    let cancelled = false;
    setSubLoading(true);
    (async () => {
      try {
        const res = await api.get("/sub-kegiatan", {
          params: {
            kegiatan_id: selKegiatanId,
            tahun: srcTahun,
            jenis_dokumen: "rpjmd",
            limit: 500,
            page: 1,
          },
        });
        const { data } = extractListResponse(res.data);
        const rows = Array.isArray(data) ? data : [];
        rows.sort((a, b) =>
          String(a.kode_sub_kegiatan || "").localeCompare(
            String(b.kode_sub_kegiatan || ""),
            "id",
          ),
        );
        if (!cancelled) setSubOptions(rows);
      } catch {
        if (!cancelled) setSubOptions([]);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selKegiatanId, srcTahun]);

  const masterOptions = useMemo(() => {
    const m = new Map();
    for (const p of programOptions) {
      const mid = p.master_program_id;
      if (mid == null || mid === "") continue;
      const n = Number(mid);
      if (!Number.isInteger(n) || n < 1) continue;
      if (!m.has(n)) {
        m.set(n, {
          id: n,
          label: `${p.kode_program || "?"} · ${labelTruncate(p.nama_program, 48)}`,
        });
      }
    }
    const sp = selProgramId
      ? programOptions.find((p) => String(p.id) === String(selProgramId))
      : null;
    const selMid = sp?.master_program_id;
    const selN = Number(selMid);
    if (
      sp &&
      Number.isInteger(selN) &&
      selN >= 1 &&
      !m.has(selN)
    ) {
      m.set(selN, {
        id: selN,
        label: `${sp.kode_program || "?"} · ${labelTruncate(sp.nama_program, 48)} (program terpilih)`,
      });
    }
    return [...m.values()].sort((a, b) => a.id - b.id);
  }, [programOptions, selProgramId]);

  const selectedProgram = useMemo(
    () =>
      selProgramId
        ? programOptions.find((p) => String(p.id) === String(selProgramId))
        : null,
    [programOptions, selProgramId],
  );

  const selectedMasterId = useMemo(() => {
    const raw = selectedProgram?.master_program_id;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 ? n : null;
  }, [selectedProgram]);

  useEffect(() => {
    if (!selProgramId) {
      setFilterMasterSelect("");
      return;
    }
    const sp = programOptions.find((p) => String(p.id) === String(selProgramId));
    const n = Number(sp?.master_program_id);
    if (!Number.isInteger(n) || n < 1) {
      setFilterMasterSelect("");
    }
  }, [selProgramId, programOptions]);

  const buildPayload = useCallback(() => {
    const resolved = opdId
      ? resolveEffectiveOpdPenanggungJawabId({
          selected_dropdown_id: opdId,
          opd_list: opdList,
          programs_for_context: programOptions,
        })
      : null;
    const body = {
      source: {
        periode_id: parseInt(srcPeriodeId, 10),
        tahun: parseInt(String(srcTahun), 10),
        jenis_dokumen: "rpjmd",
      },
      target: {
        periode_id: parseInt(tgtPeriodeId, 10),
        tahun: parseInt(String(tgtTahun), 10),
        jenis_dokumen: "rkpd",
      },
      filters: {
        program_ids: selProgramId
          ? [parseInt(selProgramId, 10)]
          : parseIdList(filterProgram),
        kegiatan_ids: selKegiatanId
          ? [parseInt(selKegiatanId, 10)]
          : parseIdList(filterKegiatan),
        sub_kegiatan_ids: selSubId
          ? [parseInt(selSubId, 10)]
          : parseIdList(filterSub),
        master_program_ids: filterMasterSelect
          ? [parseInt(filterMasterSelect, 10)]
          : parseIdList(filterMasterProgram),
        master_kegiatan_ids: parseIdList(filterMasterKegiatan),
        master_sub_kegiatan_ids: parseIdList(filterMasterSubKegiatan),
      },
      options: {
        skip_duplicates: skipDuplicates,
        strict_parent_mapping: strictParent,
        strict_opd_validation: strictOpd,
        allow_create_missing_parents: allowCreateParents,
      },
    };
    // Gunakan id hasil adapter agar konsisten dengan nilai di program.opd_penanggung_jawab.
    // Jika tidak tersedia, fallback ke dropdown id lama.
    const oid =
      Number.isInteger(resolved?.effective_id) && resolved.effective_id >= 1
        ? resolved.effective_id
        : parseIdList(opdId)[0];
    if (oid) body.opd_penanggung_jawab_id = oid;

    if (opdId) {
      console.debug("[RpjmdRkpdSyncPage] buildPayload OPD adapter", {
        opd_id_ui: resolved?.raw_dropdown_id ?? parseIdList(opdId)[0] ?? null,
        opd_id_effective: oid || null,
        opd_id_candidates: resolved?.candidate_ids || [],
      });
    }
    return body;
  }, [
    srcPeriodeId,
    srcTahun,
    tgtPeriodeId,
    tgtTahun,
    selProgramId,
    selKegiatanId,
    selSubId,
    filterMasterSelect,
    filterProgram,
    filterKegiatan,
    filterSub,
    filterMasterProgram,
    filterMasterKegiatan,
    filterMasterSubKegiatan,
    skipDuplicates,
    strictParent,
    strictOpd,
    allowCreateParents,
    opdId,
    opdList,
    programOptions,
  ]);

  const previewBlocked = Boolean(previewData?.summary?.commit_blocked);
  const previewOk =
    Boolean(previewData?.summary) &&
    !previewBlocked &&
    !previewLoading &&
    lastBody;

  const handlePreview = async () => {
    setMessage("");
    setPreviewData(null);
    setLastBody(null);
    setPreviewLoading(true);
    try {
      const body = buildPayload();
      if (!Number.isInteger(body.source.periode_id) || body.source.periode_id < 1) {
        setMessage("Pilih periode sumber (RPJMD).");
        return;
      }
      if (!Number.isInteger(body.target.periode_id) || body.target.periode_id < 1) {
        setMessage("Pilih periode target (RKPD).");
        return;
      }
      if (!Number.isInteger(body.source.tahun) || body.source.tahun < 1) {
        setMessage("Pilih tahun anggaran sumber.");
        return;
      }
      if (!Number.isInteger(body.target.tahun) || body.target.tahun < 1) {
        setMessage("Pilih tahun anggaran target.");
        return;
      }
      const res = await api.post("/rpjmd-rkpd-sync/preview", body);
      if (res.data?.success) {
        setPreviewData(res.data.data);
        setLastBody(body);
        setMessage(res.data.data?.admin_message || "Preview sync selesai (read-only).");
      } else {
        setMessage(res.data?.message || "Preview gagal.");
      }
    } catch (e) {
      setMessage(
        e?.response?.data?.message || e?.message || "Preview sync gagal.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!lastBody) return;
    setMessage("");
    setCommitLoading(true);
    try {
      const res = await api.post("/rpjmd-rkpd-sync/commit", {
        ...lastBody,
        confirm: true,
        reason: commitReason.trim() || undefined,
      });
      if (res.data?.success) {
        setMessage(
          res.data.data?.admin_message ||
            "Commit sync selesai. Jalankan preview lagi untuk verifikasi lanjutan.",
        );
        setPreviewData(null);
        setLastBody(null);
      } else {
        setMessage(res.data?.message || "Commit ditolak.");
      }
    } catch (e) {
      const d = e?.response?.data?.data;
      const extra =
        d?.commit_blocked_reasons?.messages?.length
          ? ` ${d.commit_blocked_reasons.messages.join("; ")}`
          : "";
      setMessage(
        (e?.response?.data?.message || e?.message || "Commit gagal.") + extra,
      );
    } finally {
      setCommitLoading(false);
    }
  };

  const buildAutoMapPayload = useCallback(
    (level) => {
      const cfg = AUTO_MAP_LEVEL_CONFIG[level];
      if (!cfg) return null;
      const body = {
        dataset_key: AUTO_MAP_DATASET_KEY,
        periode_id: parseInt(srcPeriodeId, 10),
        tahun: parseInt(String(srcTahun), 10),
        jenis_dokumen: "rpjmd",
      };
      if (level === "program" && selProgramId) {
        body[cfg.idField] = [parseInt(selProgramId, 10)];
      }
      if (level === "kegiatan" && selKegiatanId) {
        body[cfg.idField] = [parseInt(selKegiatanId, 10)];
      }
      if (level === "sub" && selSubId) {
        body[cfg.idField] = [parseInt(selSubId, 10)];
      }
      return body;
    },
    [srcPeriodeId, srcTahun, selProgramId, selKegiatanId, selSubId],
  );

  const isAutoMapPreviewFresh = useCallback(
    (level) => {
      const lastPayload = autoMapState[level]?.lastPayload;
      if (!lastPayload) return false;
      const currentPayload = buildAutoMapPayload(level);
      return JSON.stringify(lastPayload) === JSON.stringify(currentPayload);
    },
    [autoMapState, buildAutoMapPayload],
  );

  const autoMapReadyCount = useCallback(
    (level) => {
      const cfg = AUTO_MAP_LEVEL_CONFIG[level];
      const sum = autoMapState[level]?.previewData?.summary || {};
      return Number(sum?.[cfg?.readyKey] ?? 0);
    },
    [autoMapState],
  );

  const handleAutoMapPreview = async (level) => {
    const cfg = AUTO_MAP_LEVEL_CONFIG[level];
    if (!cfg) return;

    const payload = buildAutoMapPayload(level);
    if (
      !Number.isInteger(payload?.periode_id) ||
      payload.periode_id < 1 ||
      !Number.isInteger(payload?.tahun) ||
      payload.tahun < 1
    ) {
      patchAutoMapLevel(level, {
        message: "Pilih periode dan tahun sumber RPJMD terlebih dahulu.",
      });
      return;
    }

    patchAutoMapLevel(level, {
      previewLoading: true,
      message: "",
      previewData: null,
      executeData: null,
      confirm: false,
      lastPayload: null,
    });

    try {
      const res = await api.post(cfg.previewPath, payload);
      if (res.data?.success) {
        patchAutoMapLevel(level, {
          previewData: res.data.data,
          lastPayload: payload,
          message: `Pratinjau auto mapping ${cfg.title.toLowerCase()} selesai.`,
        });
      } else {
        patchAutoMapLevel(level, {
          message:
            res.data?.message ||
            `Pratinjau auto mapping ${cfg.title.toLowerCase()} gagal.`,
        });
      }
    } catch (e) {
      patchAutoMapLevel(level, {
        message:
          e?.response?.data?.message ||
          e?.message ||
          `Pratinjau auto mapping ${cfg.title.toLowerCase()} gagal.`,
      });
    } finally {
      patchAutoMapLevel(level, { previewLoading: false });
    }
  };

  const handleAutoMapExecute = async (level) => {
    const cfg = AUTO_MAP_LEVEL_CONFIG[level];
    if (!cfg) return;
    const lv = autoMapState[level] || {};
    if (!lv.lastPayload) return;

    const readyCount = autoMapReadyCount(level);
    if (!Number.isFinite(readyCount) || readyCount <= 0) return;

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Sistem akan memetakan ${readyCount} ${cfg.entityNoun} berdasarkan kecocokan kode yang identik. Data lain tidak akan diubah.`,
          );
    if (!confirmed) {
      patchAutoMapLevel(level, {
        message: `Eksekusi auto mapping ${cfg.title.toLowerCase()} dibatalkan.`,
      });
      return;
    }

    patchAutoMapLevel(level, { executeLoading: true, message: "" });
    try {
      const res = await api.post(cfg.executePath, {
        ...lv.lastPayload,
        confirm: true,
      });
      if (res.data?.success) {
        patchAutoMapLevel(level, {
          executeData: res.data.data,
          message: `Eksekusi auto mapping ${cfg.title.toLowerCase()} selesai.`,
        });
      } else {
        patchAutoMapLevel(level, {
          message:
            res.data?.message ||
            `Eksekusi auto mapping ${cfg.title.toLowerCase()} ditolak.`,
        });
      }
    } catch (e) {
      patchAutoMapLevel(level, {
        message:
          e?.response?.data?.message ||
          e?.message ||
          `Eksekusi auto mapping ${cfg.title.toLowerCase()} gagal.`,
      });
    } finally {
      patchAutoMapLevel(level, { executeLoading: false });
    }
  };

  const summary = previewData?.summary;
  const cc = previewData?.classification_counts || {};
  const sample = previewData?.sample || [];
  const nonZeroCategories = useMemo(
    () => Object.entries(cc).filter(([, count]) => Number(count) > 0),
    [cc],
  );
  const conflictCategories = useMemo(
    () =>
      nonZeroCategories
        .filter(([category]) => category !== "ready")
        .map(([category, count]) => ({
          category,
          count: Number(count),
          ...syncCategoryMeta(category),
        })),
    [nonZeroCategories],
  );

  return (
    <Container className="my-4">
      <h4 className="mb-2">Sinkronisasi RPJMD ke RKPD (Mode Aman)</h4>
      <p className="text-muted small">
        Alur: <strong>Preview</strong> (tidak menulis DB) -&gt; tinjau klasifikasi -&gt;{" "}
        <strong>Commit</strong> dengan <code>confirm: true</code>. Hanya{" "}
        <Badge bg="secondary">SUPER_ADMIN</Badge> /{" "}
        <Badge bg="secondary">ADMINISTRATOR</Badge>. Tidak ada overwrite baris
        RKPD existing; insert hanya jika slot unik (perhatikan constraint
        periode+kode sub). Nonaktifkan fitur dengan env{" "}
        <code>RPJMD_RKPD_SYNC_ENABLED=0</code>.
      </p>
      <Alert variant="light" className="small border py-2 mb-3">
        <strong>Alur filter (opsional):</strong> tentukan periode &amp; tahun sumber -&gt; pilih{" "}
        <em>OPD penanggung jawab</em> bila ingin membatasi ke satu perangkat daerah -&gt; pilih{" "}
        <em>Program</em>, lalu <em>Kegiatan</em>, lalu <em>Sub kegiatan</em>. Kosongkan semua
        filter untuk meninjau seluruh RPJMD pada periode/tahun tersebut. Pilihan dropdown
        menggantikan kolom ID teks kecuali Anda membuka mode lanjutan.
      </Alert>

      <Card className="mb-3 border-info shadow-sm">
        <Card.Body>
          <Card.Title className="h6 mb-2">Langkah yang Disarankan</Card.Title>
          <ol className="small mb-2 ps-3">
            <li>Jalankan Auto Mapping Program.</li>
            <li>Jika masih ada data sumber belum termapping, jalankan Auto Mapping Kegiatan.</li>
            <li>Jika masih ada data sumber belum termapping, jalankan Auto Mapping Sub Kegiatan.</li>
            <li>Jalankan Preview Sync.</li>
            <li>Selesaikan konflik yang tersisa.</li>
            <li>Lanjutkan Commit setelah hasil aman.</li>
          </ol>
          <Alert variant="light" className="small py-2 mb-0">
            Sync hanya menambahkan data yang aman dan tidak menimpa data RKPD existing.
            Pratinjau wajib dilakukan sebelum commit.
          </Alert>
        </Card.Body>
      </Card>

      {message ? (
        <Alert
          variant={/gagal|ditolak|blocked/i.test(message) ? "warning" : "info"}
          className="mb-3"
          dismissible
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      ) : null}

      <Row>
        <Col lg={6}>
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <Card.Title className="h6">Sumber (RPJMD)</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>Periode RPJMD</Form.Label>
                <Form.Select
                  value={srcPeriodeId}
                  onChange={(e) => setSrcPeriodeId(e.target.value)}
                >
                  <option value="">— pilih periode —</option>
                  {periodeList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.tahun_awal}–{p.tahun_akhir}) · id {p.id}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Daftar dari master periode; pilih entri yang sama dengan data RPJMD Anda.
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Tahun anggaran (dalam rentang periode)</Form.Label>
                <Form.Select
                  value={srcYearOptions.length ? srcTahun : ""}
                  onChange={(e) => setSrcTahun(e.target.value)}
                  disabled={!srcYearOptions.length}
                >
                  {!srcYearOptions.length ? (
                    <option value="">Pilih periode dulu</option>
                  ) : (
                    srcYearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))
                  )}
                </Form.Select>
              </Form.Group>

              <hr />
              <Card.Title className="h6">Target (RKPD)</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>Periode (konteks RKPD)</Form.Label>
                <Form.Select
                  value={tgtPeriodeId}
                  onChange={(e) => setTgtPeriodeId(e.target.value)}
                >
                  <option value="">— pilih periode —</option>
                  {periodeList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.tahun_awal}–{p.tahun_akhir}) · id {p.id}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Biasanya sama dengan sumber; boleh beda jika alur data Anda memisahkan konteks.
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Tahun anggaran RKPD</Form.Label>
                <Form.Select
                  value={tgtYearOptions.length ? tgtTahun : ""}
                  onChange={(e) => setTgtTahun(e.target.value)}
                  disabled={!tgtYearOptions.length}
                >
                  {!tgtYearOptions.length ? (
                    <option value="">Pilih periode dulu</option>
                  ) : (
                    tgtYearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))
                  )}
                </Form.Select>
              </Form.Group>

              <hr />
              <Card.Title className="h6">OPD penanggung jawab (opsional)</Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>Perangkat daerah</Form.Label>
                <Form.Select value={opdId} onChange={(e) => setOpdId(e.target.value)}>
                  <option value="">— semua OPD (tidak filter daftar program) —</option>
                  {opdList.map((o) => (
                    <option key={String(o.id)} value={String(o.id)}>
                      {o.nama_opd || o.nama || "OPD"} (id {o.id})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Membatasi <strong>daftar program</strong> di bawah ke program dengan OPD ini
                  (kolom <code>opd_penanggung_jawab</code>). Tetap bisa dikirim ke server sebagai{" "}
                  <code>opd_penanggung_jawab_id</code> untuk validasi ketat — centang{" "}
                  <em>strict_opd_validation</em> di bawah. Daftar memakai tahun sumber (
                  {srcTahun || "…"}) dan jenis RPJMD.
                </Form.Text>
              </Form.Group>

              <hr />
              <Card.Title className="h6 d-flex align-items-center gap-2">
                Filter hierarki (opsional)
                {progLoading ? <Spinner size="sm" animation="border" /> : null}
              </Card.Title>
              <Form.Group className="mb-2">
                <Form.Label>Program (RPJMD)</Form.Label>
                <Form.Select
                  value={selProgramId}
                  onChange={(e) => setSelProgramId(e.target.value)}
                  disabled={!srcPeriodeId || !srcTahun || progLoading}
                >
                  <option value="">— semua program pada periode/tahun —</option>
                  {programOptions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.kode_program} {labelTruncate(p.nama_program, 56)} · id {p.id}
                    </option>
                  ))}
                </Form.Select>
                {!programOptions.length && srcPeriodeId && srcTahun && !progLoading ? (
                  <Form.Text className="text-warning">
                    Tidak ada program RPJMD yang cocok. Periksa tahun, periode, atau pilihan OPD.
                  </Form.Text>
                ) : null}
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="d-flex align-items-center gap-2">
                  Kegiatan
                  {kegLoading ? <Spinner size="sm" animation="border" /> : null}
                </Form.Label>
                <Form.Select
                  value={selKegiatanId}
                  onChange={(e) => setSelKegiatanId(e.target.value)}
                  disabled={!selProgramId || kegLoading}
                >
                  <option value="">
                    {selProgramId ? "— semua kegiatan pada program —" : "— pilih program dulu —"}
                  </option>
                  {kegiatanOptions.map((k) => (
                    <option key={k.id} value={String(k.id)}>
                      {k.kode_kegiatan} {labelTruncate(k.nama_kegiatan, 52)} · id {k.id}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="d-flex align-items-center gap-2">
                  Sub kegiatan
                  {subLoading ? <Spinner size="sm" animation="border" /> : null}
                </Form.Label>
                <Form.Select
                  value={selSubId}
                  onChange={(e) => setSelSubId(e.target.value)}
                  disabled={!selKegiatanId || subLoading}
                >
                  <option value="">
                    {selKegiatanId
                      ? "— semua sub pada kegiatan —"
                      : "— pilih kegiatan dulu —"}
                  </option>
                  {subOptions.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.kode_sub_kegiatan} {labelTruncate(s.nama_sub_kegiatan, 48)} · id{" "}
                      {s.id}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Master program (opsional)</Form.Label>
                {selectedProgram ? (
                  selectedMasterId != null ? (
                    <div className="small mb-2 p-2 bg-light rounded border">
                      Program terpilih punya <code>master_program_id = {selectedMasterId}</code>{" "}
                      di data RPJMD. Filter ini <strong>tidak wajib</strong> — memilih Program
                      saja sudah membatasi sync. Gunakan master hanya bila ingin membatasi
                      tambahan ke baris dengan master tertentu.
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => setFilterMasterSelect(String(selectedMasterId))}
                        >
                          Terapkan master {selectedMasterId} ke filter
                        </Button>
                        <Button
                          type="button"
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setFilterMasterSelect("")}
                        >
                          Hapus filter master
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="small mb-2 p-2 bg-warning bg-opacity-10 rounded border border-warning">
                      Program terpilih <strong>belum</strong> memiliki{" "}
                      <code>master_program_id</code> (masih kosong di database). Dropdown di
                      bawah hanya berisi master dari program lain di daftar OPD Anda — sering
                      kali hanya opsi &quot;tidak filter&quot;. Itu <strong>normal</strong> untuk
                      data LEGACY / belum di-link ke master.
                      <div className="mt-1">
                        <strong>Tidak perlu</strong> membuka input ID teks kecuali Anda sengaja
                        ingin memfilter <code>master_program_id</code> tertentu yang Anda ketahui
                        ID-nya.
                      </div>
                      <div className="mt-2 small">
                        Agar program ini terhubung ke master: lakukan{" "}
                        <strong>backfill mapping</strong> (preview → execute) atau impor dari
                        master referensi — misalnya lewat{" "}
                        <Link to="/rpjmd/bulk-master-import">
                          impor master &amp; helper backfill
                        </Link>
                        . Setelah <code>master_program_id</code> terisi di database, muat ulang
                        halaman ini; dropdown Master dapat dipakai jika perlu filter tambahan.
                      </div>
                    </div>
                  )
                ) : (
                  <Form.Text className="text-muted d-block mb-2">
                    Pilih program dulu untuk melihat status <code>master_program_id</code> pada
                    baris RPJMD tersebut.
                  </Form.Text>
                )}
                <Form.Select
                  value={filterMasterSelect}
                  onChange={(e) => setFilterMasterSelect(e.target.value)}
                  disabled={!programOptions.length}
                >
                  <option value="">— tidak filter master_program_id —</option>
                  {masterOptions.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      Master ID {m.id} — {m.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Opsi muncul dari program yang ada di daftar (setelah filter OPD) dan memiliki
                  master terisi. Sync tetap bisa di-<em>Preview</em> tanpa memilih master.
                </Form.Text>
              </Form.Group>

              <Button
                variant="outline-secondary"
                size="sm"
                className="mb-2"
                onClick={() => setShowAdvancedIds(!showAdvancedIds)}
              >
                {showAdvancedIds ? "Sembunyikan" : "Tampilkan"} input ID teks (banyak ID / copy-paste)
              </Button>
              <Collapse in={showAdvancedIds}>
                <div className="border rounded p-2 bg-light small mb-2">
                  <p className="mb-2 text-muted">
                    Dipakai bila perlu beberapa ID sekaligus. Jika kolom dropdown di atas terisi,
                    nilai teks di bawah untuk entitas yang sama <strong>diabaikan</strong>.
                  </p>
                  <Form.Group className="mb-2">
                    <Form.Label>program_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterProgram}
                      onChange={(e) => setFilterProgram(e.target.value)}
                      placeholder="contoh: 1, 2"
                      disabled={Boolean(selProgramId)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>kegiatan_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterKegiatan}
                      onChange={(e) => setFilterKegiatan(e.target.value)}
                      disabled={Boolean(selKegiatanId)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>sub_kegiatan_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterSub}
                      onChange={(e) => setFilterSub(e.target.value)}
                      disabled={Boolean(selSubId)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-0">
                    <Form.Label>master_program_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterMasterProgram}
                      onChange={(e) => setFilterMasterProgram(e.target.value)}
                      placeholder="contoh: 10, 11"
                      disabled={Boolean(filterMasterSelect)}
                    />
                  </Form.Group>
                  <Form.Group className="mt-2 mb-0">
                    <Form.Label>master_kegiatan_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterMasterKegiatan}
                      onChange={(e) => setFilterMasterKegiatan(e.target.value)}
                      placeholder="contoh: 101, 102"
                    />
                  </Form.Group>
                  <Form.Group className="mt-2 mb-0">
                    <Form.Label>master_sub_kegiatan_ids</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={filterMasterSubKegiatan}
                      onChange={(e) => setFilterMasterSubKegiatan(e.target.value)}
                      placeholder="contoh: 2001, 2002"
                    />
                  </Form.Group>
                </div>
              </Collapse>

              <hr />
              <Form.Check
                type="checkbox"
                id="skipDup"
                label="Lewati data duplikat yang sudah ada"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                id="strictP"
                className="mt-2"
                label="Gunakan hanya struktur yang sesuai"
                checked={strictParent}
                onChange={(e) => setStrictParent(e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                id="strictOpd"
                className="mt-2"
                label="Validasi OPD secara ketat"
                checked={strictOpd}
                onChange={(e) => setStrictOpd(e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                id="allowCreate"
                className="mt-2"
                label="Buat parent tujuan jika belum ada"
                checked={allowCreateParents}
                onChange={(e) => setAllowCreateParents(e.target.checked)}
              />

              <Button
                variant="primary"
                className="me-2 mt-2"
                onClick={handlePreview}
                disabled={previewLoading}
              >
                {previewLoading ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Preview…
                  </>
                ) : (
                  "Preview sync"
                )}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="mb-3 border-primary shadow-sm">
            <Card.Body>
              <Card.Title className="h6">Aksi Cepat Auto Mapping Master</Card.Title>
              <p className="small text-muted mb-2">
                Gunakan panel ini untuk menyelesaikan data sumber_unmapped sebelum preview sync.
                Semua aksi tetap mengikuti pola pratinjau dahulu, eksekusi belakangan.
              </p>
              <Row className="g-2">
                {Object.entries(AUTO_MAP_LEVEL_CONFIG).map(([level, cfg]) => {
                  const lv = autoMapState[level] || {};
                  const summaryLv = lv.previewData?.summary || {};
                  const readyCount = autoMapReadyCount(level);
                  const ambiguousCount = Number(summaryLv.ambiguous ?? 0);
                  const notFoundCount = Number(summaryLv.not_found ?? 0);
                  const totalCount = Number(summaryLv[cfg.totalKey] ?? 0);
                  const previewFresh = isAutoMapPreviewFresh(level);
                  const executeReady = Boolean(
                    lv.lastPayload &&
                      previewFresh &&
                      readyCount > 0 &&
                      !lv.previewLoading &&
                      !lv.executeLoading,
                  );
                  const payloadLv = buildAutoMapPayload(level);
                  const massScan =
                    !Array.isArray(payloadLv?.[cfg.idField]) ||
                    payloadLv[cfg.idField].length < 1;
                  const execSummary = lv.executeData?.summary || {};

                  return (
                    <Col xl={4} md={12} key={level}>
                      <div className="border rounded p-2 h-100 bg-light">
                        <div className="fw-semibold small mb-2">{cfg.title}</div>
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleAutoMapPreview(level)}
                            disabled={lv.previewLoading || !srcPeriodeId || !srcTahun}
                          >
                            {lv.previewLoading ? (
                              <>
                                <Spinner size="sm" className="me-1" /> Preview...
                              </>
                            ) : (
                              "Preview"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAutoMapExecute(level)}
                            disabled={!executeReady || !lv.confirm || lv.executeLoading}
                          >
                            {lv.executeLoading ? (
                              <>
                                <Spinner size="sm" className="me-1" /> Terapkan...
                              </>
                            ) : (
                              "Terapkan"
                            )}
                          </Button>
                        </div>
                        <Form.Check
                          type="checkbox"
                          id={`confirm-${level}`}
                          className="small mb-2"
                          checked={Boolean(lv.confirm)}
                          disabled={!executeReady || lv.executeLoading}
                          onChange={(e) =>
                            patchAutoMapLevel(level, { confirm: e.target.checked })
                          }
                          label={`Konfirmasi eksekusi ${cfg.title.toLowerCase()}.`}
                        />
                        {lv.message ? (
                          <Alert
                            variant={/gagal|ditolak|error/i.test(lv.message) ? "danger" : "info"}
                            className="small py-1 mb-2"
                          >
                            {lv.message}
                          </Alert>
                        ) : null}
                        {massScan ? (
                          <Alert variant="warning" className="small py-1 mb-2">
                            Pratinjau memeriksa semua {cfg.entityNoun} RPJMD yang belum termapping
                            pada konteks sumber terpilih.
                          </Alert>
                        ) : null}
                        {lv.previewData ? (
                          <div className="small">
                            <div className="d-flex flex-wrap gap-1 mb-1">
                              <Badge bg={readyCount > 0 ? "success" : "secondary"}>
                                Exact match (100%): {readyCount || 0}
                              </Badge>
                              <Badge
                                bg={ambiguousCount > 0 ? "warning" : "secondary"}
                                text={ambiguousCount > 0 ? "dark" : undefined}
                              >
                                Ambiguous: {ambiguousCount || 0}
                              </Badge>
                              <Badge bg={notFoundCount > 0 ? "danger" : "secondary"}>
                                Tidak ditemukan: {notFoundCount || 0}
                              </Badge>
                            </div>
                            <div>Total scan: {totalCount || 0}</div>
                            {!previewFresh && lv.lastPayload ? (
                              <div className="text-muted">
                                Parameter berubah. Jalankan preview ulang sebelum eksekusi.
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {lv.executeData ? (
                          <Table size="sm" bordered className="small mt-2 mb-0">
                            <tbody>
                              <tr>
                                <td>Dipetakan</td>
                                <td>{execSummary.mapped ?? 0}</td>
                              </tr>
                              <tr>
                                <td>Dilewati</td>
                                <td>
                                  {execSummary.already_mapped_count ??
                                    execSummary.noop_count ??
                                    execSummary.skipped ??
                                    0}
                                </td>
                              </tr>
                              <tr>
                                <td>Gagal</td>
                                <td>{execSummary.failed ?? 0}</td>
                              </tr>
                            </tbody>
                          </Table>
                        ) : null}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card.Body>
          </Card>

          {previewData ? (
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <Card.Title className="h6">Hasil preview</Card.Title>
                {previewData.correlation_id ? (
                  <p className="small text-muted">
                    correlation_id:{" "}
                    <code>{previewData.correlation_id}</code>
                  </p>
                ) : null}
                {previewBlocked ? (
                  <Alert variant="danger" className="small">
                    <strong>Commit belum dapat dilanjutkan.</strong> Pratinjau
                    menemukan konflik/validasi yang harus diselesaikan terlebih dahulu.
                  </Alert>
                ) : (
                  <Alert variant="success" className="small py-2">
                    Pratinjau aman. Commit dapat dilanjutkan setelah review akhir.
                  </Alert>
                )}
                <Table size="sm" bordered responsive>
                  <tbody>
                    <tr>
                      <td>program RKPD baru (rencana)</td>
                      <td>{summary?.would_create_programs ?? 0}</td>
                    </tr>
                    <tr>
                      <td>kegiatan RKPD baru (rencana)</td>
                      <td>{summary?.would_create_kegiatans ?? 0}</td>
                    </tr>
                    <tr>
                      <td>sub RKPD baru (rencana)</td>
                      <td>{summary?.would_create_sub_kegiatans ?? 0}</td>
                    </tr>
                    <tr>
                      <td>skipped</td>
                      <td>{summary?.skipped ?? 0}</td>
                    </tr>
                    <tr>
                      <td>failed / error baris</td>
                      <td>{summary?.failed ?? 0}</td>
                    </tr>
                    <tr>
                      <td>fatal_row_count</td>
                      <td>{summary?.fatal_row_count ?? 0}</td>
                    </tr>
                    <tr>
                      <td>error_row_count</td>
                      <td>{summary?.error_row_count ?? 0}</td>
                    </tr>
                    <tr>
                      <td>commit_blocked</td>
                      <td>{previewBlocked ? "ya" : "tidak"}</td>
                    </tr>
                  </tbody>
                </Table>

                {nonZeroCategories.length ? (
                  <>
                    <div className="small fw-bold mb-1">Ringkasan Klasifikasi</div>
                    <Table size="sm" bordered className="small">
                      <thead>
                        <tr>
                          <th>Kategori</th>
                          <th>Jumlah</th>
                          <th>Apa masalahnya?</th>
                          <th>Apa yang harus dilakukan?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nonZeroCategories.map(([category, count]) => {
                          const meta = syncCategoryMeta(category);
                          return (
                            <tr key={category}>
                              <td>{meta.label}</td>
                              <td>{count}</td>
                              <td>{meta.problem}</td>
                              <td>{meta.action}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </>
                ) : null}

                {conflictCategories.length ? (
                  <Card className="mb-2 border-warning bg-light">
                    <Card.Body className="py-2">
                      <div className="small fw-semibold">Apa yang harus saya lakukan?</div>
                      <ul className="small mb-2 ps-3">
                        {conflictCategories.slice(0, 5).map((row) => (
                          <li key={row.category}>
                            {row.label} ({row.count}): {row.action}
                          </li>
                        ))}
                      </ul>
                      <div className="d-flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleAutoMapPreview("program")}
                        >
                          Resolve Mapping Program
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleAutoMapPreview("kegiatan")}
                        >
                          Resolve Mapping Kegiatan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleAutoMapPreview("sub")}
                        >
                          Resolve Mapping Sub Kegiatan
                        </Button>
                        <Button size="sm" as={Link} to="/rpjmd/bulk-master-import" variant="outline-dark">
                          Buka Backfill
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => setAllowCreateParents(true)}
                        >
                          Periksa Parent Tujuan
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ) : null}

                {sample.length ? (
                  <>
                    <div className="small fw-bold mb-1">Sampel baris</div>
                    <Table size="sm" striped responsive className="small">
                      <thead>
                        <tr>
                          <th>entitas</th>
                          <th>id</th>
                          <th>status</th>
                          <th>kategori</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sample.map((r, i) => (
                          <tr key={i}>
                            <td>{r.entity_type}</td>
                            <td>{r.source_id}</td>
                            <td>{r.status}</td>
                            <td>{r.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                ) : null}

                <Form.Group className="mb-2">
                  <Form.Label className="small">
                    Alasan commit (opsional, audit)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={commitReason}
                    onChange={(e) => setCommitReason(e.target.value)}
                  />
                </Form.Group>
                <Button
                  variant="danger"
                  disabled={!previewOk || commitLoading}
                  onClick={handleCommit}
                >
                  {commitLoading ? (
                    <>
                      <Spinner size="sm" className="me-2" /> Commit…
                    </>
                  ) : (
                    "Commit sync"
                  )}
                </Button>
                <Form.Text className="d-block mt-2 text-muted">
                  Commit menjalankan preflight yang sama dengan preview. Payload
                  terakhir disimpan dari preview sukses.
                </Form.Text>
              </Card.Body>
            </Card>
          ) : null}
        </Col>
      </Row>
    </Container>
  );
}
