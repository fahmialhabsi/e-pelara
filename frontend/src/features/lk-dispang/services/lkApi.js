export const fetchJurnal = async () => {
  return Promise.resolve([{ id: 1, uraian: "Belanja Barang", nilai: 500000 }]);
};

export const fetchAset = async () => {
  return Promise.resolve([{ id: 1, nama: "Tanah Sawah", nilai: 100000000 }]);
};

export const fetchAnggaran = async () => {
  return Promise.resolve([{ id: 1, program: "Ketahanan Pangan", pagu: 200000000 }]);
};
