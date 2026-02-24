// lakipApi.js
export const getAllLakip = async () => {
  const res = await fetch("/api/lakip");
  if (!res.ok) throw new Error("Gagal mengambil data LAKIP");
  return res.json();
};
