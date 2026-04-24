/**
 * Jenis dokumen perencanaan yang berada pada level satu periode RPJMD
 * (Tahun 1 s.d. Tahun 5), bukan dokumen tahun tunggal.
 */
const DOKUMEN_LEVEL_PERIODE = new Set(["rpjmd", "renstra"]);

export function isDokumenLevelPeriode(dokumen) {
  return DOKUMEN_LEVEL_PERIODE.has(String(dokumen || "").toLowerCase());
}

/**
 * Pilih periode acuan untuk RPJMD/Renstra:
 * 1) periode yang memuat tahun kalender saat ini (mis. 2025–2029 saat now=2026),
 * 2) lalu periode_id user jika masih ada di daftar,
 * 3) lalu periode dengan tahun_awal terbaru yang ≤ tahun kalender,
 * 4) jika semua di masa depan, ambil periode dengan tahun_awal terawal.
 *
 * Urutan ini menghindari user lama tertahan di periode lawas (mis. 2020)
 * ketika RPJMD berjalan sudah 2025–2029.
 */
export function pickAnchorPeriodeFromList(list, user, opts = {}) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const nowYear =
    typeof opts.nowYear === "number"
      ? opts.nowYear
      : new Date().getFullYear();

  const periodeMemuatTahun = (y) =>
    list.find((p) => {
      const aw = Number(p.tahun_awal);
      const ak = Number(p.tahun_akhir);
      return y >= aw && y <= ak;
    });

  const byCalendar = periodeMemuatTahun(nowYear);
  if (byCalendar) return byCalendar;

  const uid = user?.periode_id;
  if (uid != null && uid !== "") {
    const byUser = list.find((p) => String(p.id) === String(uid));
    if (byUser) return byUser;
  }

  const sortedDesc = [...list].sort(
    (a, b) => Number(b.tahun_awal || 0) - Number(a.tahun_awal || 0),
  );
  const startedOnOrBeforeNow = sortedDesc.filter(
    (p) => Number(p.tahun_awal) <= nowYear,
  );
  if (startedOnOrBeforeNow[0]) return startedOnOrBeforeNow[0];
  return sortedDesc[sortedDesc.length - 1];
}

/** True jika nilai tahun (angka/string) berada di rentang satu periode. */
export function tahunDalamPeriode(tahunStr, periode) {
  if (!periode) return false;
  const y = parseInt(String(tahunStr ?? ""), 10);
  if (Number.isNaN(y)) return false;
  const aw = Number(periode.tahun_awal);
  const ak = Number(periode.tahun_akhir);
  return y >= aw && y <= ak;
}

/**
 * Baris label/nilai untuk banner form: RPJMD/Renstra menonjolkan rentang periode;
 * dokumen lain tetap menampilkan tahun (filter tahunan).
 * @param {unknown} dokumen jenis_dokumen aktif
 * @param {unknown} tahun nilai acuan API (biasanya tahun awal periode)
 * @param {{ tahun_awal?: unknown, tahun_akhir?: unknown } | null | undefined} periodeAktif baris periode terpilih
 * @returns {{ key: string, label: string, value: string }[]}
 */
export function konteksBannerRows(dokumen, tahun, periodeAktif) {
  const dok = String(dokumen || "").toLowerCase();
  const aw = periodeAktif?.tahun_awal;
  const ak = periodeAktif?.tahun_akhir;
  if (isDokumenLevelPeriode(dok) && aw != null && ak != null) {
    return [
      { key: "doc", label: "Dokumen aktif", value: String(dokumen || "—") },
      { key: "per", label: "Periode", value: `${aw} – ${ak}` },
    ];
  }
  return [
    { key: "doc", label: "Dokumen aktif", value: String(dokumen || "—") },
    {
      key: "th",
      label: "Konteks waktu",
      value: tahun != null && tahun !== "" ? String(tahun) : "—",
    },
  ];
}
