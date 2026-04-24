import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Select, Spin, Alert, Space, Typography } from "antd";
import axios from "axios";
import IndikatorPanel from "./IndikatorPanel";
import {
  fetchMasterPrograms,
  fetchMasterKegiatanByProgram,
  fetchMasterSubKegiatanByKegiatan,
  fetchMasterIndikatorBySubKegiatan,
  formatMasterProgramLabel,
  formatMasterKegiatanLabel,
  formatMasterSubKegiatanLabel,
  snapshotProgramLabel,
  snapshotKegiatanLabel,
  snapshotSubKegiatanLabel,
  getMasterApiErrorMessage,
  invalidateMasterCache,
} from "../../services/masterService";

const { Text } = Typography;

const CASCADE_DEBOUNCE_MS = 300;

const emptyIds = () => ({
  masterProgramId: "",
  masterKegiatanId: "",
  masterSubKegiatanId: "",
});

const searchFilterOption = (input, option) => {
  const q = String(input || "").toLowerCase().trim();
  if (!q) return true;
  const label = String(option?.label ?? "").toLowerCase();
  const kode = String(option?.kode ?? "").toLowerCase();
  const nama = String(option?.nama ?? "").toLowerCase();
  return label.includes(q) || kode.includes(q) || nama.includes(q);
};

/**
 * Dropdown bertingkat master + snapshot label untuk audit.
 *
 * @param {object} [props.frozenLabels] — label tersimpan (transaksi lama) jika baris tidak ada lagi di master
 */
export default function MasterCascadeSelect({
  datasetKey,
  value,
  onChange,
  disabled = false,
  className = "",
  frozenLabels,
}) {
  const isControlled = value !== undefined;
  const [ids, setIds] = useState(emptyIds);

  const [programs, setPrograms] = useState([]);
  const [kegiatans, setKegiatans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [indikators, setIndikators] = useState([]);

  const [loadP, setLoadP] = useState(false);
  const [loadK, setLoadK] = useState(false);
  const [loadS, setLoadS] = useState(false);
  const [loadI, setLoadI] = useState(false);

  const [errP, setErrP] = useState(null);
  const [errK, setErrK] = useState(null);
  const [errS, setErrS] = useState(null);
  const [errI, setErrI] = useState(null);

  const [warnP, setWarnP] = useState(null);
  const [warnK, setWarnK] = useState(null);
  const [warnS, setWarnS] = useState(null);
  const [warnI, setWarnI] = useState(null);

  const abortRef = useRef({ k: null, s: null, i: null });

  const prevDatasetKeyRef = useRef(undefined);
  useEffect(() => {
    if (
      prevDatasetKeyRef.current !== undefined &&
      prevDatasetKeyRef.current !== datasetKey
    ) {
      invalidateMasterCache();
    }
    prevDatasetKeyRef.current = datasetKey;
  }, [datasetKey]);

  const effectiveIds = useMemo(() => {
    if (isControlled) {
      return {
        masterProgramId: value?.masterProgramId ?? "",
        masterKegiatanId: value?.masterKegiatanId ?? "",
        masterSubKegiatanId: value?.masterSubKegiatanId ?? "",
      };
    }
    return ids;
  }, [
    isControlled,
    value?.masterProgramId,
    value?.masterKegiatanId,
    value?.masterSubKegiatanId,
    ids,
  ]);

  const emitChange = useCallback(
    (nextIds, lists) => {
      const p = lists.programs;
      const k = lists.kegiatans;
      const s = lists.subs;
      const ind = lists.indikators;
      const program =
        p?.find((r) => String(r.id) === String(nextIds.masterProgramId)) ||
        null;
      const kegiatan =
        k?.find((r) => String(r.id) === String(nextIds.masterKegiatanId)) ||
        null;
      const subKegiatan =
        s?.find((r) => String(r.id) === String(nextIds.masterSubKegiatanId)) ||
        null;

      const programLabel = program
        ? snapshotProgramLabel(program)
        : nextIds.masterProgramId && frozenLabels?.programLabel
          ? frozenLabels.programLabel
          : "";
      const kegiatanLabel = kegiatan
        ? snapshotKegiatanLabel(kegiatan)
        : nextIds.masterKegiatanId && frozenLabels?.kegiatanLabel
          ? frozenLabels.kegiatanLabel
          : "";
      const subKegiatanLabel = subKegiatan
        ? snapshotSubKegiatanLabel(subKegiatan)
        : nextIds.masterSubKegiatanId && frozenLabels?.subKegiatanLabel
          ? frozenLabels.subKegiatanLabel
          : "";

      onChange?.({
        ...nextIds,
        program,
        kegiatan,
        subKegiatan,
        indikators: ind ?? [],
        programLabel,
        kegiatanLabel,
        subKegiatanLabel,
      });
    },
    [onChange, frozenLabels],
  );

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setErrP(null);
      setWarnP(null);
      setLoadP(true);
      try {
        const { data, warning } = await fetchMasterPrograms(datasetKey, {
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setPrograms(data);
        setWarnP(warning || null);
      } catch (e) {
        if (axios.isCancel(e)) return;
        setPrograms([]);
        setErrP(getMasterApiErrorMessage(e));
      } finally {
        if (!ac.signal.aborted) setLoadP(false);
      }
    })();
    return () => ac.abort();
  }, [datasetKey]);

  useEffect(() => {
    abortRef.current.k?.abort();
    const ac = new AbortController();
    abortRef.current.k = ac;

    const pid = effectiveIds.masterProgramId;
    if (!pid) {
      setKegiatans([]);
      setErrK(null);
      setWarnK(null);
      setLoadK(false);
      return;
    }

    let cancelled = false;
    setErrK(null);
    setWarnK(null);
    setLoadK(true);

    const timer = setTimeout(async () => {
      try {
        const { data, warning } = await fetchMasterKegiatanByProgram(pid, {
          datasetKey,
          signal: ac.signal,
        });
        if (cancelled || ac.signal.aborted) return;
        setKegiatans(data);
        setWarnK(warning || null);
      } catch (e) {
        if (axios.isCancel(e) || cancelled) return;
        setKegiatans([]);
        setErrK(getMasterApiErrorMessage(e));
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoadK(false);
      }
    }, CASCADE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ac.abort();
    };
  }, [effectiveIds.masterProgramId, datasetKey]);

  useEffect(() => {
    abortRef.current.s?.abort();
    const ac = new AbortController();
    abortRef.current.s = ac;

    const kid = effectiveIds.masterKegiatanId;
    if (!kid) {
      setSubs([]);
      setErrS(null);
      setWarnS(null);
      setLoadS(false);
      return;
    }

    let cancelled = false;
    setErrS(null);
    setWarnS(null);
    setLoadS(true);

    const timer = setTimeout(async () => {
      try {
        const { data, warning } = await fetchMasterSubKegiatanByKegiatan(kid, {
          datasetKey,
          signal: ac.signal,
        });
        if (cancelled || ac.signal.aborted) return;
        setSubs(data);
        setWarnS(warning || null);
      } catch (e) {
        if (axios.isCancel(e) || cancelled) return;
        setSubs([]);
        setErrS(getMasterApiErrorMessage(e));
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoadS(false);
      }
    }, CASCADE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ac.abort();
    };
  }, [effectiveIds.masterKegiatanId, datasetKey]);

  useEffect(() => {
    abortRef.current.i?.abort();
    const ac = new AbortController();
    abortRef.current.i = ac;

    const sid = effectiveIds.masterSubKegiatanId;
    if (!sid) {
      setIndikators([]);
      setErrI(null);
      setWarnI(null);
      setLoadI(false);
      return;
    }

    setErrI(null);
    setWarnI(null);
    setLoadI(true);
    (async () => {
      try {
        const { data, warning } = await fetchMasterIndikatorBySubKegiatan(sid, {
          datasetKey,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setIndikators(data);
        setWarnI(warning || null);
      } catch (e) {
        if (axios.isCancel(e)) return;
        setIndikators([]);
        setErrI(getMasterApiErrorMessage(e));
      } finally {
        if (!ac.signal.aborted) setLoadI(false);
      }
    })();

    return () => ac.abort();
  }, [effectiveIds.masterSubKegiatanId, datasetKey]);

  useEffect(() => {
    emitChange(effectiveIds, { programs, kegiatans, subs, indikators });
  }, [
    effectiveIds.masterProgramId,
    effectiveIds.masterKegiatanId,
    effectiveIds.masterSubKegiatanId,
    programs,
    kegiatans,
    subs,
    indikators,
    emitChange,
  ]);

  const onProgram = (v) => {
    const next = {
      masterProgramId: v || "",
      masterKegiatanId: "",
      masterSubKegiatanId: "",
    };
    setIndikators([]);
    setErrI(null);
    setWarnI(null);
    if (isControlled) {
      onChange?.({
        ...next,
        program: null,
        kegiatan: null,
        subKegiatan: null,
        indikators: [],
        programLabel: "",
        kegiatanLabel: "",
        subKegiatanLabel: "",
      });
    } else {
      setIds(next);
    }
  };

  const onKegiatan = (v) => {
    const base = effectiveIds;
    const next = {
      ...base,
      masterKegiatanId: v || "",
      masterSubKegiatanId: "",
    };
    setIndikators([]);
    setErrI(null);
    setWarnI(null);
    if (isControlled) {
      const program =
        programs.find((r) => String(r.id) === String(next.masterProgramId)) ||
        null;
      onChange?.({
        ...next,
        program,
        kegiatan: null,
        subKegiatan: null,
        indikators: [],
        programLabel: program ? snapshotProgramLabel(program) : "",
        kegiatanLabel: "",
        subKegiatanLabel: "",
      });
    } else {
      setIds(next);
    }
  };

  const onSub = (v) => {
    const base = effectiveIds;
    const next = {
      ...base,
      masterSubKegiatanId: v || "",
    };
    if (isControlled) {
      const program =
        programs.find((r) => String(r.id) === String(next.masterProgramId)) ||
        null;
      const kegiatan =
        kegiatans.find((r) => String(r.id) === String(next.masterKegiatanId)) ||
        null;
      onChange?.({
        ...next,
        program,
        kegiatan,
        subKegiatan: null,
        indikators: [],
        programLabel: program ? snapshotProgramLabel(program) : "",
        kegiatanLabel: kegiatan ? snapshotKegiatanLabel(kegiatan) : "",
        subKegiatanLabel: "",
      });
    } else {
      setIds(next);
    }
  };

  const programDisabled = disabled || loadP;
  const kegiatanDisabled =
    disabled || !effectiveIds.masterProgramId || loadK || !!errK;
  const subDisabled =
    disabled || !effectiveIds.masterKegiatanId || loadS || !!errS;

  const programOptions = useMemo(() => {
    const rows = programs.map((r) => ({
      value: String(r.id),
      label: formatMasterProgramLabel(r),
      kode: r.kode_program_full || "",
      nama: r.nama_program || "",
    }));
    const pid = effectiveIds.masterProgramId;
    if (
      pid &&
      !rows.some((o) => o.value === String(pid)) &&
      frozenLabels?.programLabel
    ) {
      return [
        {
          value: String(pid),
          label: `${frozenLabels.programLabel} (snapshot)`,
          kode: "",
          nama: frozenLabels.programLabel,
        },
        ...rows,
      ];
    }
    return rows;
  }, [programs, effectiveIds.masterProgramId, frozenLabels?.programLabel]);

  const kegiatanOptions = useMemo(() => {
    const rows = kegiatans.map((r) => ({
      value: String(r.id),
      label: formatMasterKegiatanLabel(r),
      kode: r.kode_kegiatan_full || "",
      nama: r.nama_kegiatan || "",
    }));
    const kid = effectiveIds.masterKegiatanId;
    if (
      kid &&
      !rows.some((o) => o.value === String(kid)) &&
      frozenLabels?.kegiatanLabel
    ) {
      return [
        {
          value: String(kid),
          label: `${frozenLabels.kegiatanLabel} (snapshot)`,
          kode: "",
          nama: frozenLabels.kegiatanLabel,
        },
        ...rows,
      ];
    }
    return rows;
  }, [kegiatans, effectiveIds.masterKegiatanId, frozenLabels?.kegiatanLabel]);

  const subOptions = useMemo(() => {
    const rows = subs.map((r) => ({
      value: String(r.id),
      label: formatMasterSubKegiatanLabel(r),
      kode: r.kode_sub_kegiatan_full || "",
      nama: r.nama_sub_kegiatan || "",
    }));
    const sid = effectiveIds.masterSubKegiatanId;
    if (
      sid &&
      !rows.some((o) => o.value === String(sid)) &&
      frozenLabels?.subKegiatanLabel
    ) {
      return [
        {
          value: String(sid),
          label: `${frozenLabels.subKegiatanLabel} (snapshot)`,
          kode: "",
          nama: frozenLabels.subKegiatanLabel,
        },
        ...rows,
      ];
    }
    return rows;
  }, [subs, effectiveIds.masterSubKegiatanId, frozenLabels?.subKegiatanLabel]);

  const softWarnings = [warnP, warnK, warnS, warnI].filter(Boolean);

  return (
    <div className={className}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {errP ? (
          <Alert type="error" showIcon message="Gagal memuat program master" description={errP} />
        ) : null}

        {softWarnings.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message="Referensi master tidak ditemukan (mode aman)"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {softWarnings.map((w) => (
                  <li key={w.code + w.field + w.message}>
                    {w.message}{" "}
                    <Text type="secondary" code>
                      {w.code}
                    </Text>
                  </li>
                ))}
              </ul>
            }
          />
        ) : null}

        <div>
          <Text strong className="mb-1 block text-sm">
            Program
          </Text>
          <Select
            showSearch
            filterOption={searchFilterOption}
            optionFilterProp="label"
            allowClear
            placeholder={
              loadP
                ? "Memuat program…"
                : programs.length === 0
                  ? "Tidak ada program master"
                  : "Pilih program"
            }
            style={{ width: "100%" }}
            disabled={programDisabled}
            loading={loadP}
            value={effectiveIds.masterProgramId || undefined}
            onChange={onProgram}
            options={programOptions}
            notFoundContent={loadP ? <Spin size="small" /> : "Tidak ada data"}
          />
        </div>

        <div>
          <Text strong className="mb-1 block text-sm">
            Kegiatan
          </Text>
          <Select
            showSearch
            filterOption={searchFilterOption}
            optionFilterProp="label"
            allowClear
            placeholder={
              !effectiveIds.masterProgramId
                ? "Pilih program terlebih dahulu"
                : loadK
                  ? "Memuat kegiatan…"
                  : kegiatans.length === 0
                    ? "Tidak ada kegiatan"
                    : "Pilih kegiatan"
            }
            style={{ width: "100%" }}
            disabled={kegiatanDisabled}
            loading={loadK}
            value={effectiveIds.masterKegiatanId || undefined}
            onChange={onKegiatan}
            options={kegiatanOptions}
            notFoundContent={loadK ? <Spin size="small" /> : "Tidak ada data"}
          />
          {errK ? (
            <Alert className="mt-2" type="error" showIcon message={errK} />
          ) : null}
        </div>

        <div>
          <Text strong className="mb-1 block text-sm">
            Sub kegiatan
          </Text>
          <Select
            showSearch
            filterOption={searchFilterOption}
            optionFilterProp="label"
            allowClear
            placeholder={
              !effectiveIds.masterKegiatanId
                ? "Pilih kegiatan terlebih dahulu"
                : loadS
                  ? "Memuat sub kegiatan…"
                  : subs.length === 0
                    ? "Tidak ada sub kegiatan"
                    : "Pilih sub kegiatan"
            }
            style={{ width: "100%" }}
            disabled={subDisabled}
            loading={loadS}
            value={effectiveIds.masterSubKegiatanId || undefined}
            onChange={onSub}
            options={subOptions}
            notFoundContent={loadS ? <Spin size="small" /> : "Tidak ada data"}
          />
          {errS ? (
            <Alert className="mt-2" type="error" showIcon message={errS} />
          ) : null}
        </div>

        <IndikatorPanel
          loading={loadI}
          error={errI}
          indikators={indikators}
          emptyText={
            effectiveIds.masterSubKegiatanId
              ? "Tidak ada indikator untuk sub kegiatan ini."
              : "Pilih sub kegiatan untuk memuat indikator."
          }
        />
      </Space>
    </div>
  );
}
