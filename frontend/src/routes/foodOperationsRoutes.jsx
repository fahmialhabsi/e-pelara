import React from 'react';

const FoodOpsDashboardPage = React.lazy(() => import('../features/foodOperations/pages/FoodOpsDashboardPage'));
const FoodOpsDocumentListPage = React.lazy(() => import('../features/foodOperations/pages/FoodOpsDocumentListPage'));
const FoodOpsRegulationListPage = React.lazy(() => import('../features/foodOperations/pages/FoodOpsRegulationListPage'));
const FoodOpsEventListPage = React.lazy(() => import('../features/foodOperations/pages/FoodOpsEventListPage'));

export default [
  { path: 'food-operations/dashboard', element: <FoodOpsDashboardPage /> },
  { path: 'food-operations/documents', element: <FoodOpsDocumentListPage /> },
  { path: 'food-operations/regulations', element: <FoodOpsRegulationListPage /> },
  { path: 'food-operations/events', element: <FoodOpsEventListPage /> },
];
