// dpaApi untuk modul DPA
export const getAllDpa = async () => {
  const response = await fetch("/api/dpa");
  if (!response.ok) throw new Error("Gagal ambil data DPA");
  return response.json();
};
