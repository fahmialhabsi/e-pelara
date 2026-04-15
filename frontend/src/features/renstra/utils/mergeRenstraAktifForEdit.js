/**
 * GET detail Renstra sering meng-include `renstra` tanpa `tahun_mulai`.
 * Pola `data?.renstra ?? renstraAktifFallback` membuat objek include menang
 * sehingga tahun hilang → dropdown RPJMD gagal / loading lama.
 */
export function mergeRenstraAktifForEdit(detailRenstra, renstraAktifFallback) {
  const d = detailRenstra;
  const f = renstraAktifFallback;
  if (!d && !f) return undefined;
  return {
    ...(f ?? {}),
    ...(d ?? {}),
    tahun_mulai: d?.tahun_mulai ?? f?.tahun_mulai,
  };
}
