# Audit klasifikasi penuh (setiap baris grep)

Total baris: **1431**

| Nama File | Lokasi | Cuplikan | Kategori | Status | Tindakan |
|-----------|--------|----------|----------|--------|----------|
| `frontend\src\contexts\DokumenProvider.jsx` | 5 | // Jika ada ?token= di URL → ini sesi SSO baru → jangan restore dokumen/tahun lama. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 16 | const initialTahun = isFreshSsoSession | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 18 | : sessionStorage.getItem("tahun") \|\| localStorage.getItem("tahun") \|\| ""; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 21 | const [tahun, setTahun] = useState(initialTahun); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 35 | const setTahunGlobal = useCallback((th) => { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 36 | setTahun(th); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 38 | sessionStorage.setItem("tahun", th); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 39 | localStorage.setItem("tahun", th); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 41 | sessionStorage.removeItem("tahun"); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 42 | localStorage.removeItem("tahun"); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 48 | setTahun(""); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 50 | sessionStorage.removeItem("tahun"); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 52 | localStorage.removeItem("tahun"); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 59 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\contexts\DokumenProvider.jsx` | 61 | setTahun: setTahunGlobal, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormCascadingRenstra.jsx` | 104 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\components\FormCascadingRenstra.jsx` | 160 | if (!config \|\| !dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormCascadingRenstra.jsx` | 164 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormCascadingRenstra.jsx` | 212 | [abortFieldRequest, clearChildren, dokumen, onChange, tahun, value], | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormCascadingRenstra.jsx` | 216 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormCascadingRenstra.jsx` | 220 | }, [dokumen, tahun, fetchOptions]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 19 | tahun_mulai: Yup.number().required("Tahun Mulai wajib dipilih"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 20 | tahun_akhir: Yup.number().required("Tahun Akhir wajib dipilih"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 41 | tahun_mulai: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 42 | tahun_akhir: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 232 | {/* Tahun Mulai */} | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 234 | label="Tahun Mulai" | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 235 | validateStatus={errors.tahun_mulai ? "error" : ""} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 236 | help={errors.tahun_mulai?.message} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 239 | name="tahun_mulai" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 242 | <Select {...field} allowClear placeholder="Pilih Tahun Mulai"> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 244 | <Select.Option key={p.tahun_awal} value={p.tahun_awal}> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 245 | {p.nama} ({p.tahun_awal}) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 253 | {/* Tahun Akhir */} | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 255 | label="Tahun Akhir" | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 256 | validateStatus={errors.tahun_akhir ? "error" : ""} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 257 | help={errors.tahun_akhir?.message} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 260 | name="tahun_akhir" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 263 | <Select {...field} allowClear placeholder="Pilih Tahun Akhir"> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 265 | <Select.Option key={p.tahun_akhir} value={p.tahun_akhir}> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\features\renstra\components\FormRenstraOPD.jsx` | 266 | {p.nama} ({p.tahun_akhir}) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kebijakan\components\IndikatorKebijakanRenstraForm.jsx` | 22 | target_tahun_1: Yup.string().required("Target (th. ke-1) wajib diisi"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kebijakan\components\IndikatorKebijakanRenstraForm.jsx` | 59 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kebijakan\components\IndikatorKebijakanRenstraForm.jsx` | 72 | target_tahun_1: data.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kebijakan\components\IndikatorKebijakanRenstraForm.jsx` | 177 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kebijakan\pages\IndikatorKebijakanRenstraListPage.jsx` | 38 | { title: "Target (th. ke-1)", dataIndex: "target_tahun_1", key: "target" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kegiatan\components\IndikatorKegiatanRenstraForm.jsx` | 43 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kegiatan\components\IndikatorKegiatanRenstraForm.jsx` | 53 | target_tahun_1: (yup) => | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kegiatan\components\IndikatorKegiatanRenstraForm.jsx` | 67 | target_tahun_1: formData.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kegiatan\components\IndikatorKegiatanRenstraForm.jsx` | 166 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\kegiatan\pages\IndikatorKegiatanRenstraListPage.jsx` | 38 | { title: "Target (th. ke-1)", dataIndex: "target_tahun_1", key: "target" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\program\components\IndikatorProgramRenstraForm.jsx` | 43 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\program\components\IndikatorProgramRenstraForm.jsx` | 53 | target_tahun_1: (yup) => | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\program\components\IndikatorProgramRenstraForm.jsx` | 67 | target_tahun_1: data.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\program\components\IndikatorProgramRenstraForm.jsx` | 166 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\program\pages\IndikatorProgramRenstraListPage.jsx` | 38 | { title: "Target (th. ke-1)", dataIndex: "target_tahun_1", key: "target" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\sasaran\components\IndikatorSasaranRenstraForm.jsx` | 43 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\sasaran\components\IndikatorSasaranRenstraForm.jsx` | 53 | target_tahun_1: (yup) => | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\sasaran\components\IndikatorSasaranRenstraForm.jsx` | 67 | target_tahun_1: formData.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\sasaran\components\IndikatorSasaranRenstraForm.jsx` | 172 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\sasaran\pages\IndikatorSasaranRenstraListPage.jsx` | 50 | dataIndex: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\sasaran\pages\IndikatorSasaranRenstraListPage.jsx` | 51 | key: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\strategi\components\IndikatorStrategiRenstraForm.jsx` | 43 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\strategi\components\IndikatorStrategiRenstraForm.jsx` | 53 | target_tahun_1: (yup) => | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\strategi\components\IndikatorStrategiRenstraForm.jsx` | 67 | target_tahun_1: formData.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\strategi\components\IndikatorStrategiRenstraForm.jsx` | 172 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\strategi\pages\IndikatorStrategiRenstraListPage.jsx` | 47 | dataIndex: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\subkegiatan\components\IndikatorSubKegiatanRenstraForm.jsx` | 47 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\subkegiatan\components\IndikatorSubKegiatanRenstraForm.jsx` | 57 | target_tahun_1: (yup) => | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\subkegiatan\components\IndikatorSubKegiatanRenstraForm.jsx` | 71 | target_tahun_1: formData.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\subkegiatan\components\IndikatorSubKegiatanRenstraForm.jsx` | 176 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\subkegiatan\pages\IndikatorSubKegiatanRenstraListPage.jsx` | 47 | dataIndex: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\tujuan\components\IndikatorTujuanRenstraForm.jsx` | 44 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\tujuan\components\IndikatorTujuanRenstraForm.jsx` | 54 | target_tahun_1: (yup) => | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\tujuan\components\IndikatorTujuanRenstraForm.jsx` | 68 | target_tahun_1: formData.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\tujuan\components\IndikatorTujuanRenstraForm.jsx` | 171 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\tujuan\pages\IndikatorTujuanRenstraListPage.jsx` | 61 | dataIndex: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\tujuan\pages\IndikatorTujuanRenstraListPage.jsx` | 62 | key: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\components\IndikatorUmumRenstraForm.jsx` | 45 | target_tahun_1: Yup.string().required("Target (th. ke-1) wajib diisi"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\components\IndikatorUmumRenstraForm.jsx` | 58 | target_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\components\IndikatorUmumRenstraForm.jsx` | 71 | target_tahun_1: formData.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\components\IndikatorUmumRenstraForm.jsx` | 199 | name="target_tahun_1" | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\pages\indikatorUmumRenstraAddPage.jsx` | 7 | const { tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\indikator\umumRentra\pages\indikatorUmumRenstraAddPage.jsx` | 13 | if (!tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\pages\indikatorUmumRenstraAddPage.jsx` | 17 | const res = await api.get(`/indikator-renstra/aktif?tahun=${tahun}`); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\pages\indikatorUmumRenstraAddPage.jsx` | 28 | }, [tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\pages\indikatorUmumRenstraListPage.jsx` | 83 | dataIndex: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\indikator\umumRentra\pages\indikatorUmumRenstraListPage.jsx` | 84 | key: "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kebijakan\components\kebijakanRenstraForm.jsx` | 50 | setValue("tahun", selected?.tahun \|\| ""); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\kebijakan\components\kebijakanRenstraForm.jsx` | 67 | setValue("tahun", initialData.tahun); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 21 | init[i] = initialData?.[`pagu_tahun_${i}`] \|\| 0; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 48 | values[`target_tahun_${i}`] = initialData?.[`target_tahun_${i}`] ?? ""; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 49 | values[`pagu_tahun_${i}`] = initialData?.[`pagu_tahun_${i}`] ?? 0; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 179 | const handlePaguChange = (tahun, value) => { | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 180 | setInputPagu((prev) => ({ ...prev, [tahun]: Number(value \|\| 0) })); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 181 | setValue(`pagu_tahun_${tahun}`, Number(value \|\| 0)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 223 | const t = row[`target_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 224 | const p = row[`pagu_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 225 | if (t != null && t !== "") setValue(`target_tahun_${i}`, t); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 226 | if (p != null && p !== "") setValue(`pagu_tahun_${i}`, Number(p)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 231 | next[i] = Number(row[`pagu_tahun_${i}`] \|\| 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 296 | const val = sel[`target_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 297 | if (val !== undefined && val !== null) setValue(`target_tahun_${i}`, val); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 304 | (sum, i) => sum.plus(new Decimal(watch(`target_tahun_${i}`) \|\| 0)), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 308 | (sum, i) => sum.plus(new Decimal(watch(`pagu_tahun_${i}`) \|\| 0)), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 314 | watch(`target_tahun_1`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 315 | watch(`target_tahun_2`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 316 | watch(`target_tahun_3`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 317 | watch(`target_tahun_4`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 318 | watch(`target_tahun_5`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 319 | watch(`target_tahun_6`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 320 | watch(`pagu_tahun_1`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 321 | watch(`pagu_tahun_2`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 322 | watch(`pagu_tahun_3`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 323 | watch(`pagu_tahun_4`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 324 | watch(`pagu_tahun_5`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 325 | watch(`pagu_tahun_6`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 463 | name={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\kegiatan\components\RenstraTabelKegiatanForm.jsx` | 477 | name={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\DynamicBabPage.jsx` | 40 | export default function DynamicBabPage({ tahun }) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\DynamicBabPage.jsx` | 54 | .get(`/renstra/${tahun}/bab/${babId}`) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\DynamicBabPage.jsx` | 60 | }, [babId, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\DynamicBabPage.jsx` | 142 | await api.put(`/renstra/${tahun}/bab/${babId}`, { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\DynamicBabPage.jsx` | 158 | fileName = `Bab_${babId}_${tahun}.pdf`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\DynamicBabPage.jsx` | 337 | saveAs(blob, `Bab_${babId}_${tahun}.docx`); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\DynamicBabPage.jsx` | 371 | saveAs(blob, `Bab_${babId}_${tahun}.xlsx`); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 29 | pagu_tahun_1: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 30 | pagu_tahun_2: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 31 | pagu_tahun_3: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 32 | pagu_tahun_4: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 33 | pagu_tahun_5: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 54 | const { tahun: tahunAktif } = useDokumen(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 65 | periode_awal: tahunAktif \|\| "", | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 66 | periode_akhir: tahunAktif \|\| "", | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 88 | ...(tahunAktif ? { tahun: tahunAktif } : {}), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 102 | }, [tahunAktif]); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 131 | periode_awal: tahunAktif \|\| "", | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 132 | periode_akhir: tahunAktif \|\| "", | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 146 | pagu_tahun_1: row.pagu_tahun_1 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 147 | pagu_tahun_2: row.pagu_tahun_2 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 148 | pagu_tahun_3: row.pagu_tahun_3 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 149 | pagu_tahun_4: row.pagu_tahun_4 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 150 | pagu_tahun_5: row.pagu_tahun_5 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 191 | pagu_tahun_1: form.pagu_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 192 | pagu_tahun_2: form.pagu_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 193 | pagu_tahun_3: form.pagu_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 194 | pagu_tahun_4: form.pagu_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 195 | pagu_tahun_5: form.pagu_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 272 | const result = await syncRenstraDocs(tahunAktif ? { tahun: tahunAktif } : {}); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 288 | Periode, judul, pagu multi-tahun, referensi RPJMD, audit mutasi, dan status workflow. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 354 | Y1–Y5: {[1, 2, 3, 4, 5].map((i) => row[`pagu_tahun_${i}`] ?? "—").join(" / ")} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 540 | name={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\ListRenstraOPD.jsx` | 543 | value={form[`pagu_tahun_${i}`]} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 29 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 135 | const paguPerTahun = [1, 2, 3, 4, 5, 6].map((i) => ({ | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 136 | tahun: i, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 137 | total: rows.reduce((sum, r) => sum + (Number(r[`pagu_tahun_${i}`]) \|\| 0), 0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 140 | setPaguSummary({ paguPerTahun, totalAkhir, count: rows.length }); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 157 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 159 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 165 | ? `${renstraAktif.tahun_mulai} – ${renstraAktif.tahun_akhir}` | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 166 | : tahun \|\| "-"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\RenstraDashboard.jsx` | 305 | {paguSummary.paguPerTahun.map(({ tahun: t, total }) => ( | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 5 | const [years, setYears] = useState([]); // Tahun otomatis dari backend | STATE_PROP | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 48 | // Reset target arrays sesuai jumlah tahun | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 49 | const resetTargets = (yearList = years) => { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 52 | target_program: yearList.map(() => ""), | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 53 | target_kegiatan: yearList.map(() => ""), | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 54 | target_subkegiatan: yearList.map(() => ""), | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 58 | // Fetch daftar tahun dari backend | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 59 | const fetchYears = async () => { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 61 | const res = await api.get("/renstra-target/tahun"); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 63 | setYears(res.data); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 67 | console.error("Gagal fetch tahun", err); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 145 | // ✅ Ambil indikator program (pakai kode_program + jenis_dokumen + tahun) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 147 | `/indikator-program?program_id=${selectedProgram.kode_program}&jenis_dokumen=renstra&tahun=${years[0]}` | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 162 | target_program: years.map((y) => ind[`target_tahun_${y}`] ?? ""), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 194 | // ✅ Ambil indikator kegiatan (pakai kode_kegiatan + jenis_dokumen + tahun) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 196 | `/indikator-kegiatan?kegiatan_id=${selectedKegiatan.kode_kegiatan}&jenis_dokumen=renstra&tahun=${years[0]}` | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 211 | target_kegiatan: years.map((y) => ind[`target_tahun_${y}`] ?? ""), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 234 | target_subkegiatan: years.map(() => ""), // ❌ kosongkan juga | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 247 | fetchYears(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 275 | for (let i = 0; i < years.length; i++) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 298 | ...years.map((y, i) => ({ | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 300 | tahun: y, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 303 | ...years.map((y, i) => ({ | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 305 | tahun: y, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 308 | ...years.map((y, i) => ({ | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 310 | tahun: y, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 361 | const renderYearInputs = (key) => | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 420 | {renderYearInputs("target_program")} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 452 | {renderYearInputs("target_kegiatan")} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstra.jsx` | 484 | {renderYearInputs("target_subkegiatan")} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\pages\TargetRenstraList.jsx` | 78 | <th>Tahun</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\pages\TargetRenstraList.jsx` | 95 | <td>{t.tahun \|\| "-"}</td> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 49 | [`target_tahun_${i}`]: initialData?.[`target_tahun_${i}`] ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 50 | [`pagu_tahun_${i}`]: initialData?.[`pagu_tahun_${i}`] ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 58 | const targets = [1,2,3,4,5,6].map((i) => Number(data[`target_tahun_${i}`]) \|\| 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 59 | const pagus   = [1,2,3,4,5,6].map((i) => Number(data[`pagu_tahun_${i}`])   \|\| 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 74 | [`target_tahun_${i}`]: Number(data[`target_tahun_${i}`]) \|\| 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 75 | [`pagu_tahun_${i}`]:   Number(data[`pagu_tahun_${i}`])   \|\| 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 96 | const targetValues = watch([1,2,3,4,5,6].map((i) => `target_tahun_${i}`)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 97 | const paguValues   = watch([1,2,3,4,5,6].map((i) => `pagu_tahun_${i}`)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 141 | <InputField key={`t${i}`} name={`target_tahun_${i}`} label={`Target (th. ke-${i})`} control={control} errors={errors} /> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\prioritas\components\RenstraTabelPrioritasForm.jsx` | 146 | <InputField key={`p${i}`} name={`pagu_tahun_${i}`} label={`Pagu (th. ke-${i})`} control={control} errors={errors} /> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\programRenstraForm.jsx` | 20 | // 🔄 Data program RPJMD (filter by tahun_mulai dari renstraAktif, jenis_dokumen = "rpjmd") | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\programRenstraForm.jsx` | 24 | renstraAktif?.tahun_mulai,   // ✅ field yang benar di model RenstraOPD | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\programRenstraForm.jsx` | 31 | tahun: renstraAktif?.tahun_mulai,   // ✅ bukan tahun_awal | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 54 | target_tahun_1: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 55 | target_tahun_2: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 56 | target_tahun_3: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 57 | target_tahun_4: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 58 | target_tahun_5: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 59 | target_tahun_6: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 60 | pagu_tahun_1: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 61 | pagu_tahun_2: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 62 | pagu_tahun_3: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 63 | pagu_tahun_4: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 64 | pagu_tahun_5: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 65 | pagu_tahun_6: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 78 | target_tahun_1: initialData?.target_tahun_1 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 79 | target_tahun_2: initialData?.target_tahun_2 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 80 | target_tahun_3: initialData?.target_tahun_3 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 81 | target_tahun_4: initialData?.target_tahun_4 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 82 | target_tahun_5: initialData?.target_tahun_5 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 83 | target_tahun_6: initialData?.target_tahun_6 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 84 | pagu_tahun_1: initialData?.pagu_tahun_1 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 85 | pagu_tahun_2: initialData?.pagu_tahun_2 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 86 | pagu_tahun_3: initialData?.pagu_tahun_3 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 87 | pagu_tahun_4: initialData?.pagu_tahun_4 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 88 | pagu_tahun_5: initialData?.pagu_tahun_5 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 89 | pagu_tahun_6: initialData?.pagu_tahun_6 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 100 | // Hitung target & pagu akhir otomatis dari tahun 1–6 | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 102 | data.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 103 | data.target_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 104 | data.target_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 105 | data.target_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 106 | data.target_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 107 | data.target_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 111 | data.pagu_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 112 | data.pagu_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 113 | data.pagu_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 114 | data.pagu_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 115 | data.pagu_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 116 | data.pagu_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 132 | target_tahun_1: data.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 133 | target_tahun_2: data.target_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 134 | target_tahun_3: data.target_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 135 | target_tahun_4: data.target_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 136 | target_tahun_5: data.target_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 137 | target_tahun_6: data.target_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 138 | pagu_tahun_1: data.pagu_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 139 | pagu_tahun_2: data.pagu_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 140 | pagu_tahun_3: data.pagu_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 141 | pagu_tahun_4: data.pagu_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 142 | pagu_tahun_5: data.pagu_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 143 | pagu_tahun_6: data.pagu_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 194 | setValue(`target_tahun_${i}`, selected[`target_tahun_${i}`] ?? ""); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 202 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 203 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 204 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 205 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 206 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 207 | "target_tahun_6", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 210 | "pagu_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 211 | "pagu_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 212 | "pagu_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 213 | "pagu_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 214 | "pagu_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 215 | "pagu_tahun_6", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 327 | key={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 328 | name={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 339 | key={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\program\components\RenstraTabelProgramForm.jsx` | 340 | name={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 29 | target_tahun_1: initialData?.target_tahun_1 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 30 | target_tahun_2: initialData?.target_tahun_2 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 31 | target_tahun_3: initialData?.target_tahun_3 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 32 | target_tahun_4: initialData?.target_tahun_4 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 33 | target_tahun_5: initialData?.target_tahun_5 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 34 | target_tahun_6: initialData?.target_tahun_6 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 35 | pagu_tahun_1: initialData?.pagu_tahun_1 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 36 | pagu_tahun_2: initialData?.pagu_tahun_2 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 37 | pagu_tahun_3: initialData?.pagu_tahun_3 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 38 | pagu_tahun_4: initialData?.pagu_tahun_4 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 39 | pagu_tahun_5: initialData?.pagu_tahun_5 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 40 | pagu_tahun_6: initialData?.pagu_tahun_6 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 54 | target_tahun_1: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 55 | target_tahun_2: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 56 | target_tahun_3: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 57 | target_tahun_4: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 58 | target_tahun_5: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 59 | target_tahun_6: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 60 | pagu_tahun_1: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 61 | pagu_tahun_2: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 62 | pagu_tahun_3: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 63 | pagu_tahun_4: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 64 | pagu_tahun_5: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 65 | pagu_tahun_6: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 77 | target_tahun_1: data.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 78 | target_tahun_2: data.target_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 79 | target_tahun_3: data.target_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 80 | target_tahun_4: data.target_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 81 | target_tahun_5: data.target_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 82 | target_tahun_6: data.target_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 83 | pagu_tahun_1: data.pagu_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 84 | pagu_tahun_2: data.pagu_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 85 | pagu_tahun_3: data.pagu_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 86 | pagu_tahun_4: data.pagu_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 87 | pagu_tahun_5: data.pagu_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 88 | pagu_tahun_6: data.pagu_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 119 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 120 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 121 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 122 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 123 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 124 | "target_tahun_6", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 127 | "pagu_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 128 | "pagu_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 129 | "pagu_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 130 | "pagu_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 131 | "pagu_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 132 | "pagu_tahun_6", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 199 | // 🔹 Auto isi dari baris Indikator Renstra terpilih (sasaran RPJMD tidak punya lokasi/pagu per tahun) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 217 | setValue(`target_tahun_${i}`, selected[`target_tahun_${i}`] ?? ""); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 220 | selected.target_tahun_6 ?? | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 221 | selected.target_tahun_5 ?? | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 223 | setValue("target_tahun_6", t6); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 226 | const raw = selected[`pagu_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 232 | setValue(`pagu_tahun_${i}`, paguVal(i)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 362 | key={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 363 | name={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 373 | key={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\sasaran\components\RenstraTabelSasaranForm.jsx` | 374 | name={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\shared\components\RenstraTabelListCommon.jsx` | 16 | /** Grid 6 tahun untuk baris expand (target / pagu) */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\shared\components\RenstraTabelListCommon.jsx` | 17 | export function TahunGrid({ record, prefix, label }) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\shared\components\RenstraTabelListCommon.jsx` | 44 | ? formatNumberShort(record[`${prefix}_tahun_${i}`]) | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\shared\components\RenstraTabelListCommon.jsx` | 45 | : formatNumber(record[`${prefix}_tahun_${i}`])} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\shared\components\RenstraTabelListCommon.jsx` | 55 | * Detail expand standar: baseline + satuan + pasangan label opsional, lalu target & pagu per tahun. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\shared\components\RenstraTabelListCommon.jsx` | 91 | <TahunGrid record={record} prefix="target" label="Target tiap tahun dalam periode" /> | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\shared\components\RenstraTabelListCommon.jsx` | 92 | <TahunGrid record={record} prefix="pagu" label="Pagu tiap tahun dalam periode (Rp)" /> | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 58 | [`target_tahun_${i}`]: initialData?.[`target_tahun_${i}`] ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 59 | [`pagu_tahun_${i}`]: initialData?.[`pagu_tahun_${i}`] ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 66 | const targets = [1,2,3,4,5,6].map((i) => Number(data[`target_tahun_${i}`]) \|\| 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 67 | const pagus   = [1,2,3,4,5,6].map((i) => Number(data[`pagu_tahun_${i}`])   \|\| 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 83 | [`target_tahun_${i}`]: Number(data[`target_tahun_${i}`]) \|\| 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 84 | [`pagu_tahun_${i}`]:   Number(data[`pagu_tahun_${i}`])   \|\| 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 124 | setValue(`target_tahun_${i}`, ind[`target_tahun_${i}`] \|\| 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 139 | const targetValues = watch([1,2,3,4,5,6].map((i) => `target_tahun_${i}`)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 140 | const paguValues   = watch([1,2,3,4,5,6].map((i) => `pagu_tahun_${i}`)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 184 | <InputField key={`t${i}`} name={`target_tahun_${i}`} label={`Target (th. ke-${i})`} control={control} errors={errors} /> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\strategiKebijakan\components\RenstraTabelStrategiKebijakanForm.jsx` | 189 | <InputField key={`p${i}`} name={`pagu_tahun_${i}`} label={`Pagu (th. ke-${i})`} control={control} errors={errors} /> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 38 | target_tahun_1: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 39 | target_tahun_2: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 40 | target_tahun_3: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 41 | target_tahun_4: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 42 | target_tahun_5: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 43 | target_tahun_6: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 44 | pagu_tahun_1: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 45 | pagu_tahun_2: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 46 | pagu_tahun_3: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 47 | pagu_tahun_4: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 48 | pagu_tahun_5: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 49 | pagu_tahun_6: num(0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 68 | target_tahun_1: initialData?.target_tahun_1 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 69 | target_tahun_2: initialData?.target_tahun_2 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 70 | target_tahun_3: initialData?.target_tahun_3 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 71 | target_tahun_4: initialData?.target_tahun_4 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 72 | target_tahun_5: initialData?.target_tahun_5 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 73 | target_tahun_6: initialData?.target_tahun_6 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 74 | pagu_tahun_1: initialData?.pagu_tahun_1 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 75 | pagu_tahun_2: initialData?.pagu_tahun_2 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 76 | pagu_tahun_3: initialData?.pagu_tahun_3 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 77 | pagu_tahun_4: initialData?.pagu_tahun_4 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 78 | pagu_tahun_5: initialData?.pagu_tahun_5 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 79 | pagu_tahun_6: initialData?.pagu_tahun_6 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 103 | target_tahun_1: toNumber(data.target_tahun_1), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 104 | target_tahun_2: toNumber(data.target_tahun_2), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 105 | target_tahun_3: toNumber(data.target_tahun_3), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 106 | target_tahun_4: toNumber(data.target_tahun_4), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 107 | target_tahun_5: toNumber(data.target_tahun_5), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 108 | target_tahun_6: toNumber(data.target_tahun_6), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 109 | pagu_tahun_1: toNumber(data.pagu_tahun_1), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 110 | pagu_tahun_2: toNumber(data.pagu_tahun_2), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 111 | pagu_tahun_3: toNumber(data.pagu_tahun_3), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 112 | pagu_tahun_4: toNumber(data.pagu_tahun_4), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 113 | pagu_tahun_5: toNumber(data.pagu_tahun_5), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 114 | pagu_tahun_6: toNumber(data.pagu_tahun_6), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 139 | /** Tahun master RPJMD (sub_kegiatan / indikator memakai kolom tahun numerik). */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 140 | const tahunRpjmd = useMemo(() => { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 141 | const y = Number(renstraAktif?.tahun_mulai); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 142 | return Number.isFinite(y) && y > 0 ? y : new Date().getFullYear(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 143 | }, [renstraAktif?.tahun_mulai]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 183 | queryKey: ["master-sub-kegiatan-by-rpjmd-kegiatan", rpjmdKegiatanId, tahunRpjmd], | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 186 | params: { tahun: tahunRpjmd }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 192 | enabled: !!rpjmdKegiatanId && !!tahunRpjmd, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 206 | setValue(`target_tahun_${i}`, 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 207 | setValue(`pagu_tahun_${i}`, 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 226 | if (initialData \|\| !selectedSubkegiatanId \|\| !tahunRpjmd) return; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 243 | tahun: String(tahunRpjmd), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 279 | setValue(`target_tahun_${i}`, parseNum(first[`target_tahun_${i}`])); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 281 | const t5 = parseNum(first.target_tahun_5); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 282 | setValue("target_tahun_6", t5); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 289 | setValue(`target_tahun_${i}`, 0); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 296 | // RPJMD hanya punya pagu/anggaran total — tidak ada pagu_tahun_1..6; bagi rata ke 6 tahun Renstra. | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 300 | setValue(`pagu_tahun_${i}`, base + (i <= rem ? 1 : 0)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 310 | }, [initialData, selectedSubkegiatanId, tahunRpjmd, setValue]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 321 | const targetValues = watch(["target_tahun_1","target_tahun_2","target_tahun_3","target_tahun_4","target_tahun_5","tar... | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 322 | const paguValues = watch(["pagu_tahun_1","pagu_tahun_2","pagu_tahun_3","pagu_tahun_4","pagu_tahun_5","pagu_tahun_6"]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 452 | key={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 453 | name={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 464 | key={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\subkegiatan\components\RenstraTabelSubKegiatanForm.jsx` | 465 | name={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 66 | target_tahun_1: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 67 | target_tahun_2: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 68 | target_tahun_3: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 69 | target_tahun_4: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 70 | target_tahun_5: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 71 | target_tahun_6: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 72 | pagu_tahun_1: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 73 | pagu_tahun_2: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 74 | pagu_tahun_3: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 75 | pagu_tahun_4: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 76 | pagu_tahun_5: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 77 | pagu_tahun_6: Yup.number().typeError("Harus angka").required(), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 91 | target_tahun_1: initialData?.target_tahun_1 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 92 | target_tahun_2: initialData?.target_tahun_2 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 93 | target_tahun_3: initialData?.target_tahun_3 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 94 | target_tahun_4: initialData?.target_tahun_4 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 95 | target_tahun_5: initialData?.target_tahun_5 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 96 | target_tahun_6: initialData?.target_tahun_6 ?? "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 97 | pagu_tahun_1: initialData?.pagu_tahun_1 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 98 | pagu_tahun_2: initialData?.pagu_tahun_2 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 99 | pagu_tahun_3: initialData?.pagu_tahun_3 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 100 | pagu_tahun_4: initialData?.pagu_tahun_4 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 101 | pagu_tahun_5: initialData?.pagu_tahun_5 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 102 | pagu_tahun_6: initialData?.pagu_tahun_6 ?? 0, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 116 | target_tahun_1: data.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 117 | target_tahun_2: data.target_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 118 | target_tahun_3: data.target_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 119 | target_tahun_4: data.target_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 120 | target_tahun_5: data.target_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 121 | target_tahun_6: data.target_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 122 | pagu_tahun_1: data.pagu_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 123 | pagu_tahun_2: data.pagu_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 124 | pagu_tahun_3: data.pagu_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 125 | pagu_tahun_4: data.pagu_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 126 | pagu_tahun_5: data.pagu_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 127 | pagu_tahun_6: data.pagu_tahun_6, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 189 | const key = `target_tahun_${i}`; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 192 | v = selected.target_tahun_5; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 200 | const p = selected[`pagu_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 205 | const key = `pagu_tahun_${i}`; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 225 | const p = selected[`pagu_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 244 | (s, i) => s + Number(latest[`pagu_tahun_${i}`] \|\| 0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 250 | `pagu_tahun_${i}`, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 251 | Number(latest[`pagu_tahun_${i}`] \|\| 0) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 272 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 273 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 274 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 275 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 276 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 277 | "target_tahun_6", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 280 | "pagu_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 281 | "pagu_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 282 | "pagu_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 283 | "pagu_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 284 | "pagu_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 285 | "pagu_tahun_6", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 410 | key={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 411 | name={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 428 | Renstra</strong> jika kolom <code>pagu_tahun_1</code>– | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 445 | key={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\tujuan\components\RenstraTabelTujuanForm.jsx` | 446 | name={`pagu_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\exportRenstra.js` | 14 | Tahun: t.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\exportRenstra.js` | 37 | [["ID", "Indikator", "Tahun", "Target", "Satuan", "Pagu", "Lokasi"]], | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\utils\exportRenstra.js` | 57 | "Tahun", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\renstra\utils\exportRenstra.js` | 67 | r.Tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\mergeRenstraAktifForEdit.js` | 2 | * GET detail Renstra sering meng-include `renstra` tanpa `tahun_mulai`. | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\mergeRenstraAktifForEdit.js` | 4 | * sehingga tahun hilang → dropdown RPJMD gagal / loading lama. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\mergeRenstraAktifForEdit.js` | 13 | tahun_mulai: d?.tahun_mulai ?? f?.tahun_mulai, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\validasiPaguKegiatanSubkegiatan.js` | 32 | // Hitung total pagu per tahun | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\validasiPaguKegiatanSubkegiatan.js` | 35 | totalPagu[`pagu_tahun_${i}`] = kegiatanList | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\renstra\utils\validasiPaguKegiatanSubkegiatan.js` | 36 | .map((k) => new Decimal(k[`pagu_tahun_${i}`] \|\| 0)) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\AktivitasFilter.jsx` | 36 | <option value="tahun">Agregat tahunan (log aktivitas)</option> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\components\IndikatorSimpleEditFormBody.jsx` | 13 | import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\IndikatorSimpleEditFormBody.jsx` | 28 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdDokumenImporPanel.jsx` | 153 | Data impor ini terikat pada <strong>satu periode RPJMD (lima tahun)</strong>, bukan pada pemilihan tahun | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\components\RpjmdDokumenImporPanel.jsx` | 226 | <td>{r.tahun_2021}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdDokumenImporPanel.jsx` | 227 | <td>{r.tahun_2022}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdDokumenImporPanel.jsx` | 228 | <td>{r.tahun_2023}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdDokumenImporPanel.jsx` | 229 | <td>{r.tahun_2024}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdDokumenImporPanel.jsx` | 230 | <td>{r.tahun_2025}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdImportEditModal.jsx` | 8 | { name: "tahun_2021", label: "2021", type: "text" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdImportEditModal.jsx` | 9 | { name: "tahun_2022", label: "2022", type: "text" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdImportEditModal.jsx` | 10 | { name: "tahun_2023", label: "2023", type: "text" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdImportEditModal.jsx` | 11 | { name: "tahun_2024", label: "2024", type: "text" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\components\RpjmdImportEditModal.jsx` | 12 | { name: "tahun_2025", label: "2025", type: "text" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\ListPageComponent.jsx` | 89 | const tahunAktif = new Date().getFullYear(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\ListPageComponent.jsx` | 104 | doc.text(`Tahun: ${tahunAktif}`, pageWidth / 2, 32, { align: "center" }); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useCheckDuplicateKegiatan.js` | 10 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useCheckDuplicateKegiatan.js` | 24 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useCheckDuplicateKegiatan.js` | 54 | [periode_id, isEdit, existingData, tahun, jenis_dokumen] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useFetchPrograms.js` | 5 | export default function useFetchPrograms(tahun, jenis_dokumen = "rpjmd") { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\subhooks\useFetchPrograms.js` | 17 | params: { tahun, jenis_dokumen, limit: 1000 }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useFetchPrograms.js` | 41 | }, [tahun, jenis_dokumen]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useKegiatanSubmission.js` | 27 | !kegiatanData.tahun \|\| | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\usePrefillKegiatan.js` | 22 | tahun: existingData.tahun \|\| "2025", | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useProgramFilters.js` | 10 | tahun = null | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useProgramFilters.js` | 18 | (!tahun \|\| String(s.tahun) === String(tahun)) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useProgramFilters.js` | 20 | }, [programData.tujuan_id, sasarans, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 55 | const { rpjmd_id, tahun, opd_penanggung_jawab, sasaran_id, jenis_dokumen } = | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 68 | const isReady = !!(tahun && rpjmd_id && jenis_dokumen); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 80 | api.get("/misi", { params: { tahun, jenis_dokumen } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 81 | api.get("/tujuan", { params: { tahun, jenis_dokumen } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 82 | api.get("/sasaran", { params: { tahun, jenis_dokumen } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 84 | params: { tahun, jenis_dokumen, limit: 1000 }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 108 | }, [isReady, tahun, rpjmd_id, jenis_dokumen]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 119 | if (!tahun \|\| !jenis_dokumen \|\| !sasaran_id \|\| !selectedSasaran?.nomor) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 129 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 139 | params: { tahun, jenis_dokumen, limit: 1000 }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 168 | }, [tahun, jenis_dokumen, sasaran_id, selectedSasaran]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 211 | if (!tahun \|\| !rpjmd_id) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 218 | params: { tahun, jenis_dokumen: "rpjmd", limit: 1000 }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\subhooks\useReferenceData.js` | 232 | }, [tahun, rpjmd_id]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 24 | tahun: "2025", | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 49 | // 🆕 Ambil tahun & jenis_dokumen dari state | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 50 | const { tahun, jenis_dokumen } = kegiatanData; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 57 | } = useFetchPrograms(tahun, jenis_dokumen); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 191 | "⚠️ Tidak ada data program yang tersedia untuk tahun", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 192 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 197 | }, [programs, programsLoading, tahun, jenis_dokumen]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useKegiatanFormLogic.js` | 208 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 15 | tahunDalamPeriode, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 21 | const { dokumen, tahun, loading: docLoading, setTahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 37 | if (!periodeLevel && !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 51 | if (pick?.tahun_awal != null) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 52 | const sudahSelaras = tahunDalamPeriode(tahun, pick); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 53 | if (!tahun \|\| !sudahSelaras) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 54 | setTahun(String(pick.tahun_awal)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 67 | }, [dokumen, tahun, user?.periode_id, setTahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 73 | !tahun \|\| | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 81 | const currentYear = parseInt(tahun, 10); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 83 | const tahunAwal = parseInt(periode.tahun_awal, 10); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 84 | const tahunAkhir = parseInt(periode.tahun_akhir, 10); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 85 | return currentYear >= tahunAwal && currentYear <= tahunAkhir; | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 101 | : `Tidak dapat menemukan periode aktif untuk konteks saat ini (${tahun}).`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 104 | }, [dokumen, tahun, periodeList, loadingPeriode, user]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\usePeriodeAktif.jsx` | 110 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useProgramFormLogic.jsx` | 43 | tahun | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useProgramFormLogic.jsx` | 88 | if (isEdit && detail && periode_id && tahun && !initializedRef.current) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\useProgramFormLogic.jsx` | 111 | }, [isEdit, detail, periode_id, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useProgramFormLogic.jsx` | 173 | if (!periode_id \|\| !tahun \|\| (isEdit && !initCompleted)) return null; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useProgramFormLogic.jsx` | 177 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useProgramFormLogic.jsx` | 184 | }, [isEdit, periode_id, tahun, dokumen, initCompleted, programData]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useProgramFormLogic.jsx` | 366 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 44 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 86 | params: { tahun, jenis_dokumen: dokumen }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 95 | if (dokumen && tahun) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 98 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 101 | if (existingData && programList.length > 0 && dokumen && tahun) { | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 111 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 123 | }, [existingData, programList, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 267 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\hooks\useSubKegiatanFormLogic.js` | 349 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardHome.jsx` | 12 | import { useRequireDokumenTahun } from "../../../hooks/useRequireDokumenTahun.jsx"; | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\pages\DashboardHome.jsx` | 19 | const { isReady, GuardModal } = useRequireDokumenTahun(); // ✅ Gunakan hook ini | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\DashboardHome.jsx` | 38 | }, [isReady]); // ✅ Jalankan hanya setelah dokumen & tahun tersedia | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardHome.jsx` | 63 | periode diisi otomatis; dokumen tahunan memerlukan tahun. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardMonitoring.jsx` | 195 | <option value="tahun">Agregat tahunan (monitoring)</option> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\pages\DashboardMonitoring.jsx` | 208 | : timeType === "tahun" | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\pages\dashboardMonitoringRpjmd.jsx` | 92 | Realisasi: {r.nilai} – {r.tahun} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\dashboardMonitoringRpjmd.jsx` | 108 | Realisasi: {r.nilai} – {r.tahun} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 337 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 345 | if (p?.tahun_awal != null && p?.tahun_akhir != null) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 346 | return `${p.tahun_awal} – ${p.tahun_akhir}`; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 372 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 384 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 404 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 407 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 421 | params: { jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 433 | params: { jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 448 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 471 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 484 | if (dokumen && tahun && periode_id) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 487 | }, [dokumen, tahun, periode_id]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 501 | if (!dokumen \|\| !tahun) return <Navigate to="/" replace />; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\DashboardUtamaRpjmd.jsx` | 667 | RPJMD satu periode (lima tahun); tidak ada pemilihan tahun terpisah — konteks data mengikuti periode aktif | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 7 | import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 43 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 100 | !initialValues?.tahun \|\| | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 108 | tahun: initialValues.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 118 | initialValues?.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 124 | const { program_id, tahun, jenis_dokumen } = initialValues \|\| {}; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 125 | if (!program_id \|\| !tahun \|\| !jenis_dokumen) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanEditPage.jsx` | 127 | fetchIndikatorProgramOptions({ program_id, tahun, jenis_dokumen }) | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanList.jsx` | 14 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanList.jsx` | 17 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanList.jsx` | 23 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanList.jsx` | 41 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanList.jsx` | 45 | }, [dokumen, tahun, selectedProgramId]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 34 | <th colSpan={5}>Capaian Tahun Ke-</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 36 | <th colSpan={5}>Target Tahun Ke-</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 61 | <td>{item.capaian_tahun_1 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 62 | <td>{item.capaian_tahun_2 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 63 | <td>{item.capaian_tahun_3 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 64 | <td>{item.capaian_tahun_4 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 65 | <td>{item.capaian_tahun_5 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 67 | <td>{item.target_tahun_1 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 68 | <td>{item.target_tahun_2 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 69 | <td>{item.target_tahun_3 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 70 | <td>{item.target_tahun_4 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorKegiatanNestedView.jsx` | 71 | <td>{item.target_tahun_5 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramList.jsx` | 14 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\IndikatorProgramList.jsx` | 17 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramList.jsx` | 23 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramList.jsx` | 42 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramList.jsx` | 46 | }, [dokumen, tahun, selectedSasaranId]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 40 | Capaian Tahun Ke- | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 44 | Target Tahun Ke- | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 80 | <td>{item.capaian_tahun_1 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 81 | <td>{item.capaian_tahun_2 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 82 | <td>{item.capaian_tahun_3 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 83 | <td>{item.capaian_tahun_4 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 84 | <td>{item.capaian_tahun_5 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 88 | <td>{item.target_tahun_1 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 89 | <td>{item.target_tahun_2 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 90 | <td>{item.target_tahun_3 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 91 | <td>{item.target_tahun_4 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorProgramNestedView.jsx` | 92 | <td>{item.target_tahun_5 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranListPage.jsx` | 14 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranListPage.jsx` | 17 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranListPage.jsx` | 23 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranListPage.jsx` | 42 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranListPage.jsx` | 46 | }, [dokumen, tahun, selectedTujuanId]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 15 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 18 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 23 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 41 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 66 | Capaian Tahun Ke | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 70 | Target Tahun Ke | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 97 | <td key={`capaian_${index}`}>{item[`capaian_tahun_${index}`]}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorSasaranNestedView.jsx` | 101 | <td key={`target_${index}`}>{item[`target_tahun_${index}`]}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanListPage.jsx` | 13 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanListPage.jsx` | 17 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanListPage.jsx` | 23 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanListPage.jsx` | 40 | }, [dokumen, tahun, selectedMisiId, refetchToken]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanNestedView.jsx` | 64 | [1, 2, 3, 4, 5].map((i) => d[`capaian_tahun_${i}`]).join(", "), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanNestedView.jsx` | 66 | [1, 2, 3, 4, 5].map((i) => d[`target_tahun_${i}`]).join(", "), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanNestedView.jsx` | 117 | Capaian Tahun Ke | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanNestedView.jsx` | 121 | Target Tahun Ke | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanNestedView.jsx` | 149 | {item[`capaian_tahun_${i}`]} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\IndikatorTujuanNestedView.jsx` | 154 | <td key={`target_${i}`}>{item[`target_tahun_${i}`]}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 22 | const { dokumen, tahun: ctxTahun } = useDokumen(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 30 | const [year, setYear] = useState(() => new Date().getFullYear()); | STATE_PROP | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 36 | if (isDokumenLevelPeriode(dokumen) && periodeAktif?.tahun_awal != null) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 37 | setYear(Number(periodeAktif.tahun_awal)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 38 | } else if (ctxTahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 39 | const n = parseInt(String(ctxTahun), 10); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 40 | if (Number.isFinite(n)) setYear(n); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 42 | }, [dokumen, ctxTahun, periodeAktif]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 64 | const res = await api.get(`/laporan/rpjmd?opdId=${opdId}&tahun=${year}`); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 96 | `/laporan/rpjmd?opdId=${opdId}&tahun=${year}`, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 97 | `laporan_rpjmd_${opdId}_${year}.json` | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 100 | `/laporan/rpjmd/pdf?opdId=${opdId}&tahun=${year}`, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 101 | `laporan_rpjmd_${opdId}_${year}.pdf` | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 104 | `/laporan/rpjmd/excel?opdId=${opdId}&tahun=${year}`, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 105 | `laporan_rpjmd_${opdId}_${year}.xlsx` | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 225 | <Form.Group controlId="formYear"> | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 233 | isDokumenLevelPeriode(dokumen) && periodeAktif?.tahun_awal | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 234 | ? `${periodeAktif.tahun_awal}–${periodeAktif.tahun_akhir}` | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\pages\ReportRPJMDPage.jsx` | 235 | : String(year) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 76 | export async function fetchWizardHierarchyOptions({ jenis_dokumen, tahun }) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 77 | const defaultParams = { jenis_dokumen, tahun }; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 205 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 228 | /** GET /indikator-sasaran?sasaran_id=&tahun=&jenis_dokumen= */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 235 | /** GET /indikator-program?program_id=&tahun=&jenis_dokumen= */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 242 | /** GET /indikator-kegiatan?kegiatan_id=&tahun=&jenis_dokumen=&indikator_program_id= */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 398 | * @param {object} params - { sasaran_id, kegiatan_id, tahun, jenis_dokumen, ... } | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 409 | /** POST /api/tujuan — {rpjmd_id, misi_id, no_tujuan, isi_tujuan, jenis_dokumen, tahun} | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 415 | /** POST /api/strategi — {sasaran_id, deskripsi, jenis_dokumen, tahun} */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 420 | /** POST /api/arah-kebijakan — {strategi_id, deskripsi, jenis_dokumen, tahun} */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 425 | /** POST /api/sasaran — {nomor, isi_sasaran, tujuan_id, jenis_dokumen, tahun} */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 430 | /** POST /api/programs — minimal: {sasaran_id, nama_program, kode_program, tahun, jenis_dokumen, pagu_anggaran, opd_p... | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdApi.js` | 435 | /** POST /api/kegiatan — {program_id, nama_kegiatan, kode_kegiatan, tahun, jenis_dokumen, pagu_anggaran} */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 46 | target_tahun_1: d.target_tahun_1 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 47 | target_tahun_2: d.target_tahun_2 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 48 | target_tahun_3: d.target_tahun_3 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 49 | target_tahun_4: d.target_tahun_4 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 50 | target_tahun_5: d.target_tahun_5 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 51 | capaian_tahun_1: d.capaian_tahun_1 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 52 | capaian_tahun_2: d.capaian_tahun_2 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 53 | capaian_tahun_3: d.capaian_tahun_3 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 54 | capaian_tahun_4: d.capaian_tahun_4 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 55 | capaian_tahun_5: d.capaian_tahun_5 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 60 | tahun: d.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 86 | target_tahun_1: d.target_tahun_1 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 87 | target_tahun_2: d.target_tahun_2 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 88 | target_tahun_3: d.target_tahun_3 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 89 | target_tahun_4: d.target_tahun_4 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 90 | target_tahun_5: d.target_tahun_5 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 91 | capaian_tahun_1: d.capaian_tahun_1 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 92 | capaian_tahun_2: d.capaian_tahun_2 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 93 | capaian_tahun_3: d.capaian_tahun_3 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 94 | capaian_tahun_4: d.capaian_tahun_4 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 95 | capaian_tahun_5: d.capaian_tahun_5 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 100 | tahun: d.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 113 | tahun: d.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 139 | capaian_tahun_1: d.capaian_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 140 | capaian_tahun_2: d.capaian_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 141 | capaian_tahun_3: d.capaian_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 142 | capaian_tahun_4: d.capaian_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 143 | capaian_tahun_5: d.capaian_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 144 | target_tahun_1: d.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 145 | target_tahun_2: d.target_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 146 | target_tahun_3: d.target_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 147 | target_tahun_4: d.target_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 148 | target_tahun_5: d.target_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 188 | capaian_tahun_1: detail.capaian_tahun_1 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 189 | capaian_tahun_2: detail.capaian_tahun_2 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 190 | capaian_tahun_3: detail.capaian_tahun_3 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 191 | capaian_tahun_4: detail.capaian_tahun_4 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 192 | capaian_tahun_5: detail.capaian_tahun_5 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 193 | target_tahun_1: detail.target_tahun_1 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 194 | target_tahun_2: detail.target_tahun_2 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 195 | target_tahun_3: detail.target_tahun_3 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 196 | target_tahun_4: detail.target_tahun_4 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 197 | target_tahun_5: detail.target_tahun_5 \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.js` | 202 | tahun: detail.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdMapper.test.js` | 58 | tahun: 2025, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdPayload.js` | 58 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdPayload.test.js` | 71 | tahun: 2026, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\indikatorRpjmdPayload.test.js` | 83 | tahun: 2026, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\services\mockApi.js` | 18 | years: ["2020", "2021", "2022", "2023", "2024"], | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\utils\rpjmdIndicatorImportApply.js` | 5 | * - Nama indikator & target tahun ke-1…5 mengikuti kolom dokumen resmi (baseline akhir 2024 + target 2025–2029). | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\rpjmdIndicatorImportApply.js` | 6 | * - Capaian tahun 1 = baseline 2024 (kondisi awal / titik tolak kinerja menjelang tahun pertama RPJMD); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\rpjmdIndicatorImportApply.js` | 7 | *   capaian tahun 2–5 dikosongkan agar diisi dari realisasi pemantauan atau dari rangkaian historis tab 2.28 bila rel... | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\rpjmdIndicatorImportApply.js` | 23 | setFieldValue(`target_tahun_${i + 1}`, v != null ? String(v).trim() : ""); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\rpjmdIndicatorImportApply.js` | 25 | setFieldValue("capaian_tahun_1", bl != null ? String(bl).trim() : ""); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\rpjmdIndicatorImportApply.js` | 27 | setFieldValue(`capaian_tahun_${i}`, ""); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 1 | /** Opsi unik dari satu kolom tahun impor 2.28 (nilai string apa pun, seperti di PDF). */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 16 | /** Gabungan nilai unik dari kolom tahun_2021 … tahun_2024 (untuk capaian tahun 5 / baseline). */ | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 17 | export function unionYearColumnsOptions(rows) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 18 | const keys = ["tahun_2021", "tahun_2022", "tahun_2023", "tahun_2024"]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 46 | * rata-rata berbobot dengan bobot 1:2:3:4 (tahun terbarah lebih representatif sebagai kondisi akhir seri). | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 47 | * Jika sebagian kosong/non-angka, hanya memakai tahun yang valid dengan bobot proporsional. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 67 | * Proyeksi Capaian Tahun 5 dari tren Capaian T1–T4: regresi linear sederhana (x = 1…4), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 68 | * nilai di x = 5. Dipakai jika T5 kosong (mis. hanya empat tahun di impor 2.28). | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\features\rpjmd\utils\urusanKinerja228Picklists.js` | 70 | export function extrapolateCapaianTahun5FromFour(c1, c2, c3, c4) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 18 | import { getPeriodeIdFromTahun } from "./utils/periodeUtils"; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 32 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 37 | if (!daftarPeriode?.length \|\| !tahun) return null; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 38 | const pid = getPeriodeIdFromTahun(tahun, daftarPeriode); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 40 | }, [daftarPeriode, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 62 | params: { jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 68 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 73 | params: { jenis_dokumen: dokumen, tahun, tujuan_id }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 79 | [dokumen, tahun] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 85 | params: { jenis_dokumen: dokumen, tahun, sasaran_id }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 90 | [dokumen, tahun] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 102 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 117 | }, [data.strategi, dokumen, tahun, isEdit]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 156 | const tahunFinal = String(tahun); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 157 | const periode_id = getPeriodeIdFromTahun(tahun, daftarPeriode); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 169 | tahun: tahunFinal, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 210 | params: { jenis_dokumen: dokumen, tahun, tujuan_id: tujuan.id }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 214 | params: { jenis_dokumen: dokumen, tahun, sasaran_id: sasaran.id }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 228 | }, [isEdit, existingData, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanForm.jsx` | 280 | {konteksBannerRows(dokumen, tahun, periodeAktifBanner).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\ArahKebijakanList.jsx` | 39 | const { dokumen, tahun } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\ArahKebijakanList.jsx` | 77 | (p) => user?.tahun >= p.tahun_awal && user?.tahun <= p.tahun_akhir | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanList.jsx` | 84 | if (user?.tahun) checkPeriode(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanList.jsx` | 96 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanList.jsx` | 126 | }, [page, limit, search, dokumen, tahun, normalizedSearch]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ArahKebijakanList.jsx` | 209 | Tahun tidak termasuk periode RPJMD. Hubungi admin atau login ulang. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\arsip\IndikatorWizardForm.jsx` | 155 | tahun: user?.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\arsip\IndikatorWizardForm.jsx` | 191 | tahun: user?.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 11 | * 2. useEffect hanya re-run jika dokumen/tahun/ID record berubah (bukan periodeAktifId). | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 239 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\CascadingForm.jsx` | 261 | tahun: String(tahun \|\| ""), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 263 | }), [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 417 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 433 | }, [dokumen, tahun, existingData?.id ?? (isEditMode ? "edit" : null)]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 506 | payload.tahun = tahun; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 568 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingForm.jsx` | 573 | ? "Atur jenis dokumen di header. RPJMD/Renstra memakai satu periode (lima tahun); tidak perlu memilih tahun terpisah." | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\CascadingForm.jsx` | 574 | : "Silakan pilih dokumen dan tahun di header terlebih dahulu."} | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\CascadingForm.jsx` | 605 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\CascadingList.jsx` | 167 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\CascadingList.jsx` | 191 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingList.jsx` | 201 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingList.jsx` | 215 | }, [dokumen, tahun, page, pageSize, searchTerm]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingList.jsx` | 296 | XLSX.writeFile(wb, `cascading_${String(dokumen \|\| "").toUpperCase()}_${tahun}.xlsx`); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\CascadingList.jsx` | 329 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingList.jsx` | 334 | ? "Atur jenis dokumen di header. RPJMD/Renstra memakai periode lima tahun (acuan internal otomatis)." | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\CascadingList.jsx` | 335 | : "Silakan pilih dokumen dan tahun di header terlebih dahulu untuk melihat data cascading."} | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\CascadingList.jsx` | 357 | {isDokumenLevelPeriode(dokumen) && periodeAktif?.tahun_awal != null | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingList.jsx` | 358 | ? `Periode ${periodeAktif.tahun_awal}–${periodeAktif.tahun_akhir}` | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingList.jsx` | 359 | : tahun} | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\CascadingList.jsx` | 446 | filename={`cascading_${String(dokumen \|\| "").toUpperCase()}_${tahun}.csv`} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\CascadingList.jsx` | 485 | <p>Belum ada data cascading untuk {String(dokumen \|\| "").toUpperCase()} tahun {tahun}.</p> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\CascadingNestedView.jsx` | 289 | : "Belum ada data cascading untuk dokumen dan tahun ini."} | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\constants\indikatorFields.js` | 17 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\constants\indikatorFields.js` | 18 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\constants\indikatorFields.js` | 19 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\constants\indikatorFields.js` | 20 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\constants\indikatorFields.js` | 21 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 28 | export default function GlobalDokumenTahunPicker() { | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 29 | const { dokumen, tahun, setDokumen, setTahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 35 | const [localThn, setLocalThn] = useState(tahun \|\| ""); | STATE_PROP | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 66 | if (pick?.tahun_awal != null) thn = String(pick.tahun_awal); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 74 | setTahun(thn); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 85 | if (submitting && dokumen?.toLowerCase() === dok && tahun === thn) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 89 | }, [dokumen, tahun, submitting, localDok, localThn, navigate]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPicker.jsx` | 125 | <option value="">Tahun</option> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 1 | // src/shared/components/GlobalDokumenTahunPickerModal.jsx | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 29 | const tahunList = ["2025", "2026", "2027", "2028", "2029"]; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 31 | export default function GlobalDokumenTahunPickerModal({ forceOpen }) { | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 32 | const { dokumen, tahun, setDokumen, setTahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 46 | const needsYear = dokLower && !periodeLevel; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 48 | forceOpen \|\| !dokumen \|\| (needsYear && !tahun); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 54 | if (!tahun && user?.tahun && !periodeLevel) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 55 | setTahun(String(user.tahun)); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 59 | setLocalThn(tahun \|\| String(user?.tahun \|\| "")); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 61 | }, [dokumen, tahun, forceOpen, user, setDokumen, setTahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 99 | const thn = tahun; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 107 | }, [dokumen, tahun, shouldRedirect, localDok, localThn]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 130 | if (pick?.tahun_awal != null) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 131 | thn = String(pick.tahun_awal); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 140 | setTahun(thn); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 152 | : "Pilih Dokumen & Tahun"} | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 177 | RPJMD dan Renstra berlaku untuk satu periode lima tahun. Parameter | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 178 | internal mengikuti tahun awal periode aktif Anda — tidak ada | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 179 | pemilihan tahun terpisah. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 183 | <Form.Label>Tahun</Form.Label> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 189 | <option value="">Pilih Tahun...</option> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\GlobalDokumenTahunPickerModal.jsx` | 190 | {tahunList.map((th) => ( | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 1 | // src/shared/hooks/useAutoIsiTahunDanTarget.js | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 5 | export default function useAutoIsiTahunDanTarget(values, setFieldValue) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 6 | const { tahun_awal, tahun_akhir } = usePeriode(); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 9 | if (tahun_awal && !values.tahun_awal) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 10 | setFieldValue("tahun_awal", tahun_awal); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 12 | if (tahun_akhir && !values.tahun_akhir) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 13 | setFieldValue("tahun_akhir", tahun_akhir); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 15 | }, [tahun_awal, tahun_akhir, values.tahun_awal, values.tahun_akhir]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 18 | if (values.target_tahun_1 && !values.target_awal) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 19 | setFieldValue("target_awal", values.target_tahun_1); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 21 | if (values.target_tahun_5 && !values.target_akhir) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 22 | setFieldValue("target_akhir", values.target_tahun_5); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 25 | values.target_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useAutoIsiTahunDanTarget.js` | 26 | values.target_tahun_5, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorBuilder.js` | 9 | const getTargetTahunValues = (values) => | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorBuilder.js` | 11 | const key = `target_tahun_${i}`; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorBuilder.js` | 35 | tahun_awal: values.tahun_awal \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorBuilder.js` | 36 | tahun_akhir: values.tahun_akhir \|\| "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorBuilder.js` | 39 | ...getTargetTahunValues(values), | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\hooks\useIndikatorBuilder.js` | 55 | ...[1, 2, 3, 4, 5].map((i) => `target_tahun_${i}`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 142 | name: `capaian_tahun_${i}`, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 143 | label: `Capaian Tahun ${i}`, | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 144 | tooltip: `Capaian aktual untuk tahun ke-${i}.`, | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 154 | name: `target_tahun_${i}`, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 155 | label: `Target Tahun ${i}`, | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 156 | tooltip: `Target indikator untuk tahun ke-${i}.`, | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 173 | name: "tahun_awal", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 174 | label: "Tahun Awal", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 175 | tooltip: "Tahun awal dari Periode RPJMD", | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 179 | name: "tahun_akhir", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 180 | label: "Tahun Akhir", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 181 | tooltip: "Tahun akhir dari Periode RPJMD", | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 187 | tooltip: "Otomatis dari target tahun 1", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\hooks\useIndikatorFields.js` | 193 | tooltip: "Otomatis dari target tahun 5", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorKhususListPage.jsx` | 14 | * anggap respons belum menormalisasi FK — tampilkan semua (sesuai tahun/dokumen dari API). | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususListPage.jsx` | 38 | const { tahun, dokumen } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorKhususListPage.jsx` | 69 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususListPage.jsx` | 107 | }, [selectedMisi, tahun, dokumen]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 31 | "Capaian Tahun I", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 36 | "Target Tahun I", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 45 | row.capaian_tahun_1 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 46 | row.capaian_tahun_2 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 47 | row.capaian_tahun_3 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 48 | row.capaian_tahun_4 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 49 | row.capaian_tahun_5 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 50 | row.target_tahun_1 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 51 | row.target_tahun_2 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 52 | row.target_tahun_3 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 53 | row.target_tahun_4 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 54 | row.target_tahun_5 ?? "-", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 93 | Capaian Tahun Ke | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 96 | Target/Proyeksi Tahun Ke | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 118 | <td>{row.capaian_tahun_1 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 119 | <td>{row.capaian_tahun_2 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 120 | <td>{row.capaian_tahun_3 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 121 | <td>{row.capaian_tahun_4 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 122 | <td>{row.capaian_tahun_5 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 123 | <td>{row.target_tahun_1 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 124 | <td>{row.target_tahun_2 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 125 | <td>{row.target_tahun_3 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 126 | <td>{row.target_tahun_4 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorKhususNestedView.jsx` | 127 | <td>{row.target_tahun_5 ?? "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 93 | { header: "Target Tahun I", key: "target_tahun_1" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 94 | { header: "Target Tahun II", key: "target_tahun_2" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 95 | { header: "Target Tahun III", key: "target_tahun_3" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 96 | { header: "Target Tahun IV", key: "target_tahun_4" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 97 | { header: "Target Tahun V", key: "target_tahun_5" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 98 | { header: "Capaian Tahun I", key: "capaian_tahun_1" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 99 | { header: "Capaian Tahun II", key: "capaian_tahun_2" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 100 | { header: "Capaian Tahun III", key: "capaian_tahun_3" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 101 | { header: "Capaian Tahun IV", key: "capaian_tahun_4" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 102 | { header: "Capaian Tahun V", key: "capaian_tahun_5" }, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 117 | { header: "Tahun", key: "tahun" }, | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorList.jsx` | 168 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorList.jsx` | 193 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 197 | : "Tahun dan jenis dokumen belum dipilih. Atur konteks dokumen di header lalu muat ulang halaman ini.", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorList.jsx` | 213 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 237 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 243 | if (!typeObj \|\| !dokumen \|\| !tahun) return []; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 256 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 269 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 304 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 306 | "Tahun dan jenis dokumen wajib dipilih sebelum mengekspor data." | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorList.jsx` | 321 | `${selectedType}-indikator-${docLabel}-${tahun}.xlsx` | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorList.jsx` | 494 | {scalarCell(i[`capaian_tahun_${n}`])} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorList.jsx` | 499 | {scalarCell(i[`target_tahun_${n}`])} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorPreviewTable.jsx` | 17 | <th key={i}>{`Tahun ${i}`}</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorPreviewTable.jsx` | 19 | <th>Tahun Awal</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorPreviewTable.jsx` | 20 | <th>Tahun Akhir</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorPreviewTable.jsx` | 46 | <td key={j}>{item[`target_tahun_${j}`]}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorPreviewTable.jsx` | 48 | <td>{item.tahun_awal}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorPreviewTable.jsx` | 49 | <td>{item.tahun_akhir}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 332 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 337 | const wizardKonteksLine = konteksBannerRows(dokumen, tahun, periodeAktif) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 425 | if (tahun)    params.tahun         = tahun; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 450 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 451 | fetchWizardHierarchyOptions({ jenis_dokumen: dokumen, tahun }) | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 464 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 471 | const res = await fetchTujuan({ jenis_dokumen: dokumen, tahun }); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 489 | [currentStep, dokumen, options.tujuan.length, tahun] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 512 | target_tahun_1: "", target_tahun_2: "", target_tahun_3: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 513 | target_tahun_4: "", target_tahun_5: "", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorRPJMDForm.jsx` | 655 | tahun={tahun} | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 10 | unionYearColumnsOptions, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 13 | extrapolateCapaianTahun5FromFour, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 18 | const URU_TAHUN_COL_BY_CAPAIAN = { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 19 | capaian_tahun_1: "tahun_2021", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 20 | capaian_tahun_2: "tahun_2022", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 21 | capaian_tahun_3: "tahun_2023", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 22 | capaian_tahun_4: "tahun_2024", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 80 | const unionYearOpts = useMemo( | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 81 | () => unionYearColumnsOptions(urusanKinerja228), | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 88 | values.capaian_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 89 | values.capaian_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 90 | values.capaian_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 91 | values.capaian_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 99 | values.capaian_tahun_5 == null \|\| String(values.capaian_tahun_5).trim() === ""; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 101 | const cap5 = extrapolateCapaianTahun5FromFour( | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 102 | values.capaian_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 103 | values.capaian_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 104 | values.capaian_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 105 | values.capaian_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 107 | if (cap5) setFieldValue("capaian_tahun_5", cap5); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 112 | values.capaian_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 113 | values.capaian_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 114 | values.capaian_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 115 | values.capaian_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 212 | const yearKeys = ["tahun_2021", "tahun_2022", "tahun_2023", "tahun_2024"]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 213 | yearKeys.forEach((yk, idx) => { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 216 | `capaian_tahun_${idx + 1}`, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 221 | row.tahun_2021, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 222 | row.tahun_2022, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 223 | row.tahun_2023, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 224 | row.tahun_2024, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 227 | const autoCap5 = extrapolateCapaianTahun5FromFour( | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 228 | row.tahun_2021, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 229 | row.tahun_2022, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 230 | row.tahun_2023, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 231 | row.tahun_2024, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 233 | if (autoCap5) setFieldValue("capaian_tahun_5", autoCap5); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 235 | setFieldValue(`target_tahun_${ti}`, ""); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 252 | per urusan; baseline/capaian dapat dihitung ulang dari empat tahun tersebut. Pilih sumber yang sesuai | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 263 | const uruCol = URU_TAHUN_COL_BY_CAPAIAN[field.name]; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 293 | placeholder={`Pilih dari impor (${uruCol.replace("tahun_", "")})`} | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 298 | Opsi dari kolom tahun impor 2.28 yang sesuai. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 308 | field.name === "capaian_tahun_5" && | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 312 | const opts = optionsWithCurrentValue(unionYearOpts, values[field.name]); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 359 | Otomatis: rata-rata berbobot <strong>1&nbsp;: 2&nbsp;: 3&nbsp;: 4</strong> pada Capaian Tahun 1–4 (tahun | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 453 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 454 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 455 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 456 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 457 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 458 | "capaian_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 459 | "capaian_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 460 | "capaian_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 461 | "capaian_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\IndikatorTabContent.jsx` | 462 | "capaian_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\KegiatanForm.jsx` | 50 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\KegiatanForm.jsx` | 104 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\KegiatanForm.jsx` | 175 | name="tahun" | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\KegiatanForm.jsx` | 176 | value={kegiatanData.tahun \|\| ""} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\KegiatanList.jsx` | 23 | const { id: periodeId, loading: periodeLoading, tahun_awal } = usePeriode(); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\KegiatanList.jsx` | 35 | if (!periodeId \|\| !tahun_awal) return; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\KegiatanList.jsx` | 41 | tahun: tahun_awal, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\KegiatanList.jsx` | 52 | }, [periodeId, tahun_awal]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 26 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\MisiForm.jsx` | 50 | if (!dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 55 | params: { jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 67 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 70 | if (!dokumen \|\| !tahun \|\| !user?.periode_id) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 75 | api.get("/visi", { params: { jenis_dokumen: dokumen, tahun } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 76 | api.get("/misi", { params: { jenis_dokumen: dokumen, tahun } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 87 | }, [dokumen, tahun, user?.periode_id]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 133 | tahun: tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 151 | params: { jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 179 | params: { jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MisiForm.jsx` | 204 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\MuiSidebarGlobal.jsx` | 73 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\MuiSidebarGlobal.jsx` | 74 | const locked = !dokumen \|\| !tahun; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\MuiSidebarGlobal.jsx` | 111 | : "Silakan pilih jenis dokumen dan tahun di header dahulu" | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\MuiTopbarGlobal.jsx` | 7 | import GlobalDokumenTahunPicker from "./GlobalDokumenTahunPicker"; | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\MuiTopbarGlobal.jsx` | 8 | import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal"; | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\MuiTopbarGlobal.jsx` | 27 | {/* Left: Dokumen/Tahun Picker */} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\MuiTopbarGlobal.jsx` | 28 | <GlobalDokumenTahunPicker /> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\MuiTopbarGlobal.jsx` | 30 | {/* Right: Modal trigger (Ganti Dokumen/Tahun), avatar, dsb */} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\MuiTopbarGlobal.jsx` | 32 | <GlobalDokumenTahunPickerModal /> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\PrioritasDaerahForm.jsx` | 22 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasDaerahForm.jsx` | 104 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasDaerahForm.jsx` | 145 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasDaerahList.jsx` | 22 | const { dokumen, tahun, loading: periodeLoading } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasDaerahList.jsx` | 36 | if (periodeLoading \|\| !dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasDaerahList.jsx` | 43 | params: { page: 1, limit: 1000, jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasDaerahList.jsx` | 69 | }, [filtered, page, dokumen, tahun, periodeLoading]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasGubernurForm.jsx` | 36 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasGubernurForm.jsx` | 164 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasGubernurForm.jsx` | 203 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasGubernurList.jsx` | 29 | const { dokumen, tahun, loading: periodeLoading } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasGubernurList.jsx` | 49 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasGubernurList.jsx` | 50 | setError("Dokumen dan tahun belum dipilih."); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\PrioritasGubernurList.jsx` | 59 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasGubernurList.jsx` | 75 | }, [reloadKey, dokumen, tahun, periodeLoading]); // Fetch ulang ketika reloadKey berubah | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasNasionalForm.jsx` | 20 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasNasionalForm.jsx` | 68 | const payload = { ...formData, dokumen, tahun }; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasNasionalForm.jsx` | 109 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasNasionalList.jsx` | 33 | const { dokumen, tahun, loading: periodeLoading } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\PrioritasNasionalList.jsx` | 53 | if (periodeLoading \|\| !dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasNasionalList.jsx` | 64 | tahun: tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasNasionalList.jsx` | 73 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\PrioritasNasionalList.jsx` | 87 | }, [page, pageSize, searchTerm, dokumen, tahun, periodeLoading]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasEdit.jsx` | 22 | const { loading: periodeLoading, tahun_awal } = usePeriode(); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasEdit.jsx` | 62 | tahun_awal | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasForm.jsx` | 28 | tahun_awal, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasForm.jsx` | 29 | tahun_akhir, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasForm.jsx` | 65 | } = useProgramFormLogic(existingData, onSubmitSuccess, tahun_awal); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasList.jsx` | 36 | const { id: periode_id, loading: periodeLoading, tahun_awal } = usePeriode(); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasList.jsx` | 55 | if (!periode_id \|\| !dokumen \|\| !tahun_awal) return; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasList.jsx` | 64 | tahun: tahun_awal, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\ProgramPrioritasList.jsx` | 111 | tahun_awal, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 4 | import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal"; | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 10 | * sebelum user memilih dokumen & tahun (tahun tidak wajib dipilih manual untuk RPJMD/Renstra). | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 12 | export default function RequireDokumenTahun({ children }) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 13 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 26 | <GlobalDokumenTahunPickerModal forceOpen /> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 32 | if (!tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 46 | <GlobalDokumenTahunPickerModal forceOpen /> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 53 | if (!tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\RequireDokumenTahun.jsx` | 63 | <GlobalDokumenTahunPickerModal forceOpen /> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\RPJMDList.jsx` | 101 | <th>Tahun Penetapan</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\RPJMDList.jsx` | 114 | <td>{item.tahun_penetapan}</td> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\RpjmdMetadataForm.jsx` | 10 | tahun_penetapan: "", | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\RpjmdMetadataForm.jsx` | 33 | tahun_penetapan: data.tahun_penetapan ?? "", | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\RpjmdMetadataForm.jsx` | 99 | <Form.Label>Tahun Penetapan</Form.Label> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\RpjmdMetadataForm.jsx` | 101 | name="tahun_penetapan" | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\RpjmdMetadataForm.jsx` | 102 | value={form.tahun_penetapan} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranForm.jsx` | 28 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 54 | tahun: "", | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 65 | !tahun \|\| | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 76 | api.get("/rpjmd", { params: { jenis_dokumen: dokumen, tahun } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 80 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 116 | tahun: existingData.tahun \|\| tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 130 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 146 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 156 | const tahunFromForm = formData.tahun; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 166 | !tahunFromForm | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranForm.jsx` | 186 | tahun: tahunFromForm, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 233 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 248 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 274 | if (!dokumen \|\| !tahun \|\| !currentPeriodeId) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranForm.jsx` | 310 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranList.jsx` | 65 | const { dokumen, tahun, periode_id, periodeList } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranList.jsx` | 88 | const tahunJudul = tahun \|\| dokumen?.tahun \|\| new Date().getFullYear(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 124 | filename: `sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}.csv`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranList.jsx` | 136 | isDokumenLevelPeriode(dokumen) && periodeAktif?.tahun_awal != null | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 137 | ? `PERIODE ${periodeAktif.tahun_awal}–${periodeAktif.tahun_akhir}` | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 138 | : `TAHUN ${tahunJudul}`; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranList.jsx` | 155 | Number(user?.tahun) >= Number(p.tahun_awal) && | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 156 | Number(user?.tahun) <= Number(p.tahun_akhir) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 164 | if (user?.tahun) fetchPeriode(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 179 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 218 | }, [page, limit, searchQuery, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SasaranList.jsx` | 282 | filename: `sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}.xlsx`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranList.jsx` | 292 | filename: `sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}.pdf`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SasaranList.jsx` | 369 | filename={`sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}`} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SidebarMenu.jsx` | 71 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SidebarMenu.jsx` | 76 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SidebarMenu.jsx` | 79 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 20 | import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 41 | const { periode_id, tahun } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 47 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 51 | if (tahun && !values.tahun) setFieldValue("tahun", tahun); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 54 | }, [periode_id, tahun, user, values, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 67 | if (!values.arah_kebijakan_id \|\| !values.jenis_dokumen \|\| !values.tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 89 | if (!values.strategi_id \|\| !values.tahun \|\| !values.jenis_dokumen) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 96 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 135 | [values.strategi_id, values.tahun, values.jenis_dokumen, setFieldValue] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 156 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 178 | }, [values.arah_kebijakan_id, values.tahun, values.jenis_dokumen, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 189 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 256 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ArahKebijakanStep.jsx` | 281 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 212 | {/* Target per Tahun */} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 213 | <Form.Label>Target Tiap Tahun</Form.Label> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 219 | placeholder={`Tahun ${i}`} | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 220 | name={`target_tahun_${i}`} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 221 | value={form[`target_tahun_${i}`]} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 224 | isInvalid={!!formErrors[`target_tahun_${i}`]} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 229 | {formErrors.target_tahun_1 \|\| | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 230 | formErrors.target_tahun_2 \|\| | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 231 | formErrors.target_tahun_3 \|\| | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 232 | formErrors.target_tahun_4 \|\| | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\IndikatorStep.jsx` | 233 | formErrors.target_tahun_5} | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 20 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 34 | if (!tujuanId \|\| !dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 44 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 56 | [setFieldValue, dokumen, tahun] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 78 | if (!programId \|\| !dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 83 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 97 | [setFieldValue, dokumen, tahun] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 102 | if (!kegiatanId \|\| !dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 107 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 121 | [setFieldValue, dokumen, tahun] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useIndikatorStepEffects.js` | 173 | /* Step Tujuan: baseline diisi otomatis dari capaian T1–T4 (impor 2.28), bukan dari capaian tahun 5. */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 9 | import { extrapolateCapaianTahun5FromFour } from "@/features/rpjmd/utils/urusanKinerja228Picklists"; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 22 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 30 | if (!tahun \|\| !periode_id) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 33 | text: "Periode atau tahun belum tersedia.", | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 49 | const cap5Raw = valuesToUse.capaian_tahun_5; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 51 | const projected = extrapolateCapaianTahun5FromFour( | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 52 | valuesToUse.capaian_tahun_1, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 53 | valuesToUse.capaian_tahun_2, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 54 | valuesToUse.capaian_tahun_3, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 55 | valuesToUse.capaian_tahun_4, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 57 | if (projected) valuesToUse.capaian_tahun_5 = projected; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 61 | const valCapaian = valuesToUse[`capaian_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 62 | const valTarget = valuesToUse[`target_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 67 | text: `Capaian Tahun ${i} harus berupa angka yang valid.`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 75 | text: `Target Tahun ${i} harus berupa angka yang valid.`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 83 | normalizedValues[`capaian_tahun_${i}`] = normalizeNumber( | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 84 | valuesToUse[`capaian_tahun_${i}`] | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 86 | normalizedValues[`target_tahun_${i}`] = normalizeNumber( | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 87 | valuesToUse[`target_tahun_${i}`] | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateAddAndAi.js` | 120 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 20 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 61 | if (stepKey !== "kegiatan" \|\| !programId \|\| !dokumen \|\| !tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 68 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 84 | }, [stepKey, programId, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 113 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 125 | if (dokumen && tahun) fetchTujuan(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 127 | }, [stepKey, options?.tujuan, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 135 | ...(tahun != null && tahun !== "" ? { tahun } : {}), | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\indikatorStep\useStepTemplateData.js` | 172 | }, [tahun, dokumen, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 11 | import useAutoIsiTahunDanTarget from "../../components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 48 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 95 | const { program_id, tahun, jenis_dokumen } = values; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 96 | if (!program_id \|\| !tahun \|\| !jenis_dokumen) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 101 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 121 | }, [restored, values.program_id, values.tahun, values.jenis_dokumen]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 132 | if (!values.tahun \|\| !values.jenis_dokumen) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 141 | tahun: String(values.tahun), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 187 | values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\KegiatanStep.jsx` | 243 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 13 | import useAutoIsiTahunDanTarget from "../../components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 58 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 81 | if (!values.program_id \|\| !values.jenis_dokumen \|\| !values.tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 92 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 100 | String(prev.tahun ?? "") !== String(snap.tahun ?? "")) | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 106 | }, [values.arah_kebijakan_id, values.periode_id, values.tahun, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 112 | !values.tahun \|\| | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 122 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 185 | values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 227 | if (!values.program_id \|\| !values.tahun \|\| !values.jenis_dokumen) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 235 | tahun: String(values.tahun), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 267 | }, [values.program_id, values.tahun, values.jenis_dokumen, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 325 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ProgramStep.jsx` | 342 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ReadOnlyIndikatorPreview.jsx` | 58 | <th>{`Target Tahun ${i}`}</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\ReadOnlyIndikatorPreview.jsx` | 59 | <td>{data[`target_tahun_${i}`]}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ReadOnlyIndikatorPreview.jsx` | 64 | <th>{`Capaian Tahun ${i}`}</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\ReadOnlyIndikatorPreview.jsx` | 65 | <td>{data[`capaian_tahun_${i}`] \|\| "-"}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ReusableStepTemplate.jsx` | 68 | [`target_tahun_${i}`]: values[`target_tahun_${i}`] | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ReusableStepTemplate.jsx` | 69 | ? `${values[`target_tahun_${i}`]} ${unit}` | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ReusableStepTemplate.jsx` | 90 | ...[1, 2, 3, 4, 5].map((i) => `target_tahun_${i}`), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\ReusableStepTemplate.jsx` | 186 | <th key={i}>{`Tahun ${i}`}</th> | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\ReusableStepTemplate.jsx` | 198 | <td key={j}>{item[`target_tahun_${j}`]}</td> | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 19 | import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 50 | const { periode_id, tahun } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 53 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 60 | if (tahun) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 61 | if (!values.tahun) setFieldValue("tahun", tahun); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 62 | if (!values.tahun_awal) setFieldValue("tahun_awal", tahun); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 68 | }, [periode_id, tahun, user, values, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 95 | }, [values.tujuan_id, values.periode_id, values.tahun, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 102 | !values.tahun \|\| | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 113 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 151 | values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 175 | if (values.capaian_tahun_5) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 176 | setFieldValue("baseline", values.capaian_tahun_5); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 178 | }, [values.capaian_tahun_5, setFieldValue]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 186 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 210 | values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 254 | tahun: values.tahun \|\| tahun \|\| "", | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 269 | target_tahun_1: getValue("target_tahun_1"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 270 | target_tahun_2: getValue("target_tahun_2"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 271 | target_tahun_3: getValue("target_tahun_3"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 272 | target_tahun_4: getValue("target_tahun_4"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 273 | target_tahun_5: getValue("target_tahun_5"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 274 | capaian_tahun_1: getValue("capaian_tahun_1"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 275 | capaian_tahun_2: getValue("capaian_tahun_2"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 276 | capaian_tahun_3: getValue("capaian_tahun_3"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 277 | capaian_tahun_4: getValue("capaian_tahun_4"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 278 | capaian_tahun_5: getValue("capaian_tahun_5"), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 297 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 337 | if (!values.periode_id \|\| !values.tahun \|\| !values.jenis_dokumen) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 338 | toast.error("Periode, tahun, atau jenis dokumen belum lengkap."); | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 349 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SasaranStep.jsx` | 370 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StepTemplate.jsx` | 44 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StepTemplate.jsx` | 108 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StepTemplate.jsx` | 148 | const [debouncedCapaian5] = useDebounce(values.capaian_tahun_5, 500); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StepTemplate.jsx` | 156 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StepTemplate.jsx` | 180 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StepTemplate.jsx` | 199 | <strong>nama indikator, baseline akhir 2024, target Tahun 1–5</strong> (2025–2029).{" "} | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 20 | import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 41 | const { periode_id, tahun } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 47 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 51 | if (tahun && !values.tahun) setFieldValue("tahun", tahun); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 54 | }, [periode_id, tahun, user, values, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 67 | if (!values.strategi_id \|\| !values.jenis_dokumen \|\| !values.tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 89 | if (!values.sasaran_id \|\| !values.tahun \|\| !values.jenis_dokumen) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 96 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 135 | [values.sasaran_id, values.tahun, values.jenis_dokumen, setFieldValue] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 156 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 178 | }, [values.strategi_id, values.tahun, values.jenis_dokumen, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 189 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 250 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\StrategiStep.jsx` | 273 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SubKegiatanStep.jsx` | 22 | import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SubKegiatanStep.jsx` | 37 | const { periode_id, tahun } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\SubKegiatanStep.jsx` | 40 | useAutoIsiTahunDanTarget(values, setFieldValue); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SubKegiatanStep.jsx` | 63 | if (!restored \|\| !values.kegiatan_id \|\| !values.tahun \|\| !values.jenis_dokumen) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SubKegiatanStep.jsx` | 71 | tahun:         values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\SubKegiatanStep.jsx` | 104 | }, [restored, values.kegiatan_id, values.tahun, values.jenis_dokumen, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 62 | const { periode_id, tahun, loading: loadingPeriode } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 77 | if (tahun && values.tahun !== tahun) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 78 | setFieldValue("tahun", tahun); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 87 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 90 | values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 110 | if (!values.misi_id \|\| !values.jenis_dokumen \|\| !values.tahun) return; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 121 | }, [values.misi_id, values.periode_id, values.tahun, setFieldValue]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 128 | tahun: thn, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 138 | tahun: Number(thn), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 180 | values.tahun && | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 194 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 200 | values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 215 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 224 | [setFieldValue, values.tahun, values.jenis_dokumen] | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 296 | if (!values.tahun \|\| !values.jenis_dokumen) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 297 | toast.error("Tahun atau jenis dokumen belum terisi."); | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 309 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 323 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 361 | if (!values.periode_id \|\| !values.tahun \|\| !values.jenis_dokumen) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 362 | toast.error("Periode, tahun, atau jenis dokumen belum lengkap."); | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 373 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\TujuanStep.jsx` | 392 | tahun: values.tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 20 | "capaian_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 21 | "capaian_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 22 | "capaian_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 23 | "capaian_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 24 | "capaian_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 25 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 26 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 27 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 28 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 29 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 194 | "capaian_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 195 | "capaian_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 196 | "capaian_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 197 | "capaian_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 198 | "capaian_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 199 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 200 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 201 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 202 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 203 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 206 | "tahun_awal", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 207 | "tahun_akhir", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 214 | "tahun", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 291 | "capaian_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 292 | "capaian_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 293 | "capaian_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 294 | "capaian_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 295 | "capaian_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 296 | "target_tahun_1", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 297 | "target_tahun_2", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 298 | "target_tahun_3", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 299 | "target_tahun_4", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 300 | "target_tahun_5", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 303 | "tahun_awal", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 304 | "tahun_akhir", | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 311 | "tahun", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 397 | if ("tahun_awal" in merged && merged.tahun_awal != null && merged.tahun_awal !== "") { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 398 | setFieldValue("tahun_awal", Number(merged.tahun_awal)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 400 | if ("tahun_akhir" in merged && merged.tahun_akhir != null && merged.tahun_akhir !== "") { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\steps\wizardIndikatorStepUtils.js` | 401 | setFieldValue("tahun_akhir", Number(merged.tahun_akhir)); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 25 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 45 | tahun: "", | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 56 | !tahun \|\| | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 68 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 75 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 88 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 99 | }, [authLoading, periodeAktifLoading, dokumen, tahun, currentPeriodeId]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 120 | tahun: existingData.tahun \|\| tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 145 | const { sasaran_id, jenis_dokumen, tahun } = formData; | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\StrategiForm.jsx` | 146 | if (!sasaran_id \|\| !jenis_dokumen \|\| !tahun \|\| isEdit) return; // 👈 Tambahan isEdit | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 150 | params: { sasaran_id, jenis_dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 162 | }, [formData.sasaran_id, formData.jenis_dokumen, formData.tahun, isEdit]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiForm.jsx` | 202 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 39 | const { dokumen, tahun } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\StrategiList.jsx` | 74 | Number(user?.tahun) >= Number(p.tahun_awal) && | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 75 | Number(user?.tahun) <= Number(p.tahun_akhir) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 83 | if (user?.tahun) fetchPeriode(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 91 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 98 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 101 | if (dokumen && tahun) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\StrategiList.jsx` | 110 | params: { page, limit, search, jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 125 | }, [page, limit, search, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\StrategiList.jsx` | 227 | Tahun login tidak sesuai dengan periode RPJMD. Silakan login ulang | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\SubKegiatanForm.jsx` | 28 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SubKegiatanForm.jsx` | 112 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\SubKegiatanList.jsx` | 31 | const { id: periodeId, loading: periodeLoading, tahun_awal } = usePeriode(); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\SubKegiatanList.jsx` | 49 | if (!periodeId \|\| !tahun_awal) return; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\SubKegiatanList.jsx` | 55 | tahun: tahun_awal, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\SubKegiatanList.jsx` | 101 | }, [periodeId, tahun_awal, page, limit, kegiatanId]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\TablerTopbarGlobal.jsx` | 4 | import GlobalDokumenTahunPicker from "./GlobalDokumenTahunPicker"; | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\TablerTopbarGlobal.jsx` | 5 | import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal"; | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\TablerTopbarGlobal.jsx` | 23 | <GlobalDokumenTahunPicker /> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\TablerTopbarGlobal.jsx` | 24 | <GlobalDokumenTahunPickerModal /> | UI_FILTER | HARUS DIHAPUS | PATCH SEKARANG |
| `frontend\src\shared\components\TujuanForm.jsx` | 80 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\TujuanForm.jsx` | 101 | if (!dokumen \|\| !tahun) return; // ⛔️ hindari fetch sebelum dokumen/tahun tersedia | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanForm.jsx` | 106 | api.get("/rpjmd", { params: { jenis_dokumen: dokumen, tahun } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanForm.jsx` | 107 | api.get("/misi", { params: { jenis_dokumen: dokumen, tahun } }), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanForm.jsx` | 144 | }, [initialData, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanForm.jsx` | 161 | params: { misi_id: selectedMisiId, jenis_dokumen: dokumen, tahun }, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanForm.jsx` | 203 | if (!dokumen \|\| !tahun) { | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanForm.jsx` | 215 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanForm.jsx` | 265 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\TujuanList.jsx` | 56 | const { dokumen, tahun } = usePeriodeAktif(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\TujuanList.jsx` | 91 | Number(user?.tahun) >= Number(p.tahun_awal) && | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanList.jsx` | 92 | Number(user?.tahun) <= Number(p.tahun_akhir) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanList.jsx` | 100 | if (user?.tahun) fetchPeriode(); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanList.jsx` | 109 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanList.jsx` | 149 | }, [page, limit, searchQuery, dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanList.jsx` | 218 | ["", `DAFTAR TUJUAN RPJMD TAHUN ${tahun}`], | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanList.jsx` | 244 | doc.text(`DAFTAR TUJUAN RPJMD TAHUN ${tahun}`, 14, 15); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\TujuanList.jsx` | 274 | Tahun periode login tidak sesuai. Silakan hubungi admin atau login | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\TujuanList.jsx` | 275 | ulang dengan tahun RPJMD yang aktif. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\generatePayloadRenstraTabelKegiatan.js` | 18 | // Konversi target & pagu per tahun | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\generatePayloadRenstraTabelKegiatan.js` | 20 | const target = parseNumber(payload[`target_tahun_${i}`]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\generatePayloadRenstraTabelKegiatan.js` | 21 | const pagu = parseNumber(payload[`pagu_tahun_${i}`]); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\generatePayloadRenstraTabelKegiatan.js` | 23 | if (!target.equals(0)) payload[`target_tahun_${i}`] = target.toNumber(); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\generatePayloadRenstraTabelKegiatan.js` | 24 | else delete payload[`target_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\generatePayloadRenstraTabelKegiatan.js` | 26 | if (!pagu.equals(0)) payload[`pagu_tahun_${i}`] = pagu.toNumber(); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\generatePayloadRenstraTabelKegiatan.js` | 27 | else delete payload[`pagu_tahun_${i}`]; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\groupWarnings.js` | 15 | const match = String(msg).match(/Tahun\s*(\d+)/i); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\groupWarnings.js` | 16 | const year = match ? match[1] : "Lainnya"; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\groupWarnings.js` | 17 | if (!grouped[year]) grouped[year] = []; | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\groupWarnings.js` | 18 | grouped[year].push(String(msg)); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\periodeUtils.js` | 2 | export const getPeriodeIdFromTahun = (tahun, periodeList) => { | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\utils\periodeUtils.js` | 5 | Number(tahun) >= Number(periode.tahun_awal) && | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\periodeUtils.js` | 6 | Number(tahun) <= Number(periode.tahun_akhir) | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\renstraTabelKegiatanSchema.js` | 37 | acc[`target_tahun_${i}`] = Yup.number() | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\renstraTabelKegiatanSchema.js` | 41 | acc[`pagu_tahun_${i}`] = Yup.number() | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\utils\renstraTabelKegiatanSchema.js` | 45 | `max-available-tahun-${i}`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\utils\renstraTabelKegiatanSchema.js` | 46 | `❌ Pagu Tahun ${i} melebihi sisa pagu program`, | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\VisiForm.jsx` | 1 | // ✅ FIXED: VisiForm.js (Sinkron dengan Dokumen & Tahun aktif) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\VisiForm.jsx` | 14 | const { dokumen, tahun } = useDokumen(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\VisiForm.jsx` | 31 | tahun: tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\VisiForm.jsx` | 44 | if (dokumen && tahun) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\VisiForm.jsx` | 47 | }, [dokumen, tahun]); | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\VisiForm.jsx` | 78 | if (!periodeAktif?.tahun_awal \|\| !periodeAktif?.tahun_akhir) { | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\VisiForm.jsx` | 89 | tahun: tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\VisiForm.jsx` | 91 | tahun_awal: periodeAktif?.tahun_awal, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\VisiForm.jsx` | 92 | tahun_akhir: periodeAktif?.tahun_akhir, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\shared\components\VisiForm.jsx` | 120 | {konteksBannerRows(dokumen, tahun, periodeAktif).map((r) => ( | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\shared\components\WizardContextPanel.jsx` | 123 | tahun, | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\WizardContextPanel.jsx` | 131 | konteksBannerRows(dokumen, tahun, periodeAktif) | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\shared\components\WizardContextPanel.jsx` | 134 | [dokumen, tahun, periodeAktif], | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 3 | * (Tahun 1 s.d. Tahun 5), bukan dokumen tahun tunggal. | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 13 | * 1) periode yang memuat tahun kalender saat ini (mis. 2025–2029 saat now=2026), | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 15 | * 3) lalu periode dengan tahun_awal terbaru yang ≤ tahun kalender, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 16 | * 4) jika semua di masa depan, ambil periode dengan tahun_awal terawal. | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 23 | const nowYear = | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 24 | typeof opts.nowYear === "number" | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 25 | ? opts.nowYear | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 26 | : new Date().getFullYear(); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 28 | const periodeMemuatTahun = (y) => | UI_LABEL | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 30 | const aw = Number(p.tahun_awal); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 31 | const ak = Number(p.tahun_akhir); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 35 | const byCalendar = periodeMemuatTahun(nowYear); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 45 | (a, b) => Number(b.tahun_awal \|\| 0) - Number(a.tahun_awal \|\| 0), | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 48 | (p) => Number(p.tahun_awal) <= nowYear, | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 54 | /** True jika nilai tahun (angka/string) berada di rentang satu periode. */ | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 55 | export function tahunDalamPeriode(tahunStr, periode) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 57 | const y = parseInt(String(tahunStr ?? ""), 10); | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 59 | const aw = Number(periode.tahun_awal); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 60 | const ak = Number(periode.tahun_akhir); | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 66 | * dokumen lain tetap menampilkan tahun (filter tahunan). | INTERNAL_TEKNIS | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 68 | * @param {unknown} tahun nilai acuan API (biasanya tahun awal periode) | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 69 | * @param {{ tahun_awal?: unknown, tahun_akhir?: unknown } \| null \| undefined} periodeAktif baris periode terpilih | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 72 | export function konteksBannerRows(dokumen, tahun, periodeAktif) { | UNKNOWN | PERLU VALIDASI | ESKALASI VALIDASI PRODUK |
| `frontend\src\utils\planningDokumenUtils.js` | 74 | const aw = periodeAktif?.tahun_awal; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 75 | const ak = periodeAktif?.tahun_akhir; | DOMAIN_DATA | AMAN | BIARKAN |
| `frontend\src\utils\planningDokumenUtils.js` | 86 | label: "Tahun", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |
| `frontend\src\utils\planningDokumenUtils.js` | 87 | value: tahun != null && tahun !== "" ? String(tahun) : "—", | UI_LABEL | HARUS DIUBAH | PATCH SEKARANG |