import React from 'react';

const ProsnPeriodePage = React.lazy(() => import('../features/prosnp/pages/ProsnPeriodePage'));
const ProsnPeriodeDetailPage = React.lazy(() => import('../features/prosnp/pages/ProsnPeriodeDetailPage'));
const ProsnPemeriksaanPage = React.lazy(() => import('../features/prosnp/pages/ProsnPemeriksaanPage'));

export default [
  { path: 'prosnp/periode', element: <ProsnPeriodePage /> },
  { path: 'prosnp/periode/:id', element: <ProsnPeriodeDetailPage /> },
  { path: 'prosnp/pemeriksaan', element: <ProsnPemeriksaanPage /> },
];
