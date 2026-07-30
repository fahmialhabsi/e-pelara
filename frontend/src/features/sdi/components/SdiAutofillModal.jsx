import React, { useMemo, useState } from 'react';
import {
  Modal,
  Table,
  Input,
  Checkbox,
  Select,
  Tag,
  Tooltip,
  Space,
  Button,
  Alert,
  Typography,
  Empty,
  App,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KOLOM_AUTOFILL,
  KEYAKINAN,
  KUNCI_PORTAL_DAERAH,
} from '../constants/sdiDaftarDataConstants';
import { sdiDaftarDataApi, sdiKeys } from '../services/sdiDaftarDataApi';

const { Text } = Typography;

const kunci = (baris, kolom) => `${baris}:${kolom}`;

/**
 * Pratinjau pengisian otomatis kolom (1), (2), (9), (14), (16), (17), (18),
 * dan (19). Tiap usulan disertai alasan dan tingkat keyakinan, nilainya dapat
 * disunting langsung, dan hanya usulan yang dicentang yang tersimpan.
 *
 * Usulan berkeyakinan rendah — tautan portal yang datasetnya belum tentu ada —
 * sengaja tidak tercentang secara baku agar tidak lahir tautan mati yang
 * justru gagal saat diverifikasi Forum Satu Data.
 */
const SdiAutofillModal = ({ open, onClose, renstraId, tahun }) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [portalDaerah, setPortalDaerah] = useState(
    () => localStorage.getItem(KUNCI_PORTAL_DAERAH) || '',
  );
  const [usulkanPortalSdi, setUsulkanPortalSdi] = useState(false);
  const [hanyaKosong, setHanyaKosong] = useState(true);
  const [kolom, setKolom] = useState(KOLOM_AUTOFILL.map((k) => k.key));

  // Centang dan suntingan disimpan sebagai simpangan dari nilai baku, bukan
  // sebagai salinan penuh. Dengan begitu keduanya cukup direset saat pratinjau
  // baru datang, tanpa perlu menyalin ulang seluruh usulan.
  const [pilihan, setPilihan] = useState({ sumber: null, override: {}, suntingan: {} });

  const params = useMemo(
    () => ({
      renstra_id: renstraId,
      tahun,
      kolom: kolom.join(','),
      hanya_kosong: hanyaKosong ? 'true' : 'false',
      portal_daerah: portalDaerah || undefined,
      portal_sdi: usulkanPortalSdi ? 'true' : 'false',
    }),
    [renstraId, tahun, kolom, hanyaKosong, portalDaerah, usulkanPortalSdi],
  );

  const { data, isFetching, refetch } = useQuery({
    queryKey: sdiKeys.autofill(params),
    enabled: open && !!renstraId,
    queryFn: () => sdiDaftarDataApi.previewAutofill(params),
  });

  /** Ratakan usulan per baris menjadi satu daftar agar mudah ditinjau per kolom. */
  const usulan = useMemo(() => {
    const keluar = [];
    (data?.data || []).forEach((baris) => {
      baris.perubahan.forEach((u) => {
        // Spread didahulukan: `key` harus tetap gabungan baris+kolom agar
        // usulan kolom yang sama pada baris berbeda tidak saling menimpa.
        keluar.push({
          ...u,
          kolom_key: u.key,
          key: kunci(baris.id, u.key),
          baris_id: baris.id,
          nama_data: baris.nama_data,
        });
      });
    });
    return keluar;
  }, [data]);

  // Pratinjau baru membatalkan centang dan suntingan lama. Penyesuaian state
  // dilakukan saat render — bukan di dalam efek — sesuai pola React untuk
  // "state yang mengikuti perubahan sumber data".
  if (pilihan.sumber !== data) {
    setPilihan({ sumber: data, override: {}, suntingan: {} });
  }

  /** Centang baku mengikuti tingkat keyakinan usulan. */
  const terpilihNya = (u) =>
    u.key in pilihan.override
      ? pilihan.override[u.key]
      : KEYAKINAN[u.keyakinan]?.pilihBaku !== false;

  const setCentang = (key, nilai) =>
    setPilihan((s) => ({ ...s, override: { ...s.override, [key]: nilai } }));

  const setSunting = (key, nilai) =>
    setPilihan((s) => ({ ...s, suntingan: { ...s.suntingan, [key]: nilai } }));

  const nilaiAkhir = (u) => (u.key in pilihan.suntingan ? pilihan.suntingan[u.key] : u.nilai);
  const jumlahTerpilih = usulan.filter(terpilihNya).length;

  const terapkan = useMutation({
    mutationFn: () => {
      const perBaris = new Map();
      usulan
        .filter(terpilihNya)
        .forEach((u) => {
          if (!perBaris.has(u.baris_id)) perBaris.set(u.baris_id, { id: u.baris_id, nilai: {} });
          const entri = perBaris.get(u.baris_id);
          entri.nilai[u.kolom_key] = nilaiAkhir(u);
          if (u.id_ddp_status) entri.id_ddp_status = u.id_ddp_status;
        });
      return sdiDaftarDataApi.terapkanAutofill([...perBaris.values()]);
    },
    onSuccess: (res) => {
      message.success(res?.data?.message || 'Pengisian otomatis diterapkan');
      queryClient.invalidateQueries({ queryKey: sdiKeys.all });
      onClose();
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Gagal menerapkan pengisian otomatis'),
  });

  const simpanPortal = (nilai) => {
    setPortalDaerah(nilai);
    if (nilai) localStorage.setItem(KUNCI_PORTAL_DAERAH, nilai);
    else localStorage.removeItem(KUNCI_PORTAL_DAERAH);
  };

  const columns = [
    {
      title: '',
      key: 'pilih',
      width: 44,
      render: (_, u) => (
        <Checkbox checked={terpilihNya(u)} onChange={(e) => setCentang(u.key, e.target.checked)} />
      ),
    },
    { title: 'Baris', dataIndex: 'nama_data', width: 220, ellipsis: true },
    {
      title: 'Kolom',
      key: 'kolom',
      width: 170,
      render: (_, u) => (
        <span>
          <Text type="secondary">({u.no})</Text> {u.label}
        </span>
      ),
    },
    {
      title: 'Nilai Usulan',
      key: 'nilai',
      render: (_, u) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Input
            size="small"
            value={nilaiAkhir(u)}
            placeholder={u.id_ddp_status ? '(sengaja dikosongkan)' : ''}
            onChange={(e) => setSunting(u.key, e.target.value)}
          />
          {u.alternatif && (
            <Tooltip title={u.alternatif.alasan}>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 18, fontSize: 12 }}
                onClick={() => setSunting(u.key, u.alternatif.nilai)}
              >
                Pakai alternatif: {u.alternatif.nilai}
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Dasar',
      key: 'keyakinan',
      width: 110,
      render: (_, u) => (
        <Tooltip title={u.alasan}>
          <Tag color={KEYAKINAN[u.keyakinan]?.color}>{KEYAKINAN[u.keyakinan]?.label || u.keyakinan}</Tag>
        </Tooltip>
      ),
    },
  ];

  return (
    <Modal
      title="Pengisian Otomatis Kolom Verifikasi"
      open={open}
      onCancel={onClose}
      width={1080}
      okText={`Terapkan ${jumlahTerpilih} usulan`}
      okButtonProps={{ disabled: !jumlahTerpilih }}
      confirmLoading={terapkan.isPending}
      onOk={() => terapkan.mutate()}
      cancelText="Batal"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Setiap usulan dapat disunting sebelum disimpan"
        description="Usulan berkeyakinan Tinggi dan Sedang tercentang otomatis. Usulan Rendah — tautan portal — tidak tercentang karena datasetnya belum tentu sudah diunggah; tautan mati justru gagal saat diverifikasi."
      />

      <Space wrap style={{ marginBottom: 12, width: '100%' }}>
        <Input
          addonBefore="Portal Data Daerah"
          placeholder="https://data.contohprov.go.id"
          value={portalDaerah}
          onChange={(e) => simpanPortal(e.target.value)}
          style={{ width: 400 }}
          allowClear
        />
        <Checkbox
          checked={usulkanPortalSdi}
          onChange={(e) => setUsulkanPortalSdi(e.target.checked)}
        >
          Usulkan tautan Portal SDI
        </Checkbox>
        <Checkbox checked={!hanyaKosong} onChange={(e) => setHanyaKosong(!e.target.checked)}>
          Timpa kolom yang sudah terisi
        </Checkbox>
        <Button onClick={() => refetch()} loading={isFetching}>
          🔄 Muat Ulang Usulan
        </Button>
      </Space>

      <Select
        mode="multiple"
        style={{ width: '100%', marginBottom: 12 }}
        value={kolom}
        onChange={setKolom}
        options={KOLOM_AUTOFILL.map((k) => ({ value: k.key, label: `(${k.no}) ${k.label}` }))}
        placeholder="Kolom yang diisi otomatis"
      />

      {!usulan.length ? (
        <Empty
          description={
            isFetching ? 'Menyusun usulan...' : 'Tidak ada kolom yang perlu diisi otomatis'
          }
        />
      ) : (
        <>
          <Space style={{ marginBottom: 8 }}>
            <Button
              size="small"
              onClick={() =>
                setPilihan((s) => ({
                  ...s,
                  override: Object.fromEntries(usulan.map((u) => [u.key, true])),
                }))
              }
            >
              Centang semua
            </Button>
            <Button
              size="small"
              onClick={() =>
                setPilihan((s) => ({
                  ...s,
                  override: Object.fromEntries(usulan.map((u) => [u.key, false])),
                }))
              }
            >
              Kosongkan centang
            </Button>
            <Text type="secondary">
              {data?.baris_terdampak} baris, {usulan.length} usulan
            </Text>
          </Space>
          <Table
            size="small"
            rowKey="key"
            columns={columns}
            dataSource={usulan}
            pagination={{ pageSize: 12, showSizeChanger: false }}
            scroll={{ y: 380 }}
          />
        </>
      )}
    </Modal>
  );
};

export default SdiAutofillModal;
