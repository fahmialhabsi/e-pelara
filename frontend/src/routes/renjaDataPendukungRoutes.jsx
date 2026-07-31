// frontend/src/routes/renjaDataPendukungRoutes.jsx
// Data pendukung Renja Permendagri 14/2026 (Pokir DPRD & Inovasi Bidang Urusan).
// Ditempatkan di bawah path modul RKPD karena datanya tahunan per perangkat
// daerah dan dikelola bersamaan dengan penyusunan RKPD, bukan per dokumen Renja.
import React from 'react';

const RenjaPokirDprdPage = React.lazy(
  () => import('../features/rkpd/pages/RenjaPokirDprdPage'),
);
const RenjaInovasiBidangUrusanPage = React.lazy(
  () => import('../features/rkpd/pages/RenjaInovasiBidangUrusanPage'),
);

const renjaDataPendukungRoutes = [
  { path: 'rkpd/pokir-dprd', element: <RenjaPokirDprdPage /> },
  { path: 'rkpd/inovasi-bidang-urusan', element: <RenjaInovasiBidangUrusanPage /> },
];

export default renjaDataPendukungRoutes;
