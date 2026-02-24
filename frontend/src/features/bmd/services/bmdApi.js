export const fetchAsetData = async () => {
  const response = await fetch('/api/aset');
  return response.json();
};
