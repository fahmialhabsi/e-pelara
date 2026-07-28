import React, { useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Space,
  Divider,
  Alert,
  App,
  Spin,
  Checkbox,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import {
  OBJEK_LEVEL,
  JENIS_REKOMENDASI,
  TINGKAT_PRIORITAS,
  STATUS_REVIEW,
  KATALOG_DASAR_HUKUM,
} from '../constants/reviewKonsistensiConstants';
import { renstraReviewApi, fetchObjekLevel } from '../services/renstraReviewApi';

const { TextArea } = Input;

const opsi = (obj) => Object.entries(obj).map(([value, v]) => ({ value, label: v.label }));

const RenstraReviewKonsistensiForm = ({ initialData = null }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const isSuperAdmin = String(user?.role || user?.peran || '').toUpperCase() === 'SUPER_ADMIN';
  const tulisManual = Form.useWatch('catatan_manual', form);

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });
  const renstraId = renstraAktif?.id;

  const objekLevel = Form.useWatch('objek_level', form);
  const jenisRekomendasi = Form.useWatch('jenis_rekomendasi', form);

  const cfgObjek = objekLevel ? OBJEK_LEVEL[objekLevel] : null;
  const parentLevel = cfgObjek?.parentLevel || null;
  const cfgParent = parentLevel ? OBJEK_LEVEL[parentLevel] : null;
  const perluTargetInduk = JENIS_REKOMENDASI[jenisRekomendasi]?.otomatis === true;

  const { data: objekOptions = [], isFetching: loadingObjek } = useQuery({
    queryKey: ['review-objek', objekLevel, renstraId],
    enabled: !!renstraId && !!cfgObjek,
    queryFn: () => fetchObjekLevel(cfgObjek.endpoint, renstraId),
  });

  const { data: parentOptions = [], isFetching: loadingParent } = useQuery({
    queryKey: ['review-parent', parentLevel, renstraId],
    enabled: !!renstraId && !!cfgParent,
    queryFn: () => fetchObjekLevel(cfgParent.endpoint, renstraId),
  });

  const asOptions = (rows, cfg) =>
    rows.map((r) => ({
      value: r.id,
      label: `${r[cfg.kodeField] || ''} - ${r[cfg.uraianField] || ''}`.trim(),
    }));

  useEffect(() => {
    if (!initialData) return;
    form.setFieldsValue({
      ...initialData,
      tanggal_review: initialData.tanggal_review ? dayjs(initialData.tanggal_review) : null,
      dasar_hukum: Array.isArray(initialData.dasar_hukum) ? initialData.dasar_hukum : [],
    });
  }, [initialData, form]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      initialData
        ? renstraReviewApi.update(initialData.id, payload)
        : renstraReviewApi.create(payload),
    onSuccess: () => {
      message.success(`Catatan reviu berhasil ${initialData ? 'diperbarui' : 'disimpan'}`);
      queryClient.invalidateQueries({ queryKey: ['renstra-review-konsistensi'] });
      navigate('/renstra/review-konsistensi');
    },
    onError: (err) =>
      message.error(err?.response?.data?.error || err?.message || 'Gagal menyimpan catatan reviu'),
  });

  const onFinish = (values) => {
    // Snapshot kode & uraian objek agar catatan reviu tetap terbaca walaupun
    // data induk kemudian diubah atau dihapus.
    const objek = objekOptions.find((o) => o.id === values.objek_id);
    mutation.mutate({
      ...values,
      renstra_id: renstraId,
      objek_kode: objek?.[cfgObjek.kodeField] || '',
      objek_uraian: objek?.[cfgObjek.uraianField] || '',
      usulan_parent_level: perluTargetInduk ? parentLevel : null,
      usulan_parent_id: perluTargetInduk ? values.usulan_parent_id : null,
      tanggal_review: values.tanggal_review ? values.tanggal_review.format('YYYY-MM-DD') : null,
      dasar_hukum: (values.dasar_hukum || []).filter((d) => d && (d.regulasi || d.kutipan)),
    });
  };

  const katalogOptions = useMemo(
    () => KATALOG_DASAR_HUKUM.map((d, i) => ({ value: i, label: `${d.regulasi} — ${d.pasal}` })),
    [],
  );

  if (!renstraId) return <Spin tip="Memuat Renstra aktif..." />;

  return (
    <Card
      title={initialData ? 'Edit Catatan Reviu Konsistensi' : 'Tambah Catatan Reviu Konsistensi'}
    >
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali</Button>
        <Button onClick={() => navigate('/renstra/review-konsistensi')}>📄 Daftar Reviu</Button>
      </Space>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 900 }}
        initialValues={{
          tingkat_prioritas: 'sedang',
          status: 'usulan',
          dasar_hukum: [],
          sesuaikan_kode: true,
          catatan_manual: false,
        }}
      >
        <Divider orientation="left">Objek yang Direviu</Divider>

        <Form.Item name="objek_level" label="Level Objek" rules={[{ required: true }]}>
          <Select
            options={opsi(OBJEK_LEVEL)}
            placeholder="Pilih level"
            onChange={() =>
              form.setFieldsValue({ objek_id: undefined, usulan_parent_id: undefined })
            }
          />
        </Form.Item>

        <Form.Item name="objek_id" label="Objek" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            loading={loadingObjek}
            disabled={!cfgObjek}
            options={cfgObjek ? asOptions(objekOptions, cfgObjek) : []}
            placeholder={cfgObjek ? `Pilih ${cfgObjek.label}` : 'Pilih level objek dulu'}
          />
        </Form.Item>

        <Divider orientation="left">Hasil Reviu</Divider>

        <Form.Item name="jenis_rekomendasi" label="Jenis Rekomendasi" rules={[{ required: true }]}>
          <Select options={opsi(JENIS_REKOMENDASI)} placeholder="Pilih jenis rekomendasi" />
        </Form.Item>

        {jenisRekomendasi && !JENIS_REKOMENDASI[jenisRekomendasi].otomatis && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Rekomendasi ini dieksekusi manual"
            description="Jenis pecah, gabungkan, dan perbaiki rumusan melahirkan atau meleburkan record beserta kode dan turunannya, sehingga tidak dapat diterapkan otomatis. Lakukan perubahan lewat form objek terkait, lalu ubah status catatan ini menjadi Ditindaklanjuti."
          />
        )}

        {perluTargetInduk && cfgParent && (
          <Form.Item
            name="usulan_parent_id"
            label={`Pindahkan ke ${cfgParent.label}`}
            rules={[{ required: true, message: 'Target pemindahan wajib dipilih' }]}
            extra="Dipakai tombol Terapkan pada halaman daftar untuk memindahkan objek."
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={loadingParent}
              options={asOptions(parentOptions, cfgParent)}
              placeholder={`Pilih ${cfgParent.label} tujuan`}
            />
          </Form.Item>
        )}

        {perluTargetInduk && (
          <Form.Item
            name="sesuaikan_kode"
            valuePropName="checked"
            extra="Kode dinomori ulang mengikuti pola saudara kandung di induk baru (mis. AKR-01-03.2.2.03). Tidak berlaku untuk Program/Kegiatan/Sub Kegiatan yang memakai nomenklatur baku Kepmendagri."
          >
            <Checkbox>Sesuaikan kode otomatis setelah dipindahkan</Checkbox>
          </Form.Item>
        )}

        <Form.Item name="kondisi_saat_ini" label="Kondisi Saat Ini">
          <TextArea
            rows={3}
            placeholder="Contoh: Arah Kebijakan ini berada di bawah Strategi tentang sarana dan prasarana cadangan pangan."
          />
        </Form.Item>

        <Form.Item name="rekomendasi" label="Rekomendasi" rules={[{ required: true }]}>
          <TextArea
            rows={3}
            placeholder="Contoh: Dipindahkan ke Sasaran Meningkatnya Akses Pangan Masyarakat."
          />
        </Form.Item>

        <Form.Item name="alasan_substansi" label="Alasan / Analisis Substansi">
          <TextArea
            rows={4}
            placeholder="Uraikan mengapa harus dipindahkan atau dipecah dari sisi substansi perencanaan."
          />
        </Form.Item>

        <Divider orientation="left">Dasar Hukum</Divider>

        <Form.List name="dasar_hukum">
          {(fields, { add, remove }) => (
            <>
              <Space style={{ marginBottom: 12 }} wrap>
                <Select
                  style={{ minWidth: 420 }}
                  placeholder="Tambah cepat dari katalog dasar hukum"
                  options={katalogOptions}
                  value={null}
                  onChange={(idx) => add({ ...KATALOG_DASAR_HUKUM[idx] })}
                />
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => add({ regulasi: '', pasal: '', kutipan: '' })}
                >
                  Tambah manual
                </Button>
              </Space>

              {fields.map((field) => (
                <Card
                  key={field.key}
                  size="small"
                  style={{ marginBottom: 12, background: '#fafafa' }}
                  extra={
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      Hapus
                    </Button>
                  }
                >
                  <Form.Item
                    name={[field.name, 'regulasi']}
                    label="Regulasi"
                    rules={[{ required: true, message: 'Regulasi wajib diisi' }]}
                  >
                    <Input placeholder="Contoh: Permendagri No. 86 Tahun 2017" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'pasal']} label="Pasal / Bagian / Lampiran">
                    <Input placeholder="Contoh: Lampiran — Tabel T-C.26" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'kutipan']} label="Kutipan / Argumen Hukum">
                    <TextArea
                      rows={3}
                      placeholder="Kutipan norma dan kaitannya dengan temuan reviu."
                    />
                  </Form.Item>
                </Card>
              ))}
            </>
          )}
        </Form.List>

        <Divider orientation="left">Status & Pereviu</Divider>

        <Space size="large" wrap style={{ display: 'flex' }}>
          <Form.Item name="tingkat_prioritas" label="Prioritas" style={{ minWidth: 180 }}>
            <Select options={opsi(TINGKAT_PRIORITAS)} />
          </Form.Item>
          <Form.Item name="status" label="Status" style={{ minWidth: 200 }}>
            <Select options={opsi(STATUS_REVIEW)} />
          </Form.Item>
          <Form.Item name="tanggal_review" label="Tanggal Reviu" style={{ minWidth: 180 }}>
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
          </Form.Item>
        </Space>

        <Space size="large" wrap style={{ display: 'flex' }}>
          <Form.Item name="reviewer_nama" label="Nama Pereviu" style={{ minWidth: 300 }}>
            <Input />
          </Form.Item>
          <Form.Item name="reviewer_jabatan" label="Jabatan Pereviu" style={{ minWidth: 300 }}>
            <Input />
          </Form.Item>
        </Space>

        {isSuperAdmin && (
          <Form.Item name="catatan_manual" valuePropName="checked" style={{ marginBottom: 4 }}>
            <Checkbox>Tulis Catatan Tindak Lanjut secara manual (khusus Super Admin)</Checkbox>
          </Form.Item>
        )}

        <Form.Item
          name="catatan_tindak_lanjut"
          label="Catatan Tindak Lanjut"
          extra={
            isSuperAdmin
              ? 'Disusun otomatis oleh sistem dari isian di atas. Centang kotak di atas bila perlu ditulis manual.'
              : 'Disusun otomatis oleh sistem dari isian di atas dan tidak dapat diubah. Hubungi Super Admin bila memerlukan penyesuaian.'
          }
        >
          <TextArea
            rows={4}
            disabled={!isSuperAdmin || !tulisManual}
            placeholder="Terisi otomatis setelah catatan reviu disimpan."
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            {initialData ? 'Update Catatan Reviu' : 'Simpan Catatan Reviu'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default RenstraReviewKonsistensiForm;
