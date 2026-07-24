// frontend/src/pages/mr/unified/steps/StepMonitoring.jsx
import React from 'react';
import { Card, Button, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import MrPlanningMonitoringListPage from '@/pages/mr/MrPlanningMonitoringListPage';
import mrPlanningMonitoringService from '@/services/mrPlanningMonitoringService';

const unwrapRows = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export default function StepMonitoring({ riskId, onStepComplete }) {
  const { data: entryRows } = useQuery({
    queryKey: ['mr-wizard', 'monitoring-by-risk', riskId],
    queryFn: async () => {
      const res = await mrPlanningMonitoringService.getByRisk(riskId);
      return unwrapRows(res);
    },
    enabled: Boolean(riskId),
    refetchInterval: 4000,
  });

  const hasEntry = (entryRows?.length || 0) > 0;

  return (
    <Card title="Langkah 4 — Pemantauan Realisasi Pengendalian" styles={{ body: { padding: 0 } }}>
      <Alert
        type="info"
        showIcon
        style={{ margin: 16 }}
        message="Catat minimal satu pemantauan realisasi pengendalian sebelum melanjutkan ke ringkasan."
      />
      <MrPlanningMonitoringListPage riskId={riskId} onBack={() => {}} />
      <div style={{ padding: 16, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'right' }}>
        <Button type="primary" disabled={!hasEntry} onClick={() => onStepComplete()}>
          Lanjut ke Ringkasan
        </Button>
      </div>
    </Card>
  );
}
