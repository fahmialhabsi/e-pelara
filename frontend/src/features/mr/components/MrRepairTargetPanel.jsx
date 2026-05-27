import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Empty, List, Space, Tag, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

const { Text, Title } = Typography;

const truncate = (value, max = 40) => {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
};

const isAnalisisLengkap = (item) => {
  const status = String(item?.analisis_status || item?.analysis_status || '')
    .trim()
    .toLowerCase();
  if (status) return status === 'lengkap' || status === 'complete' || status === 'completed';

  const hasExistingControlStatus = Boolean(String(item?.existing_control_status || '').trim());
  const hasExistingControlDescription = Boolean(
    String(item?.existing_control_description || '').trim(),
  );
  const hasControlAdequacyStatus = Boolean(String(item?.control_adequacy_status || '').trim());
  const hasResidualScore = item?.residual_score !== null && item?.residual_score !== undefined;
  const hasResidualLevel = Boolean(String(item?.residual_level || '').trim());

  return (
    hasExistingControlStatus &&
    hasExistingControlDescription &&
    hasControlAdequacyStatus &&
    hasResidualScore &&
    hasResidualLevel
  );
};

const getRiskId = (item) => item?.id || item?.risk_id || item?.mr_planning_risk_id;

const getRiskCode = (item) => item?.kode_risiko || item?.risk_code || '-';

const getRiskName = (item) => item?.nama_risiko || item?.risk_name || '-';

export default function MrRepairTargetPanel({ contextId, findingCode, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);

  const loadTargets = useCallback(async () => {
    if (!contextId) {
      setRows([]);
      setError('Context ID tidak tersedia.');
      return;
    }

    setLoading(true);
    setError('');
    setUsedFallback(false);

    try {
      const primaryUrl = `/api/mr-planning-risk?context_id=${encodeURIComponent(
        contextId,
      )}&analisis_incomplete=1`;
      const primaryRes = await fetch(primaryUrl, { credentials: 'include' });

      if (!primaryRes.ok) {
        throw new Error('PRIMARY_ENDPOINT_UNAVAILABLE');
      }

      const primaryJson = await primaryRes.json();
      const primaryRows = Array.isArray(primaryJson?.data)
        ? primaryJson.data
        : Array.isArray(primaryJson)
          ? primaryJson
          : [];

      setRows(primaryRows);
      return;
    } catch (_) {
      try {
        const fallbackUrl = `/api/mr-planning-risk?context_id=${encodeURIComponent(contextId)}`;
        const fallbackRes = await fetch(fallbackUrl, { credentials: 'include' });
        if (!fallbackRes.ok) {
          throw new Error(`HTTP_${fallbackRes.status}`);
        }
        const fallbackJson = await fallbackRes.json();
        const fallbackRows = Array.isArray(fallbackJson?.data)
          ? fallbackJson.data
          : Array.isArray(fallbackJson)
            ? fallbackJson
            : [];
        const incomplete = fallbackRows.filter((item) => !isAnalisisLengkap(item));
        setRows(incomplete);
        setUsedFallback(true);
      } catch (fallbackErr) {
        setRows([]);
        setError(
          fallbackErr?.message
            ? `Gagal memuat data target perbaikan: ${fallbackErr.message}`
            : 'Gagal memuat data target perbaikan.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [contextId]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('return') === 'repair') {
      loadTargets();
    }
  }, [location.search, loadTargets]);

  const normalizedRows = useMemo(
    () =>
      (Array.isArray(rows) ? rows : []).map((item) => ({
        ...item,
        __riskId: getRiskId(item),
        __kode: getRiskCode(item),
        __nama: getRiskName(item),
        __selesai: isAnalisisLengkap(item),
      })),
    [rows],
  );

  const total = normalizedRows.length;
  const done = normalizedRows.filter((item) => item.__selesai).length;

  const handleRevisi = (item) => {
    if (!item?.__riskId) return;
    navigate(
      `/mr/planning/risk/${item.__riskId}/edit?tab=analisis&return=repair&context_id=${encodeURIComponent(
        contextId,
      )}`,
    );
  };

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fff' }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {total} risiko perlu diperbaiki - Analisis belum lengkap
          </Title>
          <Text type="secondary">
            Progress: {done}/{total} selesai
          </Text>
          {findingCode ? (
            <div>
              <Text type="secondary">Finding: {findingCode}</Text>
            </div>
          ) : null}
          {usedFallback ? (
            <div>
              <Text type="warning">Mode fallback aktif: filter analisis belum lengkap dari client.</Text>
            </div>
          ) : null}
        </div>

        {error ? <Text type="danger">{error}</Text> : null}

        <List
          loading={loading}
          locale={{ emptyText: <Empty description="Tidak ada target perbaikan." /> }}
          dataSource={normalizedRows}
          renderItem={(item) => (
            <List.Item
              actions={[
                item.__selesai ? null : (
                  <Button key="revisi" type="primary" size="small" onClick={() => handleRevisi(item)}>
                    Revisi
                  </Button>
                ),
              ]}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                <Space>
                  <Text code>{item.__kode}</Text>
                  <Text>{truncate(item.__nama, 40)}</Text>
                </Space>
                {item.__selesai ? (
                  <Tag color="green">Selesai</Tag>
                ) : (
                  <Badge color="#faad14" text="Analisis Belum Lengkap" />
                )}
              </Space>
            </List.Item>
          )}
        />

        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </Space>
    </div>
  );
}

