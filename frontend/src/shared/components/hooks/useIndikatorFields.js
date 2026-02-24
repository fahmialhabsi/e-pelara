// src/shared/components/hooks/useIndikatorFields.js
import { LEVEL_DOKUMEN_OPTIONS, JENIS_IKU_OPTIONS } from "@/utils/constants";

export default function useIndikatorFields(
  values,
  setFieldValue,
  errors,
  touched,
  opdOptions = [],
  stepOptions = [],
  stepKey
) {
  const handleFieldChange = (field) => (e) => {
    setFieldValue(field, e.target.value);
  };

  const buildSelectField = ({ name, label, options, tooltip }) => ({
    name,
    label,
    type: "select",
    options,
    placeholder: `Pilih ${label.toLowerCase()}`,
    tooltip,
  });

  const buildTextField = ({ name, label, tooltip, readOnly = false }) => ({
    name,
    label,
    placeholder: `Masukkan ${label.toLowerCase()}`,
    tooltip,
    readOnly,
  });

  const tipeIndikatorOptions = {
    tujuan: [{ value: "Impact", label: "Impact" }],
    sasaran: [{ value: "Outcome", label: "Outcome" }],
    program: [{ value: "Output", label: "Output" }],
    kegiatan: [{ value: "Proses", label: "Proses" }],
  };

  const fieldsPerTab = {
    1: [
      buildTextField({
        name: "kode_indikator",
        label: "Kode Indikator",
        tooltip: "Kode otomatis dari sistem.",
        readOnly: true,
      }),
      buildTextField({
        name: "nama_indikator",
        label: "Nama Indikator",
        tooltip: "Nama atau deskripsi indikator.",
      }),
      buildSelectField({
        name: "level_dokumen",
        label: "Level Dokumen",
        options: LEVEL_DOKUMEN_OPTIONS,
        tooltip: "Level dokumen sesuai dengan jenjang perencanaan.",
      }),
      buildSelectField({
        name: "jenis_iku",
        label: "Jenis IKU",
        options: JENIS_IKU_OPTIONS,
        tooltip: "Jenis indikator kinerja utama (IKU).",
      }),
    ],
    2: [
      buildSelectField({
        name: "tipe_indikator",
        label: "Tipe Indikator",
        options: tipeIndikatorOptions[stepKey] || [],
        tooltip: "Tipe indikator (Impact, Output, Outcome, dsb).",
      }),
      buildTextField({
        name: "jenis",
        label: "Indikator Kinerja Dampak",
        tooltip: "Jenis dari indikator kinerja dampak yang diukur.",
      }),
      buildTextField({
        name: "tolok_ukur_kinerja",
        label: "Tolok Ukur Indikator Kinerja Dampak",
        tooltip: "Ukuran utama yang digunakan untuk indikator ini.",
      }),
      buildTextField({
        name: "target_kinerja",
        label: "Target Indikator Kinerja Dampak",
        tooltip: "Target kinerja yang ingin dicapai.",
      }),
    ],
    3: [
      {
        name: "definisi_operasional",
        label: "Definisi Operasional",
        type: "textarea",
        placeholder: "Contoh: Indikator yang mengukur outcome",
        tooltip: "Deskripsi rinci operasional dari indikator.",
      },
      {
        name: "metode_penghitungan",
        label: "Metode Penghitungan",
        type: "textarea",
        placeholder: "Contoh: (Jumlah total ÷ Populasi) × 100",
        tooltip:
          "Metode kuantitatif/kualitatif untuk menghitung nilai indikator.",
      },
      buildSelectField({
        name: "jenis_indikator",
        label: "Pilih Kriteria",
        options: [
          { value: "Kuantitatif", label: "Kuantitatif" },
          { value: "Kualitatif", label: "Kualitatif" },
        ],
        tooltip:
          "Pilih kriteria pengukuran indikator: numerik atau deskriptif.",
      }),
      buildTextField({
        name: "kriteria_kuantitatif",
        label: "Kriteria Kuantitatif",
        tooltip: "Kriteria pencapaian jika indikator bersifat kuantitatif.",
        readOnly: values.jenis_indikator !== "Kuantitatif",
      }),
      buildTextField({
        name: "kriteria_kualitatif",
        label: "Kriteria Kualitatif",
        tooltip: "Kriteria deskriptif jika indikator bersifat kualitatif.",
        readOnly: values.jenis_indikator !== "Kualitatif",
      }),
    ],
    4: [
      buildTextField({
        name: "satuan",
        label: "Satuan Indikator",
        tooltip: "Jenis satuan seperti %, orang, indeks, dll.",
      }),

      ...[1, 2, 3, 4, 5].map((i) =>
        buildTextField({
          name: `capaian_tahun_${i}`,
          label: `Capaian Tahun ${i}`,
          tooltip: `Capaian aktual untuk tahun ke-${i}.`,
        })
      ),
      buildTextField({
        name: "baseline",
        label: "Baseline",
        tooltip: "Nilai awal indikator sebelum target ditentukan.",
      }),
      ...[1, 2, 3, 4, 5].map((i) =>
        buildTextField({
          name: `target_tahun_${i}`,
          label: `Target Tahun ${i}`,
          tooltip: `Target indikator untuk tahun ke-${i}.`,
        })
      ),
      buildTextField({
        name: "sumber_data",
        label: "Sumber Data",
        tooltip: "Instansi atau sumber penghasil data indikator.",
      }),
      {
        name: "penanggung_jawab",
        label: "Penanggung Jawab",
        type: "opd",
        tooltip: "OPD yang bertanggung jawab atas indikator ini.",
      },
    ],
    5: [
      buildTextField({
        name: "tahun_awal",
        label: "Tahun Awal",
        tooltip: "Tahun awal dari Periode RPJMD",
        readOnly: true,
      }),
      buildTextField({
        name: "tahun_akhir",
        label: "Tahun Akhir",
        tooltip: "Tahun akhir dari Periode RPJMD",
        readOnly: true,
      }),
      buildTextField({
        name: "target_awal",
        label: "Target Awal",
        tooltip: "Otomatis dari target tahun 1",
        readOnly: true,
      }),
      buildTextField({
        name: "target_akhir",
        label: "Target Akhir",
        tooltip: "Otomatis dari target tahun 5",
        readOnly: true,
      }),
    ],
  };

  return {
    fields: fieldsPerTab,
    handleFieldChange,
  };
}
