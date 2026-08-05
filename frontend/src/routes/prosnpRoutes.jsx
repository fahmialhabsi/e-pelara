import React from 'react';

const ProsnPeriodePage = React.lazy(() => import('../features/prosnp/pages/ProsnPeriodePage'));

export default [{ path: 'prosnp/periode', element: <ProsnPeriodePage /> }];
