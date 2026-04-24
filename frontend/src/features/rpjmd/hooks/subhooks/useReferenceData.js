import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { normalizeListItems } from "@/utils/apiResponse";

/** Normalisasi nama OPD/bidang untuk perbandingan (bukan untuk tampilan). */
export function normalizeOpdNameKey(name) {
  if (typeof name !== "string") return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function representativeIdForGroup(rows) {
  if (!rows?.length) return null;
  const emptyOrSameAsOpd = rows.filter((r) => {
    const b = (r.nama_bidang_opd ?? "").toString().trim();
    if (!b) return true;
    return normalizeOpdNameKey(b) === normalizeOpdNameKey(r.nama_opd);
  });
  const pool = emptyOrSameAsOpd.length ? emptyOrSameAsOpd : rows;
  return pool.reduce((best, r) => (Number(r.id) < Number(best.id) ? r : best))
    .id;
}

/** Satu opsi per nama OPD (master memiliki banyak baris per bidang). */
export function buildOpdSelectOptions(opdEntries) {
  const byKey = new Map();
  for (const row of opdEntries || []) {
    const key = normalizeOpdNameKey(row.nama_opd);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  const options = [];
  for (const rows of byKey.values()) {
    const id = representativeIdForGroup(rows);
    const label = (rows[0].nama_opd ?? "").trim() || rows[0].nama_opd;
    options.push({ value: String(id), label });
  }
  options.sort((a, b) => a.label.localeCompare(b.label, "id"));
  return options;
}

/** Map ID baris manapun ke ID perwakilan grup OPD yang sama (untuk mode edit). */
export function resolveStoredOpdToRepresentativeId(opdEntries, rawId) {
  if (rawId === null || rawId === undefined || rawId === "") return null;
  const row = (opdEntries || []).find((r) => String(r.id) === String(rawId));
  if (!row?.nama_opd) return null;
  const key = normalizeOpdNameKey(row.nama_opd);
  const group = (opdEntries || []).filter(
    (r) => normalizeOpdNameKey(r.nama_opd) === key,
  );
  return String(representativeIdForGroup(group));
}

export default function useReferenceData(params = {}) {
  const { rpjmd_id, tahun, opd_penanggung_jawab, sasaran_id, jenis_dokumen } =
    params;

  const [misis, setMisis] = useState([]);
  const [tujuans, setTujuans] = useState([]);
  const [sasarans, setSasarans] = useState([]);
  const [strategis, setStrategis] = useState([]);
  const [aras, setAras] = useState([]);
  const [opdEntries, setOpdEntries] = useState([]);
  const [bidangOptions, setBidangOptions] = useState([]);
  const [allPrograms, setAllPrograms] = useState([]);
  const [refsLoading, setRefsLoading] = useState(true);

  const isReady = !!(tahun && rpjmd_id && jenis_dokumen);

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;
    setRefsLoading(true);

    (async () => {
      try {
        const [misiRes, tujuanRes, sasaranRes, arahRes, opdRes] =
          await Promise.all([
            api.get("/misi", { params: { tahun, jenis_dokumen } }),
            api.get("/tujuan", { params: { tahun, jenis_dokumen } }),
            api.get("/sasaran", { params: { tahun, jenis_dokumen } }),
            api.get("/arah-kebijakan", {
              params: { tahun, jenis_dokumen, limit: 1000 },
            }),
            api.get("/opd-penanggung-jawab", {
              params: { limit: 1000, rpjmd_id },
            }),
          ]);

        if (cancelled) return;

        setMisis(normalizeListItems(misiRes.data));
        setTujuans(normalizeListItems(tujuanRes.data));
        setSasarans(normalizeListItems(sasaranRes.data));
        setAras(normalizeListItems(arahRes.data));
        setOpdEntries(normalizeListItems(opdRes.data));
      } catch (err) {
        console.error("Gagal fetch reference dasar:", err);
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, tahun, rpjmd_id, jenis_dokumen]);

  const selectedSasaran = useMemo(
    () => sasarans.find((item) => String(item.id) === String(sasaran_id)),
    [sasarans, sasaran_id],
  );

  useEffect(() => {
    setStrategis([]);
    setAras([]);

    if (!tahun || !jenis_dokumen || !sasaran_id || !selectedSasaran?.nomor) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const strategiRes = await api.get("/strategi/by-kode-prefix", {
          params: {
            tahun,
            jenis_dokumen,
            prefix: `S${selectedSasaran.nomor.trim()}`,
          },
        });

        const strategiData = normalizeListItems(strategiRes.data);
        const strategiIds = strategiData.map((item) => Number(item.id));

        const arahRes = await api.get("/arah-kebijakan", {
          params: { tahun, jenis_dokumen, limit: 1000 },
        });

        const filteredArah = normalizeListItems(arahRes.data)
          .filter((item) => strategiIds.includes(Number(item.strategi_id)))
          .map((item) => ({
            ...item,
            strategi_id:
              item.strategi_id ??
              item?.ProgramArahKebijakan?.strategi_id ??
              null,
          }));

        if (!cancelled) {
          setStrategis(strategiData);
          setAras(filteredArah);
        }
      } catch (err) {
        console.error("Gagal fetch strategi atau arah kebijakan:", err);
        if (!cancelled) {
          setStrategis([]);
          setAras([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tahun, jenis_dokumen, sasaran_id, selectedSasaran]);

  useEffect(() => {
    if (!opd_penanggung_jawab || opdEntries.length === 0) {
      setBidangOptions([]);
      return;
    }

    const selectedOpd = opdEntries.find(
      (item) => String(item.id) === String(opd_penanggung_jawab),
    );
    const targetNamaOpd = selectedOpd?.nama_opd;

    const bidangList = opdEntries
      .filter(
        (item) =>
          item.nama_opd &&
          targetNamaOpd &&
          item.nama_opd.trim().toLowerCase() ===
            targetNamaOpd.trim().toLowerCase(),
      )
      .flatMap((item) => {
        const raw = item.nama_bidang_opd;
        if (Array.isArray(raw)) return raw;
        if (typeof raw === "string") return raw.split(",").map((v) => v.trim());
        return [];
      })
      .filter(Boolean)
      .filter((bidang) => {
        const opdKey = normalizeOpdNameKey(targetNamaOpd);
        const bKey = normalizeOpdNameKey(bidang);
        return bKey && bKey !== opdKey;
      });

    setBidangOptions(
      Array.from(new Set(bidangList)).map((bidang) => ({
        label: bidang,
        value: bidang,
      })),
    );
  }, [opd_penanggung_jawab, opdEntries]);

  useEffect(() => {
    if (!tahun || !rpjmd_id) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/programs", {
          params: { tahun, jenis_dokumen: "rpjmd", limit: 1000 },
        });

        if (!cancelled) {
          setAllPrograms(normalizeListItems(res.data));
        }
      } catch (err) {
        console.error("Gagal fetch programs:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tahun, rpjmd_id]);

  const uniqueOpds = useMemo(() => {
    const values = new Set();
    opdEntries.forEach((entry) => {
      if (entry.nama_opd) values.add(entry.nama_opd);
    });
    return Array.from(values);
  }, [opdEntries]);

  const opdSelectOptions = useMemo(
    () => buildOpdSelectOptions(opdEntries),
    [opdEntries],
  );

  return useMemo(
    () => ({
      misis,
      tujuans,
      sasarans,
      strategis,
      aras,
      opdEntries,
      opdSelectOptions,
      bidangOptions,
      uniqueOpds,
      allPrograms,
      setAllPrograms,
      refsLoading,
    }),
    [
      misis,
      tujuans,
      sasarans,
      strategis,
      aras,
      opdEntries,
      opdSelectOptions,
      bidangOptions,
      uniqueOpds,
      allPrograms,
      refsLoading,
    ],
  );
}
