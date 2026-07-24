// frontend/src/pages/mr/unified/steps/StepMitigation.jsx
import React from 'react';
import { Card, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import MrPlanningMitigationForm from '@/pages/mr/MrPlanningMitigationForm';
import mrPlanningMitigationService from '@/services/mrPlanningMitigationService';

const unwrapRows = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (res && typeof res === 'object' && res.id) return [res];
  return [];
};

export default function StepMitigation({ riskId, onStepComplete }) {
  const { data: existingMitigation, isLoading: checking } = useQuery({
    queryKey: ['mr-wizard', 'mitigation-by-risk', riskId],
    queryFn: async () => {
      const res = await mrPlanningMitigationService.getByRisk(riskId);
      return unwrapRows(res)[0] || null;
    },
    enabled: Boolean(riskId),
  });

  if (checking) {
    return (
      <Card title="Langkah 3 — Rencana Tindak Pengendalian (Mitigasi)">
        <Spin tip="Memeriksa data mitigasi..." />
      </Card>
    );
  }

  return (
    <Card
      title="Langkah 3 — Rencana Tindak Pengendalian (Mitigasi)"
      styles={{ body: { padding: 0 } }}
    >
      <MrPlanningMitigationForm
        mode={existingMitigation ? 'edit' : 'create'}
        riskId={riskId}
        mitigationId={existingMitigation?.id}
        onSaved={(saved) => onStepComplete(saved?.id || existingMitigation?.id)}
        onCancel={() => onStepComplete(existingMitigation?.id || null)}
      />
    </Card>
  );
}
