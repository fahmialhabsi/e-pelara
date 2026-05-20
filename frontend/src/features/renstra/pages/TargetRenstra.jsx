import React, { useCallback, useEffect, useState } from "react";
import api from "../../../services/api";

export default function TargetRenstra() {
  const [years, setYears] = useState([]); // Tahun otomatis dari backend
  const [renstraId, setRenstraId] = useState("");
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
  const resetTargets = useCallback((yearList = years) => {
    setForm((f) => ({
      ...f,
      target_program: yearList.map(() => ""),
      target_kegiatan: yearList.map(() => ""),
      target_subkegiatan: yearList.map(() => ""),
    }));
  }, [years]);

  useEffect(() => {
    let isMounted = true;

    const loadRenstraAktif = async () => {
      try {
        const res = await api.get("/renstra-opd/aktif");
        if (!isMounted) return;

        const data = res.data?.data ?? res.data ?? null;
        const aktif = Array.isArray(data) ? data.find((item) => item?.is_aktif) ?? data[0] : data;
        setRenstraId(aktif?.id ? String(aktif.id) : "");
      } catch (err) {
        void err;
        if (isMounted) {
          setRenstraId("");
        }
      }
    };

    void loadRenstraAktif();

    return () => {
      isMounted = false;
    };
  }, []);

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

    } catch (err) {
      void err;
    } finally {
      setLoading((l) => ({ ...l, [level]: false }));
    }
  };

  const handleDropdownChange = async (level, value) => {
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
          const selectedProgram = options.program.find(
            (p) => p.kode_program.toString() === value
          );

          if (!selectedProgram) {
            return;
          }

          if (!renstraId) {
            setForm((f) => ({ ...f, indikator_id: "" }));
            return;
          }

          // ✅ Ambil indikator program dari konteks Renstra target
          const indRes = await api.get("/indikator-renstra", {
            params: {
              renstra_id: renstraId,
              stage: "program",
              ref_id: selectedProgram.id,
            },
          });

          // ✅ Tidak perlu fetch detail lagi, gunakan langsung selectedProgram
          const ind =
            Array.isArray(indRes.data) && indRes.data[0]
              ? indRes.data[0]
              : indRes.data?.data?.[0] || indRes.data?.data || {};
          const prog = selectedProgram;

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
          const selectedKegiatan = options.kegiatan.find(
            (k) => k.kode_kegiatan.toString() === value
          );

          if (!selectedKegiatan) {
            return;
          }

          if (!renstraId) {
            setForm((f) => ({ ...f, indikator_id: "" }));
            return;
          }

          // ✅ Ambil indikator kegiatan dari konteks Renstra target
          const indRes = await api.get("/indikator-renstra", {
            params: {
              renstra_id: renstraId,
              stage: "kegiatan",
              ref_id: selectedKegiatan.id,
            },
          });

          // ✅ Tidak perlu fetch detail lagi, gunakan langsung selectedKegiatan
          const ind =
            Array.isArray(indRes.data) && indRes.data[0]
              ? indRes.data[0]
              : indRes.data?.data?.[0] || indRes.data?.data || {};
          const keg = selectedKegiatan;

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
      void err;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [yearsRes, tujuanRes] = await Promise.all([
          api.get("/renstra-target/tahun"),
          api.get("/renstra-tujuan"),
        ]);

        if (!isMounted) return;

        if (Array.isArray(yearsRes.data) && yearsRes.data.length > 0) {
          setYears(yearsRes.data);
          resetTargets(yearsRes.data);
        }

        const tujuanDataArray = Array.isArray(tujuanRes.data)
          ? tujuanRes.data
          : Array.isArray(tujuanRes.data.data)
          ? tujuanRes.data.data
          : [];
        setOptions((o) => ({ ...o, tujuan: tujuanDataArray }));
      } catch (err) {
        void err;
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [resetTargets]);

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
    void err;
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading((l) => ({ ...l, submit: false }));
    }
  };

  const renderDropdown = (level, placeholder, labelFn, idField = "id") => (
    <div>
      <select
        value={selected[level]}
        onChange={(e) => handleDropdownChange(level, e.target.value)}
        disabled={loading[level]}
        className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
          loading[level] ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
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
        className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    ));

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Input Target Renstra
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Input Target Renstra Interaktif
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Lengkapi target per tahun untuk program, kegiatan, dan sub kegiatan dalam satu alur yang lebih
                terstruktur dan mudah dibaca.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                Tahun aktif: {years.length || "-"}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Target Renstra
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Basis Hirarki</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Pilih jalur tujuan sampai sub kegiatan sebelum mengisi target tahunan.
                </p>
              </div>
              <div className="space-y-4">
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
                  "id"
                )}
                {renderDropdown(
                  "program",
                  "-- Pilih Program --",
                  (o) =>
                    `${o.kode_program} - ${o.nama_program} (${o.opd_penanggung_jawab || "-"})`,
                  "kode_program"
                )}
                {renderDropdown(
                  "kegiatan",
                  "-- Pilih Kegiatan --",
                  (o) =>
                    `${o.kode_kegiatan} - ${o.nama_kegiatan} (${o.bidang_opd || "-"})`,
                  "kode_kegiatan"
                )}
                {renderDropdown(
                  "subkegiatan",
                  "Pilih Sub Kegiatan",
                  (o) => `${o.kode_sub_kegiatan} - ${o.nama_sub_kegiatan}`,
                  "sub_kegiatan_id"
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Rincian Nilai</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Nilai capaian, satuan, dan pagu ditampilkan sebagai ringkasan siap audit.
                </p>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Capaian awal periode (program)
                  </label>
                  <input
                    type="text"
                    value={form.capaian_program}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Target Program
                  </label>
                  {renderYearInputs("target_program")}
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Satuan Program
                  </label>
                  <input
                    type="text"
                    value={form.satuan_program}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Pagu Anggaran Program
                  </label>
                  <input
                    type="text"
                    value={form.pagu_program}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Capaian awal periode (kegiatan)
                  </label>
                  <input
                    type="text"
                    value={form.capaian_kegiatan}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Target Kegiatan
                  </label>
                  {renderYearInputs("target_kegiatan")}
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Satuan Kegiatan
                  </label>
                  <input
                    type="text"
                    value={form.satuan_kegiatan}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Pagu Anggaran Kegiatan
                  </label>
                  <input
                    type="text"
                    value={form.pagu_kegiatan}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Capaian awal periode (sub kegiatan)
                  </label>
                  <input
                    type="number"
                    name="capaian_subkegiatan"
                    value={form.capaian_subkegiatan}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Target Sub Kegiatan
                  </label>
                  {renderYearInputs("target_subkegiatan")}
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Satuan Sub Kegiatan
                  </label>
                  <input
                    type="text"
                    name="satuan_subkegiatan"
                    value={form.satuan_subkegiatan}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                  <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                    Pagu Anggaran Sub Kegiatan
                  </label>
                  <input
                    type="text"
                    value={form.pagu_subkegiatan}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Lokasi</label>
                  <input
                    type="text"
                    name="lokasi"
                    value={form.lokasi}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="submit"
              disabled={loading.submit}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading.submit ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
