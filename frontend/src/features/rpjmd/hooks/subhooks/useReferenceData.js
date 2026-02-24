// Refactored: useReferenceData.js - lebih stabil & bersih
import { useEffect, useState, useMemo } from "react";
import api from "@/services/api";
import { useDokumen } from "@/hooks/useDokumen";

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

  const { dokumen } = useDokumen();
  const isReady = !!(tahun && rpjmd_id && jenis_dokumen);

  // 🔁 Misi, Tujuan, Sasaran, Arah, OPD
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

        console.log("🧪 Tahun:", tahun);
        console.log("🧪 Jenis dokumen:", jenis_dokumen);
        console.log("📥 Sasaran fetched:", sasaranRes.data);
        console.log("🎯 selectedSasaran:", selectedSasaran);
        console.log("🔡 prefix:", selectedSasaran?.nomor);

        if (cancelled) return;

        setMisis(Array.isArray(misiRes.data) ? misiRes.data : []);
        setTujuans(Array.isArray(tujuanRes.data) ? tujuanRes.data : []);
        const parsedSasaran = Array.isArray(sasaranRes.data?.data)
          ? sasaranRes.data.data
          : Array.isArray(sasaranRes.data)
          ? sasaranRes.data
          : [];
        setSasarans(parsedSasaran);
        setAras(Array.isArray(arahRes.data?.data) ? arahRes.data.data : []);
        setOpdEntries(Array.isArray(opdRes.data?.data) ? opdRes.data.data : []);
      } catch (err) {
        console.error("❌ Gagal fetch reference dasar:", err);
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, tahun, rpjmd_id, jenis_dokumen]);

  // 🧠 selectedSasaran distabilkan dengan useMemo
  const selectedSasaran = useMemo(() => {
    return sasarans.find((s) => String(s.id) === String(sasaran_id));
  }, [sasarans, sasaran_id]);

  // 🎯 Strategi dari kode sasaran
  useEffect(() => {
    // Reset strategi dan arah saat sasaran berubah
    setStrategis([]);
    setAras([]);

    if (!tahun || !jenis_dokumen || !sasaran_id || !selectedSasaran) return;

    const prefix = selectedSasaran.nomor?.trim();
    if (!prefix) return;

    let cancelled = false;

    (async () => {
      try {
        // Ambil strategi yang cocok dengan kode prefix dari sasaran
        const strategiRes = await api.get("/strategi/by-kode-prefix", {
          params: {
            tahun,
            jenis_dokumen,
            prefix: `S${prefix}`,
          },
        });

        const strategiData = Array.isArray(strategiRes.data?.data)
          ? strategiRes.data.data
          : strategiRes.data;

        const strategiIds = strategiData.map((s) => s.id);

        // Ambil semua arah kebijakan, lalu filter berdasarkan strategi_ids
        const arahRes = await api.get("/arah-kebijakan", {
          params: { tahun, jenis_dokumen, limit: 1000 },
        });

        const allArah = Array.isArray(arahRes.data?.data)
          ? arahRes.data.data
          : arahRes.data;

        const filteredArah = allArah
          .filter((a) => strategiIds.includes(a.strategi_id))
          .map((a) => ({
            ...a,
            strategi_id:
              a.strategi_id ?? a?.ProgramArahKebijakan?.strategi_id ?? null,
          }));

        if (!cancelled) {
          setStrategis(strategiData);
          setAras(filteredArah);
        }
      } catch (err) {
        console.error("❌ Gagal fetch strategi atau arah kebijakan:", err);
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

  // 🏢 Bidang berdasarkan OPD
  useEffect(() => {
    if (!opd_penanggung_jawab || opdEntries.length === 0) {
      setBidangOptions([]);
      return;
    }

    const selectedOpd = opdEntries.find(
      (e) => String(e.id) === String(opd_penanggung_jawab)
    );
    const targetNamaOpd = selectedOpd?.nama_opd;

    const matches = opdEntries.filter(
      (e) =>
        e.nama_opd &&
        targetNamaOpd &&
        e.nama_opd.trim().toLowerCase() === targetNamaOpd.trim().toLowerCase()
    );

    const bidangList = matches
      .flatMap((e) => {
        const raw = e.nama_bidang_opd;
        if (Array.isArray(raw)) return raw;
        if (typeof raw === "string") return raw.split(",").map((s) => s.trim());
        return [];
      })
      .filter(Boolean);

    const uniqueList = Array.from(new Set(bidangList));
    const opts = uniqueList.map((b) => ({ label: b, value: b }));
    setBidangOptions(opts);
  }, [opd_penanggung_jawab, opdEntries]);

  // 📦 Program untuk validasi duplikasi
  useEffect(() => {
    if (!tahun || !rpjmd_id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/programs", {
          params: { tahun, jenis_dokumen: "rpjmd", limit: 1000 },
        });
        if (!cancelled) {
          setAllPrograms(Array.isArray(res.data?.data) ? res.data.data : []);
        }
      } catch (err) {
        console.error("❌ Gagal fetch programs:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tahun, rpjmd_id]);

  const uniqueOpds = useMemo(() => {
    const set = new Set();
    opdEntries.forEach((entry) => {
      if (entry.nama_opd) set.add(entry.nama_opd);
    });
    return Array.from(set);
  }, [opdEntries]);

  return useMemo(
    () => ({
      misis,
      tujuans,
      sasarans,
      strategis,
      aras,
      opdEntries,
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
      bidangOptions,
      uniqueOpds,
      allPrograms,
      refsLoading,
    ]
  );
}
