// frontend/src/routes/sdiRoutes.jsx
// Modul Daftar Data Daerah (Satu Data Indonesia) — Perpres 39/2019 dan
// Pergub Maluku Utara 40/2022, mengikuti Lampiran surat 000.7/4486/SETDA.
import React from 'react';

const SdiDaftarDataListPage = React.lazy(
  () => import('../features/sdi/pages/SdiDaftarDataListPage'),
);
const SdiDaftarDataAddPage = React.lazy(() => import('../features/sdi/pages/SdiDaftarDataAddPage'));
const SdiDaftarDataEditPage = React.lazy(
  () => import('../features/sdi/pages/SdiDaftarDataEditPage'),
);

const sdiRoutes = [
  { path: 'sdi/daftar-data', element: <SdiDaftarDataListPage /> },
  { path: 'sdi/daftar-data/add', element: <SdiDaftarDataAddPage /> },
  { path: 'sdi/daftar-data/edit/:id', element: <SdiDaftarDataEditPage /> },
];

export default sdiRoutes;
