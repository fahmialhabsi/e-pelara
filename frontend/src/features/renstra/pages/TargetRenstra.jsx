import React, { useEffect, useState } from "react";
import api from "../../../services/api";

export default function TargetRenstra() {
  const [years, setYears] = useState([]); // Tahun otomatis dari backend
  const [form, setForm] = useState({
    indikator_id: "",
    lokasi: "",
    capaian_program: "",
    capaian_kegiatan: "",
    capaian_subkegiatan: "",
    satuan_program: "",
    pagu_program: "",
    satuan_kegiatan: "",
    pagu_kegiatan: "",
    satuan_subkegiatan: "",
    pagu_subkegiatan: "",
    target_program: [],
    target_kegiatan: [],
    target_subkegiatan: [],
  });

  const [options, setOptions] = useState({
    tujuan: [],
    sasaran: [],
    program: [],
    kegiatan: [],
    subkegiatan: [],
  });

  const [selected, setSelected] = useState({
    tujuan: "",
    sasaran: "",
    program: "",
    kegiatan: "",
    subkegiatan: "",
  });

  const [loading, setLoading] = useState({
    tujuan: false,
    sasaran: false,
    program: false,
    kegiatan: false,
    subkegiatan: false,
    submit: false,
  });

  // Reset target arrays sesuai jumlah tahun
  const resetTargets = (yearList = years) => {
    setForm((f) => ({
      ...f,
      target_program: yearList.map(() => ""),
      target_kegiatan: yearList.map(() => ""),
      target_subkegiatan: yearList.map(() => ""),
    }));
  };

  // Fetch daftar tahun dari backend
  const fetchYears = async () => {
    try {
      const res = await api.get("/renstra-target/tahun");
      if (Array.isArray(res.data) && res.data.length > 0) {
        setYears(res.data);
        resetTargets(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat rentang periode dari server", err);
    }
  };

  // Generic fetch untuk dropdown
  const fetchOptions = async (level, url, paramKey, paramValue) => {
    setLoading((l) => ({ ...l, [level]: true }));
    try {
      const res = await api.get(
        `${url}${paramKey ? `?${paramKey}=${paramValue}` : ""}`
      );
      const dataArray = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];
      setOptions((o) => ({ ...o, [level]: dataArray }));

      if (level === "program") {
        console.log("Hasil fetch program:", dataArray);
      }
    } catch (err) {
      console.error(`Gagal fetch ${level}`, err);
    } finally {
      setLoading((l) => ({ ...l, [level]: false }));
    }
  };

  const handleDropdownChange = async (level, value) => {
    console.log("Dropdown change:", level, value);
    const order = ["tujuan", "sasaran", "program", "kegiatan", "subkegiatan"];
    const idx = order.indexOf(level);

    const newSelected = { ...selected, [level]: value };
    order.slice(idx + 1).forEach((lvl) => (newSelected[lvl] = ""));
    setSelected(newSelected);

    const newOptions = { ...options };
    order.slice(idx + 1).forEach((lvl) => (newOptions[lvl] = []));
    setOptions(newOptions);

    resetTargets();

    if (!value) return;

    try {
      switch (level) {
        case "tujuan": {
          await fetchOptions("sasaran", "/renstra-sasaran", "tujuan_id", value);
          break;
        }
        case "sasaran": {
          await fetchOptions(
            "program",
            "/renstra-program",
            "sasaran_id",
            value
          );
          break;
        }
        case "program": {
          console.log("options.program", options.program, "value", value);

          const selectedProgram = options.program.find(
            (p) => p.kode_program.toString() === value
          );

          console.log("Detail program terpilih:", {
            id: selectedProgram?.id,
            kode_program: selectedProgram?.kode_program,
            nama_program: selectedProgram?.nama_program,
          });

          if (!selectedProgram) {
            console.warn("⚠️ Program tidak ditemukan untuk value:", value);
            return;
          }

          // ✅ Ambil indikator program (pakai kode_program + jenis_dokumen + tahun)
          const indRes = await api.get(
            `/indikator-program?program_id=${selectedProgram.kode_program}&jenis_dokumen=renstra&tahun=${years[0]}`
          );

          // ✅ Tidak perlu fetch detail lagi, gunakan langsung selectedProgram
          const ind =
            Array.isArray(indRes.data) && indRes.data[0] ? indRes.data[0] : {};
          const prog = selectedProgram;

          console.log("📊 Hasil indikator:", ind);
          console.log("📊 Hasil program detail:", prog);

          setForm((f) => ({
            ...f,
            indikator_id: ind.id ?? "",
            capaian_program: ind.baseline ?? "",
            target_program: years.map((y) => ind[`target_tahun_${y}`] ?? ""),
            satuan_program: ind.satuan ?? "",
            pagu_program: prog.total_pagu_anggaran ?? "",
          }));

          await fetchOptions(
            "kegiatan",
            "/renstra-kegiatan",
            "program_id",
            selectedProgram.id
          );
          break;
        }

        case "kegiatan": {
          console.log("options.kegiatan", options.kegiatan, "value", value);

          const selectedKegiatan = options.kegiatan.find(
            (k) => k.kode_kegiatan.toString() === value
          );

          console.log("Detail kegiatan terpilih:", {
            id: selectedKegiatan?.id,
            kode_kegiatan: selectedKegiatan?.kode_kegiatan,
            nama_kegiatan: selectedKegiatan?.nama_kegiatan,
          });

          if (!selectedKegiatan) {
            console.warn("⚠️ Kegiatan tidak ditemukan untuk value:", value);
            return;
          }

          // ✅ Ambil indikator kegiatan (pakai kode_kegiatan + jenis_dokumen + tahun)
          const indRes = await api.get(
            `/indikator-kegiatan?kegiatan_id=${selectedKegiatan.kode_kegiatan}&jenis_dokumen=renstra&tahun=${years[0]}`
          );

          // ✅ Tidak perlu fetch detail lagi, gunakan langsung selectedKegiatan
          const ind =
            Array.isArray(indRes.data) && indRes.data[0] ? indRes.data[0] : {};
          const keg = selectedKegiatan;

          console.log("📊 Hasil indikator:", ind);
          console.log("📊 Hasil kegiatan detail:", keg);

          setForm((f) => ({
            ...f,
            indikator_id: ind.id ?? "",
            capaian_kegiatan: ind.baseline ?? "",
            target_kegiatan: years.map((y) => ind[`target_tahun_${y}`] ?? ""),
            satuan_kegiatan: ind.satuan ?? "",
            pagu_kegiatan: keg.total_pagu_anggaran ?? "",
          }));

          await fetchOptions(
            "subkegiatan",
            "/renstra-subkegiatan",
            "kegiatan_id",
            selectedKegiatan.id
          );
          break;
        }

        case "subkegiatan": {
          const subRes = await api.get(`/sub-kegiatan/${value}`); // ✅ cukup ini saja
          const sub = subRes.data?.data || {}; // pakai .data.data karena response backend ada "message" & "data"

          console.log("📊 Hasil subkegiatan detail:", sub);

          setForm((f) => ({
            ...f,
            capaian_subkegiatan: "", // ❌ kosongkan, karena memang nggak ada kolom baseline
            target_subkegiatan: years.map(() => ""), // ❌ kosongkan juga
            satuan_subkegiatan: "", // ❌ nggak ada di tabel
            pagu_subkegiatan: sub.total_pagu_anggaran ?? "",
          }));
          break;
        }
      }
    } catch (err) {
      console.error("Gagal fetch data", err);
    }
  };

  useEffect(() => {
    fetchYears();
    fetchOptions("tujuan", "/renstra-tujuan");
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const match = name.match(
      /(target|satuan)_(program|kegiatan|subkegiatan)\[(\d+)\]/
    );
    if (match) {
      const key = `${match[1]}_${match[2]}`;
      const index = parseInt(match[3]);
      setForm((f) => ({
        ...f,
        [key]: f[key].map((v, i) => (i === index ? value : v)),
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const level of [
      "target_program",
      "target_kegiatan",
      "target_subkegiatan",
    ]) {
      for (let i = 0; i < years.length; i++) {
        if (!form[level][i]) {
          alert(
            `Isi target ${level.replace("target_", "")} untuk th. ke-${i + 1} dalam periode`,
          );
          return;
        }
      }
    }

    const payload = {
      indikator_id: form.indikator_id,
      lokasi: form.lokasi,
      capaian_program: form.capaian_program,
      capaian_kegiatan: form.capaian_kegiatan,
      capaian_subkegiatan: form.capaian_subkegiatan,
      satuan_program: form.satuan_program,
      pagu_program: form.pagu_program,
      satuan_kegiatan: form.satuan_kegiatan,
      pagu_kegiatan: form.pagu_kegiatan,
      satuan_subkegiatan: form.satuan_subkegiatan,
      pagu_subkegiatan: form.pagu_subkegiatan,
      details: [
        ...years.map((y, i) => ({
          level: "program",
          tahun: y,
          target_value: form.target_program[i],
        })),
        ...years.map((y, i) => ({
          level: "kegiatan",
          tahun: y,
          target_value: form.target_kegiatan[i],
        })),
        ...years.map((y, i) => ({
          level: "subkegiatan",
          tahun: y,
          target_value: form.target_subkegiatan[i],
        })),
      ],
    };

    setLoading((l) => ({ ...l, submit: true }));
    try {
      await api.post("/renstra-target", payload);
      alert("Data berhasil disimpan!");
      resetTargets();
      setSelected({
        tujuan: "",
        sasaran: "",
        program: "",
        kegiatan: "",
        subkegiatan: "",
      });
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading((l) => ({ ...l, submit: false }));
    }
  };

  const renderDropdown = (level, placeholder, labelFn, idField = "id") => (
    <div className="mb-4">
      <select
        value={selected[level]}
        onChange={(e) => handleDropdownChange(level, e.target.value)}
        disabled={loading[level]}
        className={`border p-2 w-full rounded ${
          loading[level] ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      >
        <option value="">{placeholder}</option>
        {Array.isArray(options[level]) &&
          options[level].map((o) => {
            // 🔑 key unik = `${idField}-${o[idField]}-${o.id}`
            const key = `${idField}-${o[idField]}-${o.id}`;
            return (
              <option key={key} value={o[idField]}>
                {labelFn ? labelFn(o) : o.nomor || o.isi_sasaran}
              </option>
            );
          })}
      </select>
    </div>
  );

  const renderYearInputs = (key) =>
    form[key].map((v, i) => (
      <input
        key={i}
        type="number"
        min="0"
        max="99999999"
        name={`${key}[${i}]`}
        value={v}
        onChange={handleChange}
        placeholder={`Th. ke-${i + 1}`}
        className="border p-2 w-full rounded mb-1"
      />
    ));

  const getUniqueSubkegiatan = (arr) => {
    return arr.filter(
      (item, index, self) =>
        index ===
        self.findIndex((t) => t.sub_kegiatan_id === item.sub_kegiatan_id)
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white shadow rounded space-y-6">
      <h2 className="text-xl font-bold mb-4">
        Input Target Renstra Interaktif
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderDropdown(
          "tujuan",
          "-- Pilih Tujuan --",
          (o) => `${o.no_tujuan} - ${o.isi_tujuan}`,
          "no_tujuan"
        )}
        {renderDropdown(
          "sasaran",
          "-- Pilih Sasaran --",
          (o) => `${o.nomor} - ${o.isi_sasaran}`,
          "id" // <-- gunakan id dari backend
        )}
        {renderDropdown(
          "program",
          "-- Pilih Program --",
          (o) =>
            `${o.kode_program} - ${o.nama_program} (${
              o.opd_penanggung_jawab || "-"
            })`,
          "kode_program" // ubah ke kode_program
        )}
        <div>
          <label>Capaian awal periode (program)</label>
          <input
            type="text"
            value={form.capaian_program}
            readOnly
            className="border p-2 w-full rounded bg-gray-100 mb-2"
          />
          <label>Target Program</label>
          {renderYearInputs("target_program")}
          <label>Satuan Program</label>
          <input
            type="text"
            value={form.satuan_program}
            readOnly
            className="border p-2 w-full rounded mb-2"
          />
          <label>Pagu Anggaran Program</label>
          <input
            type="text"
            value={form.pagu_program}
            readOnly
            className="border p-2 w-full rounded mb-2"
          />
        </div>
        {renderDropdown(
          "kegiatan",
          "-- Pilih Kegiatan --",
          (o) =>
            `${o.kode_kegiatan} - ${o.nama_kegiatan} (${o.bidang_opd || "-"})`,
          "kode_kegiatan"
        )}
        <div>
          <label>Capaian awal periode (kegiatan)</label>
          <input
            type="text"
            value={form.capaian_kegiatan}
            readOnly
            className="border p-2 w-full rounded bg-gray-100 mb-2"
          />
          <label>Target Kegiatan</label>
          {renderYearInputs("target_kegiatan")}
          <label>Satuan Kegiatan</label>
          <input
            type="text"
            value={form.satuan_kegiatan}
            readOnly
            className="border p-2 w-full rounded mb-2"
          />
          <label>Pagu Anggaran Kegiatan</label>
          <input
            type="text"
            value={form.pagu_kegiatan}
            readOnly
            className="border p-2 w-full rounded mb-2"
          />
        </div>
        {renderDropdown(
          "subkegiatan",
          "Pilih Sub Kegiatan",
          (o) => `${o.kode_sub_kegiatan} - ${o.nama_sub_kegiatan}`,
          "sub_kegiatan_id" // ✅ pakai field ini untuk value
        )}
        <div>
          <label>Capaian awal periode (sub kegiatan)</label>
          <input
            type="number"
            name="capaian_subkegiatan"
            value={form.capaian_subkegiatan}
            onChange={handleChange}
            className="border p-2 w-full rounded mb-2"
          />
          <label>Target Sub Kegiatan</label>
          {renderYearInputs("target_subkegiatan")}
          <label>Satuan Sub Kegiatan</label>
          <input
            type="text"
            name="satuan_subkegiatan"
            value={form.satuan_subkegiatan}
            onChange={handleChange}
            className="border p-2 w-full rounded mb-2"
          />
          <label>Pagu Anggaran Sub Kegiatan</label>
          <input
            type="text"
            value={form.pagu_subkegiatan}
            readOnly
            className="border p-2 w-full rounded mb-2"
          />
        </div>
        <div>
          <label>Lokasi</label>
          <input
            type="text"
            name="lokasi"
            value={form.lokasi}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </div>
        <button
          type="submit"
          disabled={loading.submit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading.submit ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  );
}
