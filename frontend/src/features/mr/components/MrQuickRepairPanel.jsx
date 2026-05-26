import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import api from '@/services/api';

const { Text } = Typography;

const REQUIRED_FIELDS = [
  'existing_control_status',
  'existing_control_description',
  'control_adequacy_status',
  'inherent_level',
  'residual_level',
];

const DEFAULT_SAFE_VALUES = {
  existing_control_status: 'Ada Cukup Memadai',
  control_adequacy_status: 'Cukup Memadai',
  inherent_level: 'Sedang',
  residual_level: 'Rendah',
  existing_control_description:
    'Pengendalian internal melalui supervisi dan review berkala oleh atasan langsung.',
};

const REFERENCE_OPTIONS = {
  existing_control_status: [
    'Ada Cukup Memadai',
    'Ada Belum Memadai',
    'Tidak Ada',
  ],
  control_adequacy_status: [
    'Cukup Memadai',
    'Belum Memadai',
  ],
  inherent_level: ['Rendah', 'Sedang', 'Tinggi'],
  residual_level: ['Rendah', 'Sedang', 'Tinggi'],
};

const isFilled = (value) => String(value ?? '').trim().length > 0;

const parseMissingFields = (message = '') => {
  const marker = 'belum lengkap:';
  const idx = String(message).toLowerCase().indexOf(marker);
  if (idx < 0) return [];
  return String(message)
    .slice(idx + marker.length)
    .split(',')
    .map((x) => x.trim())
    .filter((x) => REQUIRED_FIELDS.includes(x));
};

const pickRiskRows = (findings = []) => {
  const map = new Map();

  findings.forEach((finding) => {
    if (String(finding?.code || '').toUpperCase() !== 'PEDOMAN_5_ANALYSIS_MISSING') return;
    const riskRefs = Array.isArray(finding?.risk_refs) ? finding.risk_refs : [];
    const fallbackRiskId = finding?.risk_id ?? null;
    const fallbackCode = finding?.kode_risiko ?? null;
    const missingFields = parseMissingFields(finding?.message);

    if (riskRefs.length === 0) {
      const key = String(fallbackRiskId || fallbackCode || '');
      if (!key) return;
      const prev = map.get(key) || {
        risk_id: fallbackRiskId,
        kode_risiko: fallbackCode,
        missing_fields: new Set(),
      };
      missingFields.forEach((f) => prev.missing_fields.add(f));
      map.set(key, prev);
      return;
    }

    riskRefs.forEach((ref) => {
      const riskId = ref?.risk_id ?? fallbackRiskId;
      const kodeRisiko = ref?.kode_risiko ?? fallbackCode;
      const key = String(riskId || kodeRisiko || '');
      if (!key) return;
      const prev = map.get(key) || {
        risk_id: riskId ?? null,
        kode_risiko: kodeRisiko ?? null,
        missing_fields: new Set(),
      };
      missingFields.forEach((f) => prev.missing_fields.add(f));
      map.set(key, prev);
    });
  });

  return Array.from(map.values()).map((row) => ({
    ...row,
    missing_fields: Array.from(row.missing_fields),
  }));
};

const MrQuickRepairPanel = ({ findings = [], contextId, onRepaired }) => {
  const [submitting, setSubmitting] = useState(false);
  const [valuesByRisk, setValuesByRisk] = useState({});

  const riskRows = useMemo(() => pickRiskRows(findings), [findings]);

  const mergedRows = useMemo(() => {
    return riskRows.map((row) => {
      const localValues = valuesByRisk[String(row.risk_id || row.kode_risiko || '')] || {};
      const completion = row.missing_fields.every((field) => isFilled(localValues[field]));
      return {
        ...row,
        values: localValues,
        done: completion,
      };
    });
  }, [riskRows, valuesByRisk]);

  const total = mergedRows.length;
  const doneCount = mergedRows.filter((x) => x.done).length;
  const canSubmit = total > 0 && doneCount === total && !submitting;

  const setFieldValue = (riskKey, field, value) => {
    setValuesByRisk((prev) => ({
      ...prev,
      [riskKey]: {
        ...(prev[riskKey] || {}),
        [field]: value,
      },
    }));
  };

  const autoFillRow = (row) => {
    const key = String(row.risk_id || row.kode_risiko || '');
    if (!key) return;
    const next = { ...(valuesByRisk[key] || {}) };
    row.missing_fields.forEach((field) => {
      if (DEFAULT_SAFE_VALUES[field] && !isFilled(next[field])) {
        next[field] = DEFAULT_SAFE_VALUES[field];
      }
    });
    setValuesByRisk((prev) => ({ ...prev, [key]: next }));
  };

  const autoFillAll = () => {
    const next = { ...valuesByRisk };
    mergedRows.forEach((row) => {
      const key = String(row.risk_id || row.kode_risiko || '');
      if (!key) return;
      const item = { ...(next[key] || {}) };
      row.missing_fields.forEach((field) => {
        if (DEFAULT_SAFE_VALUES[field] && !isFilled(item[field])) {
          item[field] = DEFAULT_SAFE_VALUES[field];
        }
      });
      next[key] = item;
    });
    setValuesByRisk(next);
    message.success('Default aman berhasil diisi.');
  };

  const handleSubmit = async () => {
    if (!contextId) {
      message.warning('Context belum dipilih.');
      return;
    }
    if (!canSubmit) {
      message.warning('Masih ada risiko yang belum lengkap.');
      return;
    }

    const payload = {
      repairs: mergedRows.map((row) => {
        const riskKey = String(row.risk_id || row.kode_risiko || '');
        return {
          risk_id: row.risk_id || null,
          kode_risiko: row.kode_risiko || null,
          fields: REQUIRED_FIELDS.reduce((acc, field) => {
            const val = valuesByRisk[riskKey]?.[field];
            if (isFilled(val)) acc[field] = String(val).trim();
            return acc;
          }, {}),
        };
      }),
    };

    try {
      setSubmitting(true);
      await api.post(`/mr-report/context/${contextId}/quick-repair`, payload);
      message.success('Perbaikan cepat berhasil diajukan.');
      if (typeof onRepaired === 'function') {
        await Promise.resolve(onRepaired());
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message || error?.message || 'Gagal mengajukan perbaikan cepat.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (total === 0) {
    return (
      <Alert
        type="success"
        showIcon
        message="Tidak ada data quick repair"
        description="Tidak ditemukan temuan PEDOMAN_5 yang membutuhkan pengisian inline."
      />
    );
  }

  return (
    <Card
      title="Panduan Perbaikan Cepat"
      extra={
        <Space>
          <Button onClick={autoFillAll}>Isi semua default aman</Button>
          <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Ajukan ke verifikator
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Progress
          percent={Math.round((doneCount / total) * 100)}
          format={() => `${doneCount} / ${total} risiko selesai`}
        />

        <Collapse
          accordion={false}
          items={mergedRows.map((row, idx) => {
            const riskKey = String(row.risk_id || row.kode_risiko || `risk-${idx}`);
            return {
              key: riskKey,
              label: (
                <Space wrap>
                  <Text strong>{row.kode_risiko || `Risk ${row.risk_id || '-'}`}</Text>
                  {row.done ? <Tag color="green">Selesai</Tag> : <Tag color="red">Belum</Tag>}
                  <Text type="secondary">
                    {row.missing_fields.length} field perlu diisi
                  </Text>
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Button onClick={() => autoFillRow(row)} style={{ width: 'fit-content' }}>
                    Auto isi
                  </Button>

                  <Form layout="vertical">
                    {row.missing_fields.map((field) => {
                      const val = row.values?.[field];
                      const isReference = Boolean(REFERENCE_OPTIONS[field]);
                      const labelMap = {
                        existing_control_status: 'Existing Control Status',
                        existing_control_description: 'Existing Control Description',
                        control_adequacy_status: 'Control Adequacy Status',
                        inherent_level: 'Inherent Level',
                        residual_level: 'Residual Level',
                      };
                      return (
                        <Form.Item key={field} label={labelMap[field] || field} required>
                          {isReference ? (
                            <Select
                              value={val}
                              options={REFERENCE_OPTIONS[field].map((x) => ({ label: x, value: x }))}
                              onChange={(next) => setFieldValue(riskKey, field, next)}
                              placeholder={`Pilih ${labelMap[field] || field}`}
                            />
                          ) : (
                            <Input.TextArea
                              value={val}
                              rows={3}
                              onChange={(e) => setFieldValue(riskKey, field, e.target.value)}
                              placeholder={`Isi ${labelMap[field] || field}`}
                            />
                          )}
                        </Form.Item>
                      );
                    })}
                  </Form>
                </Space>
              ),
            };
          })}
        />
      </Space>
    </Card>
  );
};

export default MrQuickRepairPanel;
