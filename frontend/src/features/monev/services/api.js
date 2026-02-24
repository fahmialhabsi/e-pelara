import axios from "axios";

export const fetchPrograms = async (opdId) => {
  const { data } = await axios.get(`/api/programs?opd_id=${opdId}`);
  return data;
};

export const fetchKegiatan = async (programId) => {
  const { data } = await axios.get(`/api/kegiatan?program_id=${programId}`);
  return data;
};

export const fetchSubkegiatan = async (kegiatanId) => {
  const { data } = await axios.get(`/api/subkegiatan?kegiatan_id=${kegiatanId}`);
  return data;
};
