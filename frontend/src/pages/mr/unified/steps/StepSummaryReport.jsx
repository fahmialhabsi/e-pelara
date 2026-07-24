// frontend/src/pages/mr/unified/steps/StepSummaryReport.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Spin, Space, Typography } from 'antd';
import mrPlanningRiskService from '@/services/mrPlanningRiskService';
import mrPlanningMitigationService from '@/services/mrPlanningMitigationService';
import mrPlanningMonitoringService from '@/services/mrPlanningMonitoringService';

const { Title } = Typography;

const unwrapRows = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export default function StepSummaryReport({ contextData, riskId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState(null);
  const [mitigations, setMitigations] = useState([]);
  const [monitorings, setMonitorings] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [riskRes, mitigationRes, monitoringRes] = await Promise.all([
          riskId ? mrPlanningRiskService.getById(riskId, { include_governance: true }) : Promise.resolve(null),
          riskId ? mrPlanningMitigationService.getByRisk(riskId) : Promise.resolve([]),
          riskId ? mrPlanningMonitoringService.getByRisk(riskId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setRisk(riskRes?.data || riskRes || null);
        setMitigations(unwrapRows(mitigationRes));
        setMonitorings(unwrapRows(monitoringRes));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [riskId]);

  if (loading) {
    return (
      <Card title="Langkah 5 — Ringkasan">
        <Spin tip="Memuat ringkasan..." />
      </Card>
    );
  }

  return (
    <Card title="Langkah 5 — Ringkasan">
      <Title level={5}>Konteks</Title>
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Jenis Sumber">{contextData?.jenis_sumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="Tahun">{contextData?.tahun || '-'}</Descriptions.Item>
        <Descriptions.Item label="OPD">{contextData?.nama_opd || '-'}</Descriptions.Item>
        <Descriptions.Item label="Periode">{contextData?.periode_label || '-'}</Descriptions.Item>
      </Descriptions>

      <Title level={5}>Risiko</Title>
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Kode Risiko">{risk?.kode_risiko || '-'}</Descriptions.Item>
        <Descriptions.Item label="Nama Risiko">{risk?.nama_risiko || '-'}</Descriptions.Item>
        <Descriptions.Item label="Level Risiko">
          <Tag>{risk?.level_risiko || '-'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">{risk?.status_revisi || '-'}</Descriptions.Item>
      </Descriptions>

      <Title level={5}>Mitigasi ({mitigations.length})</Title>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={mitigations}
        style={{ marginBottom: 24 }}
        columns={[
          { title: 'Kegiatan Pengendalian', dataIndex: 'kegiatan_pengendalian' },
          { title: 'Penanggung Jawab', dataIndex: 'penanggung_jawab' },
          { title: 'Status', dataIndex: 'status_mitigasi' },
        ]}
      />

      <Title level={5}>Monitoring ({monitorings.length})</Title>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={monitorings}
        style={{ marginBottom: 24 }}
        columns={[
          { title: 'Tanggal Pemantauan', dataIndex: 'monitoring_date' },
          { title: 'Progress (%)', dataIndex: 'progress_persen' },
          { title: 'Hasil Pemantauan', dataIndex: 'hasil_monitoring' },
        ]}
      />

      <Space style={{ marginTop: 16 }}>
        <Button type="primary" onClick={() => navigate('/mr/planning-report')}>
          Lanjut ke Laporan MR
        </Button>
      </Space>
    </Card>
  );
}
