import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import Dropdown from "../components/Dropdown";
import DropdownVisiMisi from "../components/DropdownVisiMisi";
import DropdownTujuan from "../components/DropdownTujuan";
import DropdownSasaran from "../components/DropdownSasaran";
import DropdownStrategi from "../components/DropdownStrategi";
import DropdownArahKebijakan from "../components/DropdownArahKebijakan";
import fetchWithLog from "../../../utils/fetchWithLog";
import { useDokumen } from "../../../hooks/useDokumen";

const RkpdFormPage = () => {
  const { tahun, dokumen: jenis_dokumen } = useDokumen();

  // Dropdown data
  const [periodeList, setPeriodeList] = useState([]);
  const [opdList, setOpdList] = useState([]);
  const [prioNasList, setPrioNasList] = useState([]);
  const [prioDaerahList, setPrioDaerahList] = useState([]);
  const [prioGubList, setPrioGubList] = useState([]);

  // Selected
  const [periodeId, setPeriodeId] = useState("");
  const [opdId, setOpdId] = useState("");
  const [prioNas, setPrioNas] = useState([]);
  const [prioDaerah, setPrioDaerah] = useState([]);
  const [prioGub, setPrioGub] = useState([]);

  // Visi → Sub-Kegiatan
  const [visiList, setVisiList] = useState([]);
  const [misiList, setMisiList] = useState([]);
  const [tujuanList, setTujuanList] = useState([]);
  const [sasaranList, setSasaranList] = useState([]);
  const [strategiList, setStrategiList] = useState([]);
  const [arahList, setArahList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [kegiatanList, setKegiatanList] = useState([]);
  const [subKegiatanList, setSubKegiatanList] = useState([]);

  const [visiId, setVisiId] = useState("");
  const [misiId, setMisiId] = useState("");
  const [tujuanId, setTujuanId] = useState("");
  const [sasaranId, setSasaranId] = useState("");
  const [strategiId, setStrategiId] = useState("");
  const [arahId, setArahId] = useState("");
  const [programId, setProgramId] = useState("");
  const [kegiatanId, setKegiatanId] = useState("");
  const [subKegiatanId, setSubKegiatanId] = useState("");

  const [indikatorTujuanList, setIndikatorTujuanList] = useState([]);
  const [indikatorSasaranList, setIndikatorSasaranList] = useState([]);
  const [indikatorProgramList, setIndikatorProgramList] = useState([]);
  const [indikatorKegiatanList, setIndikatorKegiatanList] = useState([]);

  const arahTerpilih = arahList.find((a) => a.id === arahId);

  const resetFormState = () => {
    setPeriodeId("");
    setOpdId("");
    setPrioNas([]);
    setPrioDaerah([]);
    setPrioGub([]);

    setVisiId("");
    setMisiId("");
    setTujuanId("");
    setSasaranId("");
    setStrategiId("");
    setArahId("");
    setProgramId("");
    setKegiatanId("");
    setSubKegiatanId("");

    setMisiList([]);
    setTujuanList([]);
    setSasaranList([]);
    setStrategiList([]);
    setArahList([]);
    setProgramList([]);
    setKegiatanList([]);
    setSubKegiatanList([]);

    setIndikatorTujuanList([]);
    setIndikatorSasaranList([]);
    setIndikatorProgramList([]);
    setIndikatorKegiatanList([]);
  };

  const fetchData = async (endpoint, params, setter) => {
    try {
      const res = await api.get(endpoint, { params });
      setter(res.data);
    } catch (err) {
      console.error("Error fetching", endpoint, err);
      setter([]);
    }
  };

  useEffect(() => {
    fetchWithLog("/periode-rpjmd", {}, setPeriodeList);
    fetchWithLog("/opd-penanggung-jawab", {}, setOpdList);
    fetchWithLog(
      "/prioritas-nasional",
      { tahun, jenis_dokumen },
      setPrioNasList
    );
    fetchWithLog(
      "/prioritas-daerah",
      { tahun, jenis_dokumen },
      setPrioDaerahList
    );
    fetchWithLog(
      "/prioritas-gubernur",
      { tahun, jenis_dokumen },
      setPrioGubList
    );
  }, [tahun, jenis_dokumen]);

  useEffect(() => {
    fetchWithLog("/visi", { tahun, jenis_dokumen }, setVisiList);
  }, [tahun]);

  useEffect(() => {
    resetBelow("misi");
    if (visiId)
      fetchWithLog(
        "/misi",
        { visi_id: visiId, tahun, jenis_dokumen },
        setMisiList
      );
  }, [visiId]);

  useEffect(() => {
    resetBelow("tujuan");
    if (misiId)
      fetchWithLog(
        "/tujuan",
        { misi_id: misiId, tahun, jenis_dokumen },
        setTujuanList
      );
  }, [misiId]);

  useEffect(() => {
    resetBelow("strategi");
    if (sasaranId) {
      fetchWithLog(
        "/strategi",
        { sasaran_id: sasaranId, tahun, jenis_dokumen },
        setStrategiList
      );
      fetchWithLog(
        "/programs",
        { sasaran_id: sasaranId, tahun, jenis_dokumen },
        setProgramList
      );
    }
  }, [sasaranId]);

  useEffect(() => {
    resetBelow("arah");
    if (strategiId)
      fetchWithLog(
        "/arah-kebijakan",
        { strategi_id: strategiId, tahun, jenis_dokumen },
        setArahList
      );
  }, [strategiId]);

  useEffect(() => {
    resetBelow("kegiatan");
    if (programId)
      fetchWithLog(
        "/kegiatan",
        { program_id: programId, tahun, jenis_dokumen },
        setKegiatanList
      );
  }, [programId]);

  useEffect(() => {
    resetBelow("subkegiatan");
    if (kegiatanId)
      fetchWithLog(
        "/sub-kegiatan",
        { kegiatan_id: kegiatanId, tahun, jenis_dokumen },
        setSubKegiatanList
      );
  }, [kegiatanId]);

  useEffect(() => {
    if (tujuanId) {
      fetchWithLog(
        "/indikator-tujuans",
        { tujuan_id: tujuanId, tahun, jenis_dokumen },
        setIndikatorTujuanList
      );
    } else {
      setIndikatorTujuanList([]);
    }
  }, [tujuanId, tahun]);

  useEffect(() => {
    if (sasaranId) {
      fetchWithLog(
        "/indikator-sasaran",
        { sasaran_id: sasaranId, tahun, jenis_dokumen },
        setIndikatorSasaranList
      );
    } else {
      setIndikatorSasaranList([]);
    }
  }, [sasaranId, tahun]);

  useEffect(() => {
    if (programId) {
      fetchWithLog(
        "/indikator-program",
        { program_id: programId, tahun, jenis_dokumen },
        setIndikatorProgramList
      );
    } else {
      setIndikatorProgramList([]);
    }
  }, [programId, tahun]);

  useEffect(() => {
    if (kegiatanId) {
      fetchWithLog(
        "/indikator-kegiatan",
        { program_id: programId, tahun, jenis_dokumen },
        setIndikatorKegiatanList
      );
    } else {
      setIndikatorKegiatanList([]);
    }
  }, [kegiatanId, programId, tahun]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi minimal yang dibutuhkan
    if (!tujuanId || !sasaranId || !strategiId) {
      return alert("Mohon lengkapi hingga minimal Sasaran & Strategi.");
    }

    if (!periodeId || !opdId) {
      return alert("Periode dan OPD wajib dipilih.");
    }

    try {
      const payload = {
        tahun,
        periode_id: periodeId,
        opd_id: opdId,
        prioritas_nasional: prioNas,
        prioritas_daerah: prioDaerah,
        prioritas_gubernur: prioGub,
        visi_id: visiId,
        misi_id: misiId,
        tujuan_id: tujuanId,
        sasaran_id: sasaranId,
        strategi_id: strategiId,
        arah_id: arahId,
        program_id: programId,
        kegiatan_id: kegiatanId,
        sub_kegiatan_id: subKegiatanId,
        indikator_tujuan: indikatorTujuanList,
        indikator_sasaran: indikatorSasaranList,
        indikator_program: indikatorProgramList,
        indikator_kegiatan: indikatorKegiatanList,
      };

      const res = await api.post("/rkpd", payload);
      alert("Data RKPD berhasil disimpan!");
      resetFormState();
    } catch (err) {
      console.error("Gagal menyimpan RKPD:", err);
      alert("Gagal menyimpan RKPD");
    }
  };

  // Definisi urutan level & state setter
  const levels = [
    { key: "misi", actions: [() => setMisiId(""), () => setMisiList([])] },
    {
      key: "tujuan",
      actions: [
        () => setTujuanId(""),
        () => setTujuanList([]),
        () => setIndikatorTujuanList([]),
      ],
    },
    {
      key: "sasaran",
      actions: [
        () => setSasaranId(""),
        () => setSasaranList([]),
        () => setIndikatorSasaranList([]),
      ],
    },
    {
      key: "strategi",
      actions: [() => setStrategiId(""), () => setStrategiList([])],
    },
    // Arah kebijakan TIDAK akan direset → cukup masukin di daftar biar urutannya terjaga
    {
      key: "arah",
      actions: [() => setArahId(""), () => setArahList([])],
      skip: true,
    },
    {
      key: "program",
      actions: [
        () => setProgramId(""),
        () => setProgramList([]),
        () => setIndikatorProgramList([]),
      ],
    },
    {
      key: "kegiatan",
      actions: [
        () => setKegiatanId(""),
        () => setKegiatanList([]),
        () => setIndikatorKegiatanList([]),
      ],
    },
    {
      key: "subkegiatan",
      actions: [() => setSubKegiatanId(""), () => setSubKegiatanList([])],
    },
  ];

  // Fungsi reset generik
  const resetBelow = (level) => {
    const startIndex = levels.findIndex((l) => l.key === level);
    if (startIndex === -1) return;

    for (let i = startIndex + 1; i < levels.length; i++) {
      // Jika level punya flag skip, jangan reset
      if (levels[i].skip) continue;
      levels[i].actions.forEach((action) => action());
    }
  };

  return (
    <form className="space-y-4">
      <div className="bg-gray-100 border rounded px-3 py-2 text-sm text-gray-700">
        <span className="font-semibold">Jenis Dokumen Aktif :</span>{" "}
        {jenis_dokumen?.toUpperCase()}
        <span className="mx-2">|</span>
        <span className="font-semibold">Tahun Aktif :</span> {tahun}
      </div>
      <Dropdown
        label="Periode RPJMD"
        options={periodeList.map((p) => ({
          id: p.id,
          label: `${p.nama} (${p.tahun_awal} - ${p.tahun_akhir})`,
        }))}
        value={periodeId}
        onChange={setPeriodeId}
      />
      <Dropdown
        label="OPD Penanggung Jawab"
        options={opdList.map((o) => ({ id: o.id, label: o.nama_opd }))}
        value={opdId}
        onChange={setOpdId}
      />
      <Dropdown
        label="Visi"
        options={visiList.map((v) => ({ id: v.id, label: v.isi_visi }))}
        value={visiId}
        onChange={setVisiId}
      />
      <Dropdown
        label="Misi"
        options={misiList.map((m) => ({
          id: m.id,
          label: `${m.no_misi} - ${m.isi_misi}`,
        }))}
        value={misiId}
        onChange={setMisiId}
      />
      <DropdownTujuan misiId={misiId} value={tujuanId} onChange={setTujuanId} />
      <DropdownSasaran
        tujuanId={tujuanId}
        value={sasaranId}
        onChange={setSasaranId}
        onOptionsChange={setSasaranList}
      />
      {sasaranList.length === 0 && tujuanId && (
        <div className="text-sm text-red-500 mt-1">
          Tidak ada data Sasaran untuk Tujuan ini.
        </div>
      )}
      <DropdownStrategi
        sasaranId={sasaranId}
        value={strategiId}
        onChange={setStrategiId}
        onOptionsChange={setStrategiList}
      />
      <DropdownArahKebijakan
        strategiId={strategiId}
        value={arahId}
        onChange={setArahId}
        onOptionsChange={setArahList}
      />

      {arahTerpilih?.deskripsi && (
        <p className="text-sm text-gray-500 mt-1">{arahTerpilih.deskripsi}</p>
      )}

      <Dropdown
        label="Program"
        options={programList.map((p) => ({ id: p.id, label: p.nama_program }))}
        value={programId}
        onChange={setProgramId}
      />
      <Dropdown
        label="Kegiatan"
        options={kegiatanList.map((k) => ({
          id: k.id,
          label: k.nama_kegiatan,
        }))}
        value={kegiatanId}
        onChange={setKegiatanId}
      />
      <Dropdown
        label="Sub‑Kegiatan"
        options={subKegiatanList.map((s) => ({
          id: s.id,
          label: s.nama_sub_kegiatan,
        }))}
        value={subKegiatanId}
        onChange={setSubKegiatanId}
      />
      <div>
        <label className="block font-medium">Prioritas Nasional</label>
        <select
          multiple
          value={prioNas}
          onChange={(e) =>
            setPrioNas(Array.from(e.target.selectedOptions, (opt) => opt.value))
          }
          className="form-multiselect"
        >
          {prioNasList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_prionas}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-medium">Prioritas Daerah</label>
        <select
          multiple
          value={prioDaerah}
          onChange={(e) =>
            setPrioDaerah(
              Array.from(e.target.selectedOptions, (opt) => opt.value)
            )
          }
          className="form-multiselect"
        >
          {prioDaerahList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_prioda}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-medium">Prioritas Gubernur</label>
        <select
          multiple
          value={prioGub}
          onChange={(e) =>
            setPrioGub(Array.from(e.target.selectedOptions, (opt) => opt.value))
          }
          className="form-multiselect"
        >
          {prioGubList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_priogub}
            </option>
          ))}
        </select>
      </div>
      {indikatorTujuanList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Tujuan</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorTujuanList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {indikatorSasaranList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Sasaran</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorSasaranList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {indikatorProgramList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Program</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorProgramList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {indikatorKegiatanList.length > 0 && (
        <div>
          <h3 className="font-bold mt-6">Indikator Kegiatan</h3>
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Indikator</th>
                <th className="border px-2 py-1">Satuan</th>
                <th className="border px-2 py-1">Target</th>
              </tr>
            </thead>
            <tbody>
              {indikatorKegiatanList.map((item) => (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.nama_indikator}</td>
                  <td className="border px-2 py-1">{item.satuan}</td>
                  <td className="border px-2 py-1">{item.target_kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="submit"
        onClick={handleSubmit}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Simpan RKPD
      </button>
    </form>
  );
};

export default RkpdFormPage;
