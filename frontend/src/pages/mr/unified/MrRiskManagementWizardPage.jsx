// frontend/src/pages/mr/unified/MrRiskManagementWizardPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Steps, Button } from 'antd';
import mrAutoFillService from '@/services/mrAutoFillService';
import StepContext from '@/pages/mr/unified/steps/StepContext';
import StepRiskAnalysis from '@/pages/mr/unified/steps/StepRiskAnalysis';
import StepMitigation from '@/pages/mr/unified/steps/StepMitigation';
import StepMonitoring from '@/pages/mr/unified/steps/StepMonitoring';
import StepSummaryReport from '@/pages/mr/unified/steps/StepSummaryReport';

const STEP_ITEMS = [
  { title: 'Konteks', description: 'Buat/pilih periode pelaporan MR' },
  { title: 'Risiko & Analisis', description: 'Identifikasi, analisis, akar penyebab' },
  { title: 'Mitigasi', description: 'Rencana tindak pengendalian' },
  { title: 'Monitoring', description: 'Pemantauan realisasi pengendalian' },
  { title: 'Ringkasan', description: 'Ringkasan & lanjut ke laporan' },
];

export default function MrRiskManagementWizardPage() {
  const { contextId: contextIdFromUrl } = useParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [contextId, setContextId] = useState(contextIdFromUrl || null);
  const [contextData, setContextData] = useState(null);
  const [autoFillData, setAutoFillData] = useState(null);
  const [riskId, setRiskId] = useState(null);
  const [mitigationId, setMitigationId] = useState(null);

  // Dipanggil SEKALI per nilai contextId (baik dari URL maupun hasil Step 1).
  useEffect(() => {
    if (!contextId) return undefined;
    let cancelled = false;

    mrAutoFillService
      .getAutoFillSuggestion(contextId)
      .then((res) => {
        if (!cancelled) setAutoFillData(res || null);
      })
      .catch(() => {
        if (!cancelled) setAutoFillData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [contextId]);

  const handleContextComplete = (ctx) => {
    setContextData(ctx);
    setContextId(ctx?.id ?? contextId);
    setCurrentStep(1);
  };

  const handleRiskComplete = (risk) => {
    setRiskId(risk?.id);
    setCurrentStep(2);
  };

  const handleMitigationComplete = (newMitigationId) => {
    setMitigationId(newMitigationId);
    setCurrentStep(3);
  };

  const handleMonitoringComplete = () => {
    setCurrentStep(4);
  };

  const goBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  return (
    <div style={{ padding: 16 }}>
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Steps current={currentStep} items={STEP_ITEMS} />
      </Card>

      {currentStep === 0 && (
        <StepContext
          contextId={contextId}
          autoFillData={autoFillData}
          onStepComplete={handleContextComplete}
        />
      )}
      {currentStep === 1 && (
        <StepRiskAnalysis
          contextData={contextData}
          autoFillData={autoFillData}
          onStepComplete={handleRiskComplete}
        />
      )}
      {currentStep === 2 && (
        <StepMitigation riskId={riskId} onStepComplete={handleMitigationComplete} />
      )}
      {currentStep === 3 && (
        <StepMonitoring riskId={riskId} onStepComplete={handleMonitoringComplete} />
      )}
      {currentStep === 4 && (
        <StepSummaryReport
          contextId={contextId}
          contextData={contextData}
          riskId={riskId}
          mitigationId={mitigationId}
        />
      )}

      {currentStep > 0 && currentStep < 4 && (
        <div style={{ marginTop: 16 }}>
          <Button onClick={goBack}>Kembali</Button>
        </div>
      )}
    </div>
  );
}
