import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Table,
  Typography,
} from "antd";

import api from "@/services/api";
import { useDokumen } from "@/hooks/useDokumen";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";

const { Title, Text } = Typography;

function rowsOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (d?.success && Array.isArray(d.data)) return d.data;
  return [];
}

function firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function toIdNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function compactText(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function join2(a, b) {
  const aa = compactText(a);
  const bb = compactText(b);
  if (!aa && !bb) return "";
  if (!aa) return bb;
  if (!bb) return aa;
  return `${aa} - ${bb}`;
}

const LEVEL_ORDER = [
  "visiId",
  "misiId",
  "tujuanId",
  "sasaranId",
  "strategiId",
  "arahId",
  "programId",
  "kegiatanId",
  "subKegiatanId",
];

const EMPTY_SELECTION = {
  visiId: null,
  misiId: null,
  tujuanId: null,
  sasaranId: null,
  strategiId: null,
  arahId: null,
  programId: null,
  kegiatanId: null,
  subKegiatanId: null,
};

const TABLE_COLUMNS = [
  { title: "ID Renstra", dataIndex: "idRenstra", key: "idRenstra", width: 110 },
  { title: "Renstra", dataIndex: "renstra", key: "renstra", ellipsis: true },
  { title: "RPJMD ID", dataIndex: "rpjmdId", key: "rpjmdId", width: 110 },
  { title: "RPJMD", dataIndex: "rpjmd", key: "rpjmd", ellipsis: true },
];

function mapRenstraRow(levelKey, r) {
  switch (levelKey) {
    case "tujuan": {
      const rpjmdId = firstDefined(r?.rpjmd_tujuan_id, r?.tujuan_rpjmd_id);
      return {
        key: `tujuan-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.no_tujuan, r?.isi_tujuan),
        rpjmdId,
        rpjmd: join2(r?.no_rpjmd, r?.isi_tujuan_rpjmd),
      };
    }
    case "sasaran": {
      const rpjmdId = firstDefined(r?.rpjmd_sasaran_id, r?.sasaran_rpjmd_id);
      return {
        key: `sasaran-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.nomor, r?.isi_sasaran),
        rpjmdId,
        rpjmd: join2(r?.no_rpjmd, r?.isi_sasaran_rpjmd),
      };
    }
    case "strategi": {
      const rpjmdId = firstDefined(r?.rpjmd_strategi_id, r?.strategi_rpjmd_id);
      return {
        key: `strategi-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_strategi, r?.deskripsi),
        rpjmdId,
        rpjmd: join2(r?.no_rpjmd, r?.isi_strategi_rpjmd),
      };
    }
    case "arah": {
      const rpjmdId = firstDefined(r?.rpjmd_arah_id, r?.rpjmd_arah_kebijakan_id);
      return {
        key: `arah-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_kebjkn, r?.deskripsi),
        rpjmdId,
        rpjmd: join2(r?.no_arah_rpjmd, r?.isi_arah_rpjmd),
      };
    }
    case "program": {
      const rpjmdId = firstDefined(r?.rpjmd_program_id, r?.program_rpjmd_id);
      return {
        key: `program-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_program, r?.nama_program),
        rpjmdId,
        rpjmd: join2(r?.kode_program, r?.nama_program),
      };
    }
    case "kegiatan": {
      const rpjmdId = firstDefined(r?.rpjmd_kegiatan_id, r?.kegiatan_rpjmd_id);
      return {
        key: `kegiatan-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_kegiatan, r?.nama_kegiatan),
        rpjmdId,
        rpjmd: join2(r?.kode_kegiatan_rpjmd, r?.nama_kegiatan_rpjmd),
      };
    }
    case "subKegiatan": {
      const rpjmdId = firstDefined(r?.subkegiatan_id, r?.sub_kegiatan_id, r?.sub_kegiatan?.id);
      return {
        key: `subkegiatan-${r?.id}`,
        idRenstra: r?.id,
        renstra: join2(r?.kode_sub_kegiatan, r?.nama_sub_kegiatan),
        rpjmdId,
        rpjmd: join2(r?.kode_sub_kegiatan_rpjmd, r?.nama_sub_kegiatan_rpjmd),
      };
    }
    default:
      return {
        key: `row-${r?.id}`,
        idRenstra: r?.id,
        renstra: String(r?.id ?? ""),
        rpjmdId: null,
        rpjmd: "",
      };
  }
}

function filterByRenstraIdIfPossible(rows, renstraId) {
  if (!renstraId) return rows;
  const hasRenstraId = rows.some((r) => r?.renstra_id != null);
  if (hasRenstraId) {
    return rows.filter((r) => Number(r.renstra_id) === Number(renstraId));
  }
  const hasRenstraNested = rows.some((r) => r?.renstra?.id != null);
  if (hasRenstraNested) {
    return rows.filter((r) => Number(r.renstra?.id) === Number(renstraId));
  }
  return rows;
}

function MatchSection({
  title,
  selectedId,
  selectedLabel,
  levelKey,
  matchedRows,
  allRows,
  onUseRpjmdId,
  using,
  onApplyToDb,
  applying,
}) {
  const matchData = useMemo(() => {
    const rows = matchedRows.map((r) => mapRenstraRow(levelKey, r));
    if (!selectedId) return rows;
    const label = selectedLabel || String(selectedId);
    return rows.map((row) => ({ ...row, rpjmdId: selectedId, rpjmd: label }));
  }, [matchedRows, levelKey, selectedId, selectedLabel]);
  const allData = useMemo(() => allRows.map((r) => mapRenstraRow(levelKey, r)), [allRows, levelKey]);

  const columns = useMemo(() => {
    if (!onUseRpjmdId) return TABLE_COLUMNS;
    return [
      ...TABLE_COLUMNS,
      {
        title: "Aksi",
        key: "aksi",
        width: 360,
        render: (_, row) => {
          const id = toIdNumber(row?.rpjmdId);
          const renstraRowId = toIdNumber(row?.idRenstra);
          const targetId = toIdNumber(selectedId);
          const isTargetSame = targetId && id && Number(id) === Number(targetId);
          const isLoading =
            !!using?.loading &&
            using?.levelKey === levelKey &&
            Number(using?.rpjmdId) === Number(id);

          const isApplying =
            !!applying?.loading &&
            applying?.levelKey === levelKey &&
            Number(applying?.renstraRecordId) === Number(renstraRowId);

          return (
            <Space size="small" wrap>
              <Button
                size="small"
                type="primary"
                ghost
                disabled={!id}
                loading={isLoading}
                onClick={() => onUseRpjmdId(levelKey, id)}
                title={id ? "Pakai RPJMD ID pada record Renstra ini" : "Record ini belum punya RPJMD ID"}
              >
                Pakai RPJMD ID ini
              </Button>
              <Button
                size="small"
                type="primary"
                danger={!isTargetSame}
                disabled={!onApplyToDb || !targetId || !renstraRowId || isTargetSame}
                loading={isApplying}
                onClick={() => onApplyToDb(levelKey, row, targetId, selectedLabel)}
                title={
                  !targetId
                    ? "Pilih RPJMD di sisi kiri terlebih dahulu"
                    : isTargetSame
                      ? "Sudah cocok (tidak perlu diterapkan)"
                      : "Terapkan mapping ke database untuk record Renstra ini"
                }
              >
                Terapkan ke DB
              </Button>
            </Space>
          );
        },
      },
    ];
  }, [
    onUseRpjmdId,
    onApplyToDb,
    applying?.loading,
    applying?.levelKey,
    applying?.renstraRecordId,
    using?.loading,
    using?.levelKey,
    using?.rpjmdId,
    levelKey,
    selectedId,
    selectedLabel,
  ]);

  const header = (
    <Space wrap>
      <Text strong>{title}</Text>
      {selectedId ? (
        <Tag color={matchData.length ? "green" : "red"}>{`match=${matchData.length}`}</Tag>
      ) : (
        <Tag>belum dipilih</Tag>
      )}
      {selectedId ? <Tag>{selectedLabel ? selectedLabel : `RPJMD_ID=${selectedId}`}</Tag> : null}
    </Space>
  );

  return (
    <Card title={header} size="small" style={{ marginBottom: 12 }}>
      {!selectedId ? (
        <Text type="secondary">Pilih level RPJMD terlebih dahulu untuk melihat hasil uji.</Text>
      ) : matchData.length ? (
        <Table
          size="small"
          columns={columns}
          dataSource={matchData}
          pagination={{ pageSize: 5 }}
          scroll={{ x: true }}
        />
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            message="Tidak ada record Renstra yang menunjuk ke item RPJMD ini"
            description="Artinya: mapping Renstra untuk level ini belum terbentuk atau mengarah ke ID RPJMD yang berbeda. Lihat daftar data Renstra di bawah untuk melihat nilai ID yang sedang dipakai."
            style={{ marginBottom: 12 }}
          />
          <Table
            size="small"
            columns={columns}
            dataSource={allData}
            pagination={{ pageSize: 5 }}
            scroll={{ x: true }}
          />
        </>
      )}
    </Card>
  );
}

export default function RenstraRpjmdLinkTesterPage() {
  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();
  const { periode_id } = usePeriodeAktif();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();

  const [sel, setSel] = useState(EMPTY_SELECTION);
  const [usingRpjmd, setUsingRpjmd] = useState({
    loading: false,
    levelKey: null,
    rpjmdId: null,
    error: "",
  });
  const [applying, setApplying] = useState({
    loading: false,
    levelKey: null,
    renstraRecordId: null,
  });
  const [applyModal, setApplyModal] = useState({
    open: false,
    levelKey: null,
    renstraRow: null,
    targetId: null,
    targetLabel: "",
  });
  const [applyReason, setApplyReason] = useState("");

  const setLevel = useCallback((key, value) => {
    setSel((prev) => {
      const next = { ...prev, [key]: toIdNumber(value) };
      const idx = LEVEL_ORDER.indexOf(key);
      if (idx >= 0) {
        for (let i = idx + 1; i < LEVEL_ORDER.length; i += 1) {
          next[LEVEL_ORDER[i]] = null;
        }
      }
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setSel(EMPTY_SELECTION);
    setUsingRpjmd({ loading: false, levelKey: null, rpjmdId: null, error: "" });
    setApplying({ loading: false, levelKey: null, renstraRecordId: null });
    setApplyModal({ open: false, levelKey: null, renstraRow: null, targetId: null, targetLabel: "" });
    setApplyReason("");
  }, []);

  const {
    data: renstraAktif,
    isLoading: loadingRenstraAktif,
    isError: isErrorRenstraAktif,
    error: errorRenstraAktif,
  } = useQuery({
    queryKey: ["renstra-opd-aktif"],
    queryFn: async () => {
      try {
        const res = await api.get("/renstra-opd/aktif");
        const d = res.data?.data ?? res.data;
        if (Array.isArray(d)) return d.find((x) => x?.is_aktif) ?? d[0] ?? null;
        return d ?? null;
      } catch {
        const res = await api.get("/renstra-opd");
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        return list.find((x) => x?.is_aktif) ?? null;
      }
    },
    retry: 1,
  });

  const rpjmdTahun = useMemo(() => {
    const y = firstDefined(renstraAktif?.tahun_mulai, tahun);
    const n = Number(y);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [renstraAktif?.tahun_mulai, tahun]);

  const baseRpjmdParams = useMemo(() => {
    const params = { jenis_dokumen: "rpjmd" };
    if (rpjmdTahun) params.tahun = rpjmdTahun;
    return params;
  }, [rpjmdTahun]);

  const applySelectionFromRenstraRow = useCallback(
    async (levelKey, rawId) => {
      const targetId = toIdNumber(rawId);
      if (!targetId) return;

      const empty = { ...EMPTY_SELECTION };

      const unwrapSingle = (res) => {
        const d = res?.data?.data ?? res?.data;
        if (Array.isArray(d)) return d[0] ?? null;
        return d ?? null;
      };

      const getById = async (path, id) => {
        if (!id) return null;
        const res = await api.get(`${path}/${encodeURIComponent(String(id))}`, { params: baseRpjmdParams });
        return unwrapSingle(res);
      };

      const resolveTujuanChain = async (tujuanId) => {
        const tujuan = await getById("/tujuan", tujuanId);
        const misiId = toIdNumber(firstDefined(tujuan?.misi_id, tujuan?.misiId, tujuan?.misi?.id, tujuan?.Misi?.id));
        const misi = misiId ? await getById("/misi", misiId) : null;
        const visiId = toIdNumber(firstDefined(misi?.visi_id, misi?.visiId, misi?.visi?.id, misi?.Visi?.id));
        return { visiId, misiId, tujuanId: toIdNumber(tujuanId) };
      };

      const resolveSasaranChain = async (sasaranId) => {
        const sasaran = await getById("/sasaran", sasaranId);
        const tujuanId = toIdNumber(firstDefined(sasaran?.tujuan_id, sasaran?.tujuanId, sasaran?.tujuan?.id, sasaran?.Tujuan?.id));
        const chain = tujuanId ? await resolveTujuanChain(tujuanId) : {};
        return { ...chain, sasaranId: toIdNumber(sasaranId) };
      };

      const resolveStrategiChain = async (strategiId) => {
        const strategi = await getById("/strategi", strategiId);
        const sasaranId = toIdNumber(firstDefined(strategi?.sasaran_id, strategi?.sasaranId, strategi?.sasaran?.id, strategi?.Sasaran?.id));
        const chain = sasaranId ? await resolveSasaranChain(sasaranId) : {};
        return { ...chain, sasaranId, strategiId: toIdNumber(strategiId) };
      };

      const resolveArahChain = async (arahId) => {
        const arah = await getById("/arah-kebijakan", arahId);
        const strategiId = toIdNumber(firstDefined(arah?.strategi_id, arah?.strategiId, arah?.strategi?.id, arah?.Strategi?.id));
        const chain = strategiId ? await resolveStrategiChain(strategiId) : {};
        return { ...chain, strategiId, arahId: toIdNumber(arahId) };
      };

      const resolveProgramChain = async (programId) => {
        const program = await getById("/programs", programId);
        const sasaranId = toIdNumber(firstDefined(program?.sasaran_id, program?.sasaranId, program?.sasaran?.id, program?.Sasaran?.id));
        const chain = sasaranId ? await resolveSasaranChain(sasaranId) : {};
        return { ...chain, sasaranId, programId: toIdNumber(programId) };
      };

      const resolveKegiatanChain = async (kegiatanId) => {
        const kegiatan = await getById("/kegiatan", kegiatanId);
        const programId = toIdNumber(firstDefined(kegiatan?.program_id, kegiatan?.programId, kegiatan?.program?.id, kegiatan?.Program?.id));
        const chain = programId ? await resolveProgramChain(programId) : {};
        return { ...chain, programId, kegiatanId: toIdNumber(kegiatanId) };
      };

      const resolveSubKegiatanChain = async (subKegiatanId) => {
        const sub = await getById("/sub-kegiatan", subKegiatanId);
        const kegiatanId = toIdNumber(firstDefined(sub?.kegiatan_id, sub?.kegiatanId, sub?.kegiatan?.id, sub?.Kegiatan?.id));
        const chain = kegiatanId ? await resolveKegiatanChain(kegiatanId) : {};
        return { ...chain, kegiatanId, subKegiatanId: toIdNumber(subKegiatanId) };
      };

      setUsingRpjmd({ loading: true, levelKey, rpjmdId: targetId, error: "" });

      try {
        let next = { ...empty };
        if (levelKey === "tujuan") {
          next = { ...empty, ...(await resolveTujuanChain(targetId)) };
        } else if (levelKey === "sasaran") {
          next = { ...empty, ...(await resolveSasaranChain(targetId)) };
        } else if (levelKey === "strategi") {
          next = { ...empty, ...(await resolveStrategiChain(targetId)) };
        } else if (levelKey === "arah") {
          // cabang strategi
          next = { ...empty, ...(await resolveArahChain(targetId)) };
        } else if (levelKey === "program") {
          // cabang program; strategi/arah tetap null agar tidak misleading
          next = { ...empty, ...(await resolveProgramChain(targetId)) };
        } else if (levelKey === "kegiatan") {
          next = { ...empty, ...(await resolveKegiatanChain(targetId)) };
        } else if (levelKey === "subKegiatan") {
          next = { ...empty, ...(await resolveSubKegiatanChain(targetId)) };
        } else {
          next = { ...empty };
        }

        setSel(next);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || String(e);
        setUsingRpjmd({ loading: false, levelKey, rpjmdId: targetId, error: msg });
        return;
      }

      setUsingRpjmd({ loading: false, levelKey, rpjmdId: targetId, error: "" });
    },
    [baseRpjmdParams],
  );

  const openApplyToDb = useCallback((levelKey, row, targetId, targetLabel) => {
    setApplyReason("");
    setApplyModal({
      open: true,
      levelKey,
      renstraRow: row,
      targetId: toIdNumber(targetId),
      targetLabel: targetLabel || "",
    });
  }, []);

  const closeApplyModal = useCallback(() => {
    setApplyModal({ open: false, levelKey: null, renstraRow: null, targetId: null, targetLabel: "" });
    setApplyReason("");
  }, []);

  const submitApplyToDb = useCallback(async () => {
    const levelKey = applyModal.levelKey;
    const targetId = toIdNumber(applyModal.targetId);
    const renstraRecordId = toIdNumber(applyModal.renstraRow?.idRenstra);
    const renstraId = toIdNumber(renstraAktif?.id);

    if (!levelKey || !targetId || !renstraRecordId || !renstraId) return;

    const reason = String(applyReason || "").trim();
    if (!reason) {
      message.error("Alasan perubahan wajib diisi.");
      return;
    }

    setApplying({ loading: true, levelKey, renstraRecordId });

    try {
      await api.post("/renstra-rpjmd-mapping/apply", {
        level: levelKey,
        renstra_id: renstraId,
        renstra_record_id: renstraRecordId,
        target_rpjmd_id: targetId,
        context: {
          jenis_dokumen: "rpjmd",
          tahun: rpjmdTahun ?? undefined,
          periode_id: periode_id ?? undefined,
          misi_id: sel.misiId ?? undefined,
          tujuan_id: sel.tujuanId ?? undefined,
          sasaran_id: sel.sasaranId ?? undefined,
          strategi_id: sel.strategiId ?? undefined,
          program_id: sel.programId ?? undefined,
          kegiatan_id: sel.kegiatanId ?? undefined,
        },
        change_reason_text: reason,
      });

      message.success("Berhasil menerapkan mapping ke database.");
      closeApplyModal();
      await queryClient.invalidateQueries({ queryKey: ["renstra-link-tester-rows", renstraId] });
    } catch (e) {
      const resp = e?.response?.data || {};
      const code = resp?.code;
      const details = resp?.details || null;
      const msg = resp?.message || e?.message || "Gagal menerapkan mapping ke database.";

      // Jika ada mismatch/parent-mapping-required, tawarkan untuk menerapkan parent terlebih dahulu.
      const parentLevel = details?.required_parent_level || details?.parent_level || null;
      const parentRenstraRecordId = toIdNumber(details?.required_renstra_record_id || details?.renstra_parent_id);
      const suggestedTargetParentId = toIdNumber(details?.suggested_target_rpjmd_id || details?.target_parent_rpjmd_id);

      if (
        (code === "PARENT_MAPPING_REQUIRED" || code === "CHAIN_MISMATCH") &&
        parentLevel &&
        parentRenstraRecordId &&
        suggestedTargetParentId
      ) {
        modal.confirm({
          title: "Perlu mapping parent terlebih dahulu",
          content: (
            <div>
              <div style={{ marginBottom: 8 }}>{msg}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Saran: terapkan mapping level <b>{parentLevel}</b> (Renstra ID {parentRenstraRecordId}) ke RPJMD ID{" "}
                {suggestedTargetParentId} terlebih dahulu, lalu ulangi apply level <b>{String(levelKey)}</b>.
              </div>
            </div>
          ),
          okText: `Terapkan ${parentLevel} dulu`,
          cancelText: "Tutup",
          onOk: async () => {
            try {
              closeApplyModal();
              setApplyReason(reason);
              await applySelectionFromRenstraRow(parentLevel, suggestedTargetParentId);
              setApplyModal({
                open: true,
                levelKey: parentLevel,
                renstraRow: { idRenstra: parentRenstraRecordId, renstra: "" },
                targetId: suggestedTargetParentId,
                targetLabel: "",
              });
            } catch {
              // fallback: jika gagal resolve chain, tetap buka modal apply parent
              closeApplyModal();
              setApplyReason(reason);
              setApplyModal({
                open: true,
                levelKey: parentLevel,
                renstraRow: { idRenstra: parentRenstraRecordId, renstra: "" },
                targetId: suggestedTargetParentId,
                targetLabel: "",
              });
            }
          },
        });
      } else {
        message.error(msg);
      }
    } finally {
      setApplying({ loading: false, levelKey: null, renstraRecordId: null });
    }
  }, [
    applyModal.levelKey,
    applyModal.targetId,
    applyModal.renstraRow,
    renstraAktif?.id,
    applyReason,
    rpjmdTahun,
    periode_id,
    sel,
    closeApplyModal,
    queryClient,
    message,
    modal,
    applySelectionFromRenstraRow,
  ]);

  const { data: visiList = [], isLoading: loadingVisi } = useQuery({
    queryKey: ["rpjmd-visi", baseRpjmdParams.jenis_dokumen, baseRpjmdParams.tahun],
    queryFn: async () => rowsOf(await api.get("/visi", { params: baseRpjmdParams })),
    enabled: !!baseRpjmdParams.tahun,
    retry: 1,
  });

  const { data: misiListRaw = [], isLoading: loadingMisiRaw } = useQuery({
    queryKey: ["rpjmd-misi", baseRpjmdParams.jenis_dokumen, baseRpjmdParams.tahun],
    queryFn: async () => rowsOf(await api.get("/misi", { params: baseRpjmdParams })),
    enabled: !!baseRpjmdParams.tahun,
    retry: 1,
  });

  const misiList = useMemo(() => {
    if (!sel.visiId) return misiListRaw;
    return misiListRaw.filter((m) => Number(m?.visi_id) === Number(sel.visiId));
  }, [misiListRaw, sel.visiId]);

  const { data: tujuanList = [], isLoading: loadingTujuan } = useQuery({
    queryKey: ["rpjmd-tujuan", baseRpjmdParams.tahun, sel.misiId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, limit: 1000, offset: 0 };
      if (sel.misiId) params.misi_id = String(sel.misiId);
      return rowsOf(await api.get("/tujuan", { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.misiId,
    retry: 1,
  });

  const { data: sasaranList = [], isLoading: loadingSasaran } = useQuery({
    queryKey: ["rpjmd-sasaran-by-tujuan", baseRpjmdParams.tahun, sel.tujuanId, periode_id],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, limit: 1000, offset: 0 };
      const pid = Number(periode_id);
      if (Number.isFinite(pid) && pid > 0) params.periode_id = pid;
      return rowsOf(
        await api.get(`/sasaran/by-tujuan/${encodeURIComponent(String(sel.tujuanId))}`, { params }),
      );
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.tujuanId,
    retry: 1,
  });

  const { data: strategiList = [], isLoading: loadingStrategi } = useQuery({
    queryKey: ["rpjmd-strategi", baseRpjmdParams.tahun, sel.sasaranId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.sasaranId) params.sasaran_id = String(sel.sasaranId);
      return rowsOf(await api.get("/strategi", { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.sasaranId,
    retry: 1,
  });

  const { data: arahList = [], isLoading: loadingArah } = useQuery({
    queryKey: ["rpjmd-arah-kebijakan", baseRpjmdParams.tahun, sel.strategiId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.strategiId) params.strategi_id = String(sel.strategiId);
      return rowsOf(await api.get("/arah-kebijakan", { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.strategiId,
    retry: 1,
  });

  const { data: programList = [], isLoading: loadingProgram } = useQuery({
    queryKey: ["rpjmd-program", baseRpjmdParams.tahun, sel.sasaranId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.sasaranId) params.sasaran_id = String(sel.sasaranId);
      return rowsOf(await api.get("/programs", { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.sasaranId,
    retry: 1,
  });

  const { data: kegiatanList = [], isLoading: loadingKegiatan } = useQuery({
    queryKey: ["rpjmd-kegiatan", baseRpjmdParams.tahun, sel.programId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.programId) params.program_id = String(sel.programId);
      return rowsOf(await api.get("/kegiatan", { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.programId,
    retry: 1,
  });

  const { data: subKegiatanList = [], isLoading: loadingSubKegiatan } = useQuery({
    queryKey: ["rpjmd-sub-kegiatan", baseRpjmdParams.tahun, sel.kegiatanId],
    queryFn: async () => {
      const params = { ...baseRpjmdParams, page: 1, limit: 1000 };
      if (sel.kegiatanId) params.kegiatan_id = String(sel.kegiatanId);
      return rowsOf(await api.get("/sub-kegiatan", { params }));
    },
    enabled: !!baseRpjmdParams.tahun && !!sel.kegiatanId,
    retry: 1,
  });

  const {
    data: renstraRows,
    isLoading: loadingRenstraRows,
    isError: isErrorRenstraRows,
    error: errorRenstraRows,
  } = useQuery({
    queryKey: ["renstra-link-tester-rows", renstraAktif?.id],
    queryFn: async () => {
      const renstraId = renstraAktif?.id;
      const qp = renstraId ? { renstra_id: renstraId } : {};

      const safeGet = async (path, params) => {
        try {
          const res = await api.get(path, { params });
          return rowsOf(res);
        } catch {
          const res = await api.get(path);
          return rowsOf(res);
        }
      };

      const [
        tujuanRenstraRaw,
        sasaranRenstraRaw,
        strategiRenstraRaw,
        kebijakanRenstraRaw,
        programRenstraRaw,
        kegiatanRenstraRaw,
        subKegiatanRenstraRaw,
      ] = await Promise.all([
        safeGet("/renstra-tujuan", qp),
        safeGet("/renstra-sasaran", qp),
        safeGet("/renstra-strategi", qp),
        safeGet("/renstra-kebijakan", qp),
        safeGet("/renstra-program", qp),
        safeGet("/renstra-kegiatan", qp),
        safeGet("/renstra-subkegiatan", qp),
      ]);

      return {
        tujuanRenstra: filterByRenstraIdIfPossible(tujuanRenstraRaw, renstraId),
        sasaranRenstra: filterByRenstraIdIfPossible(sasaranRenstraRaw, renstraId),
        strategiRenstra: filterByRenstraIdIfPossible(strategiRenstraRaw, renstraId),
        kebijakanRenstra: filterByRenstraIdIfPossible(kebijakanRenstraRaw, renstraId),
        programRenstra: filterByRenstraIdIfPossible(programRenstraRaw, renstraId),
        kegiatanRenstra: filterByRenstraIdIfPossible(kegiatanRenstraRaw, renstraId),
        subKegiatanRenstra: filterByRenstraIdIfPossible(subKegiatanRenstraRaw, renstraId),
      };
    },
    enabled: !!renstraAktif?.id,
    retry: 1,
  });

  const matches = useMemo(() => {
    const empty = {
      tujuan: [],
      sasaran: [],
      strategi: [],
      arah: [],
      program: [],
      kegiatan: [],
      subKegiatan: [],
    };
    if (!renstraRows) return empty;

    return {
      tujuan: sel.tujuanId
        ? (renstraRows.tujuanRenstra || []).filter(
            (r) => Number(firstDefined(r?.rpjmd_tujuan_id, r?.tujuan_rpjmd_id)) === Number(sel.tujuanId),
          )
        : [],
      sasaran: sel.sasaranId
        ? (renstraRows.sasaranRenstra || []).filter(
            (r) => Number(firstDefined(r?.rpjmd_sasaran_id, r?.sasaran_rpjmd_id)) === Number(sel.sasaranId),
          )
        : [],
      strategi: sel.strategiId
        ? (renstraRows.strategiRenstra || []).filter(
            (r) => Number(firstDefined(r?.rpjmd_strategi_id, r?.strategi_rpjmd_id)) === Number(sel.strategiId),
          )
        : [],
      arah: sel.arahId
        ? (renstraRows.kebijakanRenstra || []).filter(
            (r) => Number(firstDefined(r?.rpjmd_arah_id, r?.rpjmd_arah_kebijakan_id)) === Number(sel.arahId),
          )
        : [],
      program: sel.programId
        ? (renstraRows.programRenstra || []).filter(
            (r) => Number(firstDefined(r?.rpjmd_program_id, r?.program_rpjmd_id)) === Number(sel.programId),
          )
        : [],
      kegiatan: sel.kegiatanId
        ? (renstraRows.kegiatanRenstra || []).filter(
            (r) => Number(firstDefined(r?.rpjmd_kegiatan_id, r?.kegiatan_rpjmd_id)) === Number(sel.kegiatanId),
          )
        : [],
      subKegiatan: sel.subKegiatanId
        ? (renstraRows.subKegiatanRenstra || []).filter((r) => {
            const id = firstDefined(r?.subkegiatan_id, r?.sub_kegiatan_id, r?.sub_kegiatan?.id);
            return Number(id) === Number(sel.subKegiatanId);
          })
        : [],
    };
  }, [renstraRows, sel]);


  const selectedLabels = useMemo(() => {
    const findLabel = (list, id, toLabel) => {
      if (!id) return "";
      const row = (list || []).find((x) => Number(x?.id) === Number(id));
      return row ? toLabel(row) : "";
    };

    return {
      tujuan: findLabel(tujuanList, sel.tujuanId, (t) => join2(t.no_tujuan, t.isi_tujuan)),
      sasaran: findLabel(sasaranList, sel.sasaranId, (s) => join2(s.nomor ?? s.kode_sasaran, s.isi_sasaran ?? s.nama_sasaran)),
      strategi: findLabel(strategiList, sel.strategiId, (s) => join2(s.kode_strategi, s.deskripsi)),
      arah: findLabel(arahList, sel.arahId, (a) => join2(a.kode_arah, a.deskripsi ?? a.nama_arah)),
      program: findLabel(programList, sel.programId, (p) => join2(p.kode_program, p.nama_program)),
      kegiatan: findLabel(kegiatanList, sel.kegiatanId, (k) => join2(k.kode_kegiatan, k.nama_kegiatan)),
      subKegiatan: findLabel(subKegiatanList, sel.subKegiatanId, (sk) => join2(sk.kode_sub_kegiatan, sk.nama_sub_kegiatan)),
    };
  }, [
    tujuanList,
    sasaranList,
    strategiList,
    arahList,
    programList,
    kegiatanList,
    subKegiatanList,
    sel.tujuanId,
    sel.sasaranId,
    sel.strategiId,
    sel.arahId,
    sel.programId,
    sel.kegiatanId,
    sel.subKegiatanId,
  ]);
  const anyLoading =
    loadingRenstraAktif ||
    loadingRenstraRows ||
    loadingVisi ||
    loadingMisiRaw ||
    loadingTujuan ||
    loadingSasaran ||
    loadingStrategi ||
    loadingArah ||
    loadingProgram ||
    loadingKegiatan ||
    loadingSubKegiatan;

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => navigate("/dashboard-renstra")}>Kembali ke Dashboard Renstra</Button>
        <Button onClick={resetAll}>Reset Pilihan</Button>
        <Button type="link" onClick={() => window.open("/api/audit/cascading-gap", "_blank")}>
          Buka audit `/api/audit/cascading-gap`
        </Button>
      </Space>

      <Title level={3} style={{ marginTop: 0 }}>
        Form Uji Keterhubungan Renstra - RPJMD (Cascading)
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <div>
              <Text strong>Konteks Dokumen Aktif:</Text> <Tag>{dokumen || "-"}</Tag>
            </div>
            <div>
              <Text strong>Tahun Konteks:</Text> <Tag>{tahun ?? "-"}</Tag>
            </div>
            <div>
              <Text strong>Tahun RPJMD master:</Text>{" "}
              <Tag color={rpjmdTahun ? "blue" : "default"}>{rpjmdTahun ?? "-"}</Tag>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div>
              <Text strong>Renstra OPD Aktif:</Text>{" "}
              {loadingRenstraAktif ? (
                <Spin size="small" />
              ) : renstraAktif ? (
                <Tag color="green">
                  {renstraAktif.nama_opd || "OPD"} ({renstraAktif.tahun_mulai} - {renstraAktif.tahun_akhir})
                </Tag>
              ) : (
                <Tag color="red">Tidak ada Renstra aktif</Tag>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {isErrorRenstraAktif && (
        <Alert
          type="error"
          showIcon
          message="Gagal memuat Renstra OPD aktif"
          description={errorRenstraAktif?.message || "Terjadi kesalahan."}
          style={{ marginBottom: 16 }}
        />
      )}

      {!renstraAktif && !loadingRenstraAktif && (
        <Alert
          type="warning"
          showIcon
          message="Tidak ada Renstra OPD yang aktif"
          description="Aktifkan Renstra OPD terlebih dahulu, lalu buka halaman ini lagi."
          style={{ marginBottom: 16 }}
        />
      )}

      {isErrorRenstraRows && (
        <Alert
          type="error"
          showIcon
          message="Gagal memuat data Renstra (untuk uji keterhubungan)"
          description={errorRenstraRows?.message || "Terjadi kesalahan."}
          style={{ marginBottom: 16 }}
        />
      )}

      {anyLoading && (
        <div style={{ marginBottom: 16 }}>
          <Spin /> <Text type="secondary">Memuat opsi cascading...</Text>
        </div>
      )}

      {!!usingRpjmd.error && (
        <Alert
          type="error"
          showIcon
          message="Gagal menerapkan RPJMD ID dari record Renstra"
          description={usingRpjmd.error}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="1) Pilih jalur RPJMD" bordered>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div>
                <Text strong>Visi RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.visiId ?? undefined}
                  onChange={(v) => setLevel("visiId", v)}
                  placeholder="Pilih Visi"
                  options={visiList.map((v) => ({
                    value: toIdNumber(v.id),
                    label: String(v.isi_visi || v.nama_visi || v.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!visiList.length}
                />
              </div>

              <div>
                <Text strong>Misi RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.misiId ?? undefined}
                  onChange={(v) => setLevel("misiId", v)}
                  placeholder="Pilih Misi"
                  options={misiList.map((m) => ({
                    value: toIdNumber(m.id),
                    label: join2(m.no_misi, m.isi_misi) || String(m.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.visiId}
                />
              </div>

              <Divider style={{ margin: "8px 0" }} />

              <div>
                <Text strong>Tujuan RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.tujuanId ?? undefined}
                  onChange={(v) => setLevel("tujuanId", v)}
                  placeholder="Pilih Tujuan"
                  options={tujuanList.map((t) => ({
                    value: toIdNumber(t.id),
                    label: join2(t.no_tujuan, t.isi_tujuan) || String(t.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.misiId}
                />
              </div>

              <div>
                <Text strong>Sasaran RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.sasaranId ?? undefined}
                  onChange={(v) => setLevel("sasaranId", v)}
                  placeholder="Pilih Sasaran"
                  options={sasaranList.map((s) => ({
                    value: toIdNumber(s.id),
                    label: join2(s.nomor ?? s.kode_sasaran, s.isi_sasaran ?? s.nama_sasaran) || String(s.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.tujuanId}
                />
              </div>

              <div>
                <Text strong>Strategi RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.strategiId ?? undefined}
                  onChange={(v) => setLevel("strategiId", v)}
                  placeholder="Pilih Strategi"
                  options={strategiList.map((s) => ({
                    value: toIdNumber(s.id),
                    label: join2(s.kode_strategi, s.deskripsi) || String(s.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.sasaranId}
                />
              </div>

              <div>
                <Text strong>Arah Kebijakan RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.arahId ?? undefined}
                  onChange={(v) => setLevel("arahId", v)}
                  placeholder="Pilih Arah Kebijakan"
                  options={arahList.map((a) => ({
                    value: toIdNumber(a.id),
                    label: join2(a.kode_arah, a.deskripsi ?? a.nama_arah) || String(a.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.strategiId}
                />
              </div>

              <Divider style={{ margin: "8px 0" }} />

              <div>
                <Text strong>Program RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.programId ?? undefined}
                  onChange={(v) => setLevel("programId", v)}
                  placeholder="Pilih Program"
                  options={programList.map((p) => ({
                    value: toIdNumber(p.id),
                    label: join2(p.kode_program, p.nama_program) || String(p.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.sasaranId}
                />
              </div>

              <div>
                <Text strong>Kegiatan RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.kegiatanId ?? undefined}
                  onChange={(v) => setLevel("kegiatanId", v)}
                  placeholder="Pilih Kegiatan"
                  options={kegiatanList.map((k) => ({
                    value: toIdNumber(k.id),
                    label: join2(k.kode_kegiatan, k.nama_kegiatan) || String(k.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.programId}
                />
              </div>

              <div>
                <Text strong>Sub Kegiatan RPJMD</Text>
                <Select
                  style={{ width: "100%" }}
                  value={sel.subKegiatanId ?? undefined}
                  onChange={(v) => setLevel("subKegiatanId", v)}
                  placeholder="Pilih Sub Kegiatan"
                  options={subKegiatanList.map((sk) => ({
                    value: toIdNumber(sk.id),
                    label: join2(sk.kode_sub_kegiatan, sk.nama_sub_kegiatan) || String(sk.id),
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={!sel.kegiatanId}
                />
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="2) Hasil uji: daftar record Renstra yang match (atau daftar Renstra jika match=0)"
            bordered
          >
            <Text type="secondary">
              Catatan: match dihitung terhadap Renstra OPD yang sedang aktif. Jika match=0, biasanya berarti mapping belum terbentuk atau mengarah ke ID RPJMD yang lain.
            </Text>
            <Divider />

            <MatchSection
              title="Tujuan Renstra -> Tujuan RPJMD"
              selectedId={sel.tujuanId}
              selectedLabel={selectedLabels.tujuan}
              levelKey="tujuan"
              matchedRows={matches.tujuan}
              allRows={renstraRows?.tujuanRenstra || []}
              onUseRpjmdId={applySelectionFromRenstraRow}
              using={usingRpjmd}
              onApplyToDb={openApplyToDb}
              applying={applying}
            />

            <MatchSection
              title="Sasaran Renstra -> Sasaran RPJMD"
              selectedId={sel.sasaranId}
              selectedLabel={selectedLabels.sasaran}
              levelKey="sasaran"
              matchedRows={matches.sasaran}
              allRows={renstraRows?.sasaranRenstra || []}
              onUseRpjmdId={applySelectionFromRenstraRow}
              using={usingRpjmd}
              onApplyToDb={openApplyToDb}
              applying={applying}
            />

            <MatchSection
              title="Strategi Renstra -> Strategi RPJMD"
              selectedId={sel.strategiId}
              selectedLabel={selectedLabels.strategi}
              levelKey="strategi"
              matchedRows={matches.strategi}
              allRows={renstraRows?.strategiRenstra || []}
              onUseRpjmdId={applySelectionFromRenstraRow}
              using={usingRpjmd}
              onApplyToDb={openApplyToDb}
              applying={applying}
            />

            <MatchSection
              title="Kebijakan Renstra -> Arah Kebijakan RPJMD"
              selectedId={sel.arahId}
              selectedLabel={selectedLabels.arah}
              levelKey="arah"
              matchedRows={matches.arah}
              allRows={renstraRows?.kebijakanRenstra || []}
              onUseRpjmdId={applySelectionFromRenstraRow}
              using={usingRpjmd}
              onApplyToDb={openApplyToDb}
              applying={applying}
            />

            <MatchSection
              title="Program Renstra -> Program RPJMD"
              selectedId={sel.programId}
              selectedLabel={selectedLabels.program}
              levelKey="program"
              matchedRows={matches.program}
              allRows={renstraRows?.programRenstra || []}
              onUseRpjmdId={applySelectionFromRenstraRow}
              using={usingRpjmd}
              onApplyToDb={openApplyToDb}
              applying={applying}
            />

            <MatchSection
              title="Kegiatan Renstra -> Kegiatan RPJMD"
              selectedId={sel.kegiatanId}
              selectedLabel={selectedLabels.kegiatan}
              levelKey="kegiatan"
              matchedRows={matches.kegiatan}
              allRows={renstraRows?.kegiatanRenstra || []}
              onUseRpjmdId={applySelectionFromRenstraRow}
              using={usingRpjmd}
              onApplyToDb={openApplyToDb}
              applying={applying}
            />

            <MatchSection
              title="Sub Kegiatan Renstra -> Sub Kegiatan RPJMD"
              selectedId={sel.subKegiatanId}
              selectedLabel={selectedLabels.subKegiatan}
              levelKey="subKegiatan"
              matchedRows={matches.subKegiatan}
              allRows={renstraRows?.subKegiatanRenstra || []}
              onUseRpjmdId={applySelectionFromRenstraRow}
              using={usingRpjmd}
              onApplyToDb={openApplyToDb}
              applying={applying}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        open={applyModal.open}
        title="Konfirmasi: Terapkan mapping ke database"
        okText="Terapkan"
        cancelText="Batal"
        onCancel={closeApplyModal}
        onOk={submitApplyToDb}
        okButtonProps={{
          disabled: !String(applyReason || "").trim(),
          loading: !!applying.loading,
        }}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          <Text>
            Level: <Text strong>{String(applyModal.levelKey || "-")}</Text>
          </Text>
          <Text>
            Record Renstra: <Text strong>{String(applyModal.renstraRow?.idRenstra ?? "-")}</Text>{" "}
            {applyModal.renstraRow?.renstra ? (
              <Text type="secondary">({applyModal.renstraRow.renstra})</Text>
            ) : null}
          </Text>
          <Text>
            Target RPJMD ID: <Text strong>{String(applyModal.targetId ?? "-")}</Text>{" "}
            {applyModal.targetLabel ? (
              <Text type="secondary">({applyModal.targetLabel})</Text>
            ) : null}
          </Text>

          <Divider style={{ margin: "8px 0" }} />

          <Text strong>Alasan perubahan (wajib)</Text>
          <Input.TextArea
            value={applyReason}
            onChange={(e) => setApplyReason(e.target.value)}
            placeholder="Contoh: perbaikan mapping agar chain Renstra sesuai RPJMD"
            rows={3}
          />
          <Text type="secondary">
            Catatan: backend akan menolak jika chain parent-child tidak cocok (mis. Sasaran bukan anak dari Tujuan pada Renstra).
          </Text>
        </Space>
      </Modal>
    </div>
  );
}


