const dashboardMap = {
  rpjmd: "/dashboard-rpjmd",
  renstra: "/dashboard-renstra",
  rkpd: "/dashboard-rkpd",
  renja: "/dashboard-renja",
  dpa: "/dashboard-dpa",
  pengkeg: "/dashboard-pengelolaan",
  monev: "/dashboard-monev",
  "lpk-dispang": "/dashboard-lpk",
  "lk-dispang": "/dashboard-lk",
  lakip: "/dashboard-lakip",
};

/**
 * Mengembalikan path dashboard berdasarkan jenis dokumen
 * @param {string} dokumen - jenis dokumen (misal: "rpjmd")
 * @returns {string} - path dashboard (misal: "/dashboard-rpjmd")
 */
export const getDashboardPath = (dokumen) => {
  if (!dokumen) return "/";
  const key = dokumen.toLowerCase();
  return dashboardMap[key] || "/";
};
