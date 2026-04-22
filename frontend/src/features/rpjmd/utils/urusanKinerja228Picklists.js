/** Opsi unik dari satu kolom tahun impor 2.28 (nilai string apa pun, seperti di PDF). */
export function uniqueColumnOptions(rows, columnKey) {
  const seen = new Set();
  const out = [];
  for (const r of rows || []) {
    const raw = r?.[columnKey];
    if (raw == null) continue;
    const s = String(raw).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push({ value: s, label: s });
  }
  return out;
}

/** Gabungan nilai unik dari kolom tahun_2021 … tahun_2024 (untuk capaian tahun 5 / baseline). */
export function unionYearColumnsOptions(rows) {
  const keys = ["tahun_2021", "tahun_2022", "tahun_2023", "tahun_2024"];
  const seen = new Set();
  const out = [];
  for (const col of keys) {
    for (const r of rows || []) {
      const raw = r?.[col];
      if (raw == null) continue;
      const s = String(raw).trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push({ value: s, label: s });
    }
  }
  return out;
}

/** Angka dari teks impor/form (koma desimal Indonesia, spasi, %). */
export function parseFlexibleNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return null;
  s = s.replace(/%/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Baseline otomatis yang rasional dari empat nilai historis (mis. 2021–2024 impor):
 * rata-rata berbobot dengan bobot 1:2:3:4 (tahun terbarah lebih representatif sebagai kondisi akhir seri).
 * Jika sebagian kosong/non-angka, hanya memakai tahun yang valid dengan bobot proporsional.
 * Jika tidak ada satu pun angka valid, mengembalikan string kosong.
 */
export function computeRationalBaselineFromFourCaps(c1, c2, c3, c4) {
  const cells = [c1, c2, c3, c4];
  const weights = [1, 2, 3, 4];
  let sumW = 0;
  let sumWX = 0;
  for (let i = 0; i < 4; i++) {
    const n = parseFlexibleNumber(cells[i]);
    if (n === null) continue;
    sumW += weights[i];
    sumWX += weights[i] * n;
  }
  if (sumW === 0) return "";
  const v = sumWX / sumW;
  return String(Number(v.toFixed(2)));
}

/**
 * Proyeksi Capaian Tahun 5 dari tren Capaian T1–T4: regresi linear sederhana (x = 1…4),
 * nilai di x = 5. Dipakai jika T5 kosong (mis. hanya empat tahun di impor 2.28).
 */
export function extrapolateCapaianTahun5FromFour(c1, c2, c3, c4) {
  const ys = [c1, c2, c3, c4].map(parseFlexibleNumber);
  if (ys.some((y) => y === null)) return "";
  const n = 4;
  const xs = [1, 2, 3, 4];
  const xMean = 2.5;
  const yMean = (ys[0] + ys[1] + ys[2] + ys[3]) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    num += dx * (ys[i] - yMean);
    den += dx * dx;
  }
  if (den === 0 || !Number.isFinite(den)) {
    return String(Number(ys[3].toFixed(2)));
  }
  const b = num / den;
  const a = yMean - b * xMean;
  const y5 = a + b * 5;
  if (!Number.isFinite(y5)) return String(Number(ys[3].toFixed(2)));
  return String(Number(y5.toFixed(2)));
}

/** Jika nilai form tidak ada di daftar impor, tambahkan satu opsi agar react-select tetap menampilkan nilai saat ini. */
export function optionsWithCurrentValue(baseOptions, currentValue, manualSuffix = " (di luar impor)") {
  const v = currentValue != null ? String(currentValue).trim() : "";
  if (!v) return baseOptions || [];
  const base = Array.isArray(baseOptions) ? baseOptions : [];
  if (base.some((o) => o.value === v)) return base;
  return [{ value: v, label: `${v}${manualSuffix}` }, ...base];
}
