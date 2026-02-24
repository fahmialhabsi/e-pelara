export const fetchKasData = async () => {
  const response = await fetch('/api/kas');
  return response.json();
};
