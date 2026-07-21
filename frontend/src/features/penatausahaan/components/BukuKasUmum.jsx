import React from 'react';
import { Button, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import { createPenatausahaan, deletePenatausahaan, updatePenatausahaan } from '../services/penatausahaanApi';

const JENIS_TRANSAKSI_COLOR = {
  KKPD: 'blue',
  UP_GU: 'purple',
  TU: 'gold',
  LS: 'green',
};

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const formatPersen = (val) => `${(Number(val) || 0).toFixed(2)}%`;

export const PENATAUSAHAAN_QUERY_KEY = (tahun) => ['penatausahaan', 'list', String(tahun || '')];

// Bandingkan kode rekening/program/kegiatan/sub-kegiatan segmen-per-segmen
// secara numerik (bukan alfabetis) supaya urutannya benar walau import PDF-nya
// tidak berurutan sama sekali — mis. "2.9" tidak boleh dianggap lebih besar
// dari "2.10" kalau dibandingkan sbg teks biasa.
const bandingkanKode = (a, b) => {
  const pa = String(a || '').split(/[.-]/).filter(Boolean).map(Number);
  const pb = String(b || '').split(/[.-]/).filter(Boolean).map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = Number.isFinite(pa[i]) ? pa[i] : 0;
    const nb = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (na !== nb) return na - nb;
  }
  return 0;
};

// Pisahkan "5.1.02.01.01.0039 - Belanja Barang untuk Dijual..." (format yang
// dipakai saat import realisasi PDF SIPD) jadi kode rekening & nama rekening
// terpisah, supaya bisa ditampilkan rapi per level seperti tampilan SIPD asli.
const pisahKodeUraian = (uraian) => {
  const raw = String(uraian || '');
  const match = raw.match(/^([\d.]{9,})\s*-\s*(.*)$/);
  if (match) return { kode_rekening: match[1], nama_rekening: match[2] };
  return { kode_rekening: null, nama_rekening: raw };
};

// Susun pohon Program -> Kegiatan -> Sub Kegiatan -> Item Belanja (kode
// rekening). PENTING: pohon dibangun dari SELURUH baris DPA aktif tahun
// berjalan (bukan cuma dari baris Penatausahaan yang sudah diimpor), supaya
// setiap sub kegiatan tetap tampil dengan Anggaran penuh walau realisasinya
// belum diimpor — kalau sumbernya cuma dari Penatausahaan, sub kegiatan yang
// belum diimpor jadi hilang total dari pohon dan Anggaran per Program jadi
// jauh lebih kecil dari nilai DPA sebenarnya (inilah penyebab selisih besar
// dibanding tampilan SIPD). Realisasi dari Penatausahaan digabungkan per
// dpa_id ke sub kegiatan yang bersangkutan; sub kegiatan tanpa realisasi tetap
// tampil dengan Realisasi = 0 dan tanpa anak item belanja.
const buildTree = (dpaRows, penatausahaanRows) => {
  const realisasiByDpaId = new Map();
  penatausahaanRows.forEach((r) => {
    if (!r.dpa_id) return;
    if (!realisasiByDpaId.has(r.dpa_id)) realisasiByDpaId.set(r.dpa_id, new Map());
    const itemMap = realisasiByDpaId.get(r.dpa_id);
    const { kode_rekening, nama_rekening } = pisahKodeUraian(r.uraian);
    const itemKey = kode_rekening || r.uraian;
    if (!itemMap.has(itemKey)) {
      itemMap.set(itemKey, { kode_rekening, nama_rekening, realisasi: 0, jenisSet: new Set(), rows: [] });
    }
    const item = itemMap.get(itemKey);
    item.realisasi += Number(r.jumlah) || 0;
    if (r.jenis_transaksi) item.jenisSet.add(r.jenis_transaksi);
    item.rows.push(r);
  });

  const programMap = new Map();

  dpaRows.forEach((dpa) => {
    const progKey = dpa.kode_program || `_${dpa.program || 'tanpa-program'}`;
    if (!programMap.has(progKey)) {
      programMap.set(progKey, {
        key: `prog-${progKey}`,
        kode: dpa.kode_program,
        nama: dpa.program,
        kegiatanMap: new Map(),
      });
    }
    const prog = programMap.get(progKey);

    const kegKey = dpa.kode_kegiatan || `_${dpa.kegiatan || 'tanpa-kegiatan'}`;
    if (!prog.kegiatanMap.has(kegKey)) {
      prog.kegiatanMap.set(kegKey, {
        key: `keg-${progKey}-${kegKey}`,
        kode: dpa.kode_kegiatan,
        nama: dpa.kegiatan,
        subKegiatanMap: new Map(),
      });
    }
    const keg = prog.kegiatanMap.get(kegKey);

    const subKey = dpa.kode_sub_kegiatan || `_${dpa.sub_kegiatan || 'tanpa-sub'}_${dpa.id}`;
    const itemMap = realisasiByDpaId.get(dpa.id) || new Map();
    keg.subKegiatanMap.set(subKey, {
      key: `subkeg-${progKey}-${kegKey}-${subKey}`,
      kode: dpa.kode_sub_kegiatan,
      nama: dpa.sub_kegiatan,
      anggaran: Number(dpa.anggaran) || 0,
      sudahDiimpor: itemMap.size > 0,
      dpaId: dpa.id,
      itemMap,
    });
  });

  const programList = Array.from(programMap.values()).sort((a, b) => bandingkanKode(a.kode, b.kode));

  return programList.map((prog) => {
    const kegiatanList = Array.from(prog.kegiatanMap.values())
      .sort((a, b) => bandingkanKode(a.kode, b.kode))
      .map((keg) => {
        const subKegiatanList = Array.from(keg.subKegiatanMap.values())
          .sort((a, b) => bandingkanKode(a.kode, b.kode))
          .map((sk) => {
            const itemList = Array.from(sk.itemMap.entries())
              .sort(([, a], [, b]) => bandingkanKode(a.kode_rekening, b.kode_rekening))
              .map(([itemKey, item]) => ({
                key: `item-${sk.key}-${itemKey}`,
                level: 'item',
                kode: item.kode_rekening,
                nama: item.nama_rekening,
                realisasi: item.realisasi,
                jenisList: Array.from(item.jenisSet),
                rows: item.rows,
              }));
            const skRealisasi = itemList.reduce((s, i) => s + i.realisasi, 0);
            return {
              key: sk.key,
              level: 'subkegiatan',
              kode: sk.kode,
              nama: sk.nama,
              anggaran: sk.anggaran,
              realisasi: skRealisasi,
              sudahDiimpor: sk.sudahDiimpor,
              dpaId: sk.dpaId,
              itemCount: itemList.length,
              children: itemList,
            };
          });
        const kegAnggaran = subKegiatanList.reduce((s, sk) => s + sk.anggaran, 0);
        const kegRealisasi = subKegiatanList.reduce((s, sk) => s + sk.realisasi, 0);
        return {
          key: keg.key,
          level: 'kegiatan',
          kode: keg.kode,
          nama: keg.nama,
          anggaran: kegAnggaran,
          realisasi: kegRealisasi,
          subCount: subKegiatanList.length,
          children: subKegiatanList,
        };
      });
    const progAnggaran = kegiatanList.reduce((s, k) => s + k.anggaran, 0);
    const progRealisasi = kegiatanList.reduce((s, k) => s + k.realisasi, 0);
    return {
      key: prog.key,
      level: 'program',
      kode: prog.kode,
      nama: prog.nama,
      anggaran: progAnggaran,
      realisasi: progRealisasi,
      kegiatanCount: kegiatanList.length,
      children: kegiatanList,
    };
  });
};

// Baris di dalam modal detail item belanja — satu kode rekening bisa berasal
// dari beberapa baris Penatausahaan (mis. diimpor dari beberapa berkas PDF
// berbeda), jadi Edit/Delete menyasar satu baris transaksi asli, bukan angka
// gabungannya, supaya koreksi (mis. salah baca OCR) tepat sasaran.
const ItemDetailRow = ({ row, onSaved, onDeleted }) => {
  const [editing, setEditing] = React.useState(false);
  const [form] = Form.useForm();

  const updateMutation = useMutation({
    mutationFn: (data) => updatePenatausahaan(row.id, data),
    onSuccess: () => {
      toast.success('Transaksi berhasil diperbarui.');
      setEditing(false);
      onSaved();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Gagal memperbarui transaksi.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePenatausahaan(row.id),
    onSuccess: () => {
      toast.success('Transaksi berhasil dihapus.');
      onDeleted();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Gagal menghapus transaksi.');
    },
  });

  if (editing) {
    return (
      <Form
        form={form}
        layout="inline"
        initialValues={{ jumlah: row.jumlah, jenis_transaksi: row.jenis_transaksi }}
        onFinish={(values) => updateMutation.mutate(values)}
        style={{ padding: '8px 0', flexWrap: 'wrap', rowGap: 8 }}
      >
        <Form.Item name="jumlah" rules={[{ required: true, message: 'Wajib diisi' }]}>
          <InputNumber
            style={{ width: 200 }}
            min={0}
            precision={2}
            formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(v) => v.replace(/Rp\s?|\./g, '')}
          />
        </Form.Item>
        <Form.Item name="jenis_transaksi">
          <Select
            style={{ width: 120 }}
            allowClear
            placeholder="Jenis"
            options={['KKPD', 'UP_GU', 'TU', 'LS'].map((j) => ({ value: j, label: j }))}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" size="small" htmlType="submit" loading={updateMutation.isPending}>
              Simpan
            </Button>
            <Button size="small" onClick={() => setEditing(false)}>
              Batal
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', gap: 12 }}>
      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>{formatRupiah(row.jumlah)}</div>
        <div style={{ color: '#8c8c8c' }}>
          {row.jenis_transaksi && <Tag color={JENIS_TRANSAKSI_COLOR[row.jenis_transaksi] || 'default'}>{row.jenis_transaksi}</Tag>}
          {row.bukti}
        </div>
      </div>
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Popconfirm
          title="Hapus transaksi ini?"
          description="Nilai Realisasi pada item ini akan berkurang setelah dihapus."
          okText="Hapus"
          okButtonProps={{ danger: true }}
          cancelText="Batal"
          onConfirm={() => deleteMutation.mutate()}
        >
          <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
            Hapus
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
};

const JENIS_TRANSAKSI_LIST = Object.keys(JENIS_TRANSAKSI_COLOR);

const rupiahInputProps = {
  min: 0,
  precision: 2,
  formatter: (v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  parser: (v) => v.replace(/Rp\s?|\./g, ''),
};

// Form tambah item belanja manual — dipakai saat OCR import PDF SIPD sama
// sekali tidak mendeteksi satu baris rincian sebagai anchor (bukan salah
// baca nilai, tapi barisnya tidak pernah masuk ke Penatausahaan). Kode
// rekening wajib berformat "x.x.xx.xx.xx.xxxx" (>=9 karakter angka/titik)
// supaya cocok dengan pola pisahKodeUraian() dan tampil sebagai item di pohon.
// Satu item belanja bisa punya nilai di lebih dari satu jenis transaksi
// sekaligus (mis. TU + LS) — persis seperti kolom rincian di PDF SIPD dan
// cara import PDF membuat baris terpisah per jenis — jadi formnya menyediakan
// satu kolom jumlah per jenis transaksi, bukan satu jumlah + satu dropdown.
const TambahItemForm = ({ subKegiatan, tahun, onClose, onCreated }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = React.useState(false);

  const handleFinish = async (values) => {
    const entries = JENIS_TRANSAKSI_LIST.map((jenis) => ({ jenis, jumlah: Number(values[jenis]) || 0 })).filter(
      (e) => e.jumlah > 0
    );
    if (!entries.length) {
      toast.error('Isi minimal salah satu jumlah (KKPD/UP_GU/TU/LS) sesuai rincian di PDF SIPD.');
      return;
    }

    setSubmitting(true);
    try {
      for (const entry of entries) {
        await createPenatausahaan({
          dpa_id: subKegiatan.dpaId,
          tahun: String(tahun),
          kode_rekening: values.kode_rekening,
          nama_rekening: values.nama_rekening,
          jumlah: entry.jumlah,
          jenis_transaksi: entry.jenis,
        });
      }
      toast.success(
        entries.length > 1
          ? `Item belanja berhasil ditambahkan (${entries.length} jenis transaksi).`
          : 'Item belanja berhasil ditambahkan.'
      );
      form.resetFields();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Gagal menambahkan item belanja.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="kode_rekening"
        label="Kode Rekening"
        rules={[
          { required: true, message: 'Kode rekening wajib diisi' },
          { pattern: /^[\d.]{9,}$/, message: 'Format harus angka & titik, mis. 5.1.02.01.02.0001' },
        ]}
      >
        <Input placeholder="5.1.02.01.02.0001" />
      </Form.Item>
      <Form.Item name="nama_rekening" label="Nama Rekening" rules={[{ required: true, message: 'Nama rekening wajib diisi' }]}>
        <Input placeholder="Belanja Perjalanan Dinas Biasa" />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {JENIS_TRANSAKSI_LIST.map((jenis) => (
          <Form.Item key={jenis} name={jenis} label={`Jumlah ${jenis}`}>
            <InputNumber style={{ width: '100%' }} {...rupiahInputProps} />
          </Form.Item>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: -8, marginBottom: 16 }}>
        Isi kolom sesuai rincian per jenis transaksi di PDF SIPD — boleh diisi lebih dari satu jenis untuk item belanja
        yang sama.
      </div>
      <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Simpan
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

const BukuKasUmum = ({ tahun }) => {
  const queryClient = useQueryClient();
  const [detailItemKey, setDetailItemKey] = React.useState(null);
  const [addForSubKegiatan, setAddForSubKegiatan] = React.useState(null);

  const { data: rows = [], isFetching } = useQuery({
    queryKey: PENATAUSAHAAN_QUERY_KEY(tahun),
    queryFn: async () => {
      const res = await api.get('/penatausahaan', { params: tahun ? { tahun } : {} });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  // Sumber utama pohon Anggaran: SELURUH DPA aktif tahun berjalan, bukan cuma
  // yang sudah ada transaksi Penatausahaan-nya — lihat komentar buildTree().
  const { data: dpaRows = [], isFetching: isFetchingDpa } = useQuery({
    queryKey: ['dpa', 'list-for-buku-kas', String(tahun || '')],
    queryFn: async () => {
      const res = await api.get('/dpa', { params: tahun ? { tahun } : {} });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return data.filter((r) => r.is_active_version !== false);
    },
  });

  const treeData = React.useMemo(() => buildTree(dpaRows, rows), [dpaRows, rows]);

  const refreshAfterChange = () => queryClient.invalidateQueries({ queryKey: PENATAUSAHAAN_QUERY_KEY(tahun) });

  // Ambil item yang sedang dibuka di modal langsung dari treeData (bukan dari
  // snapshot state) supaya nilai di modal selalu ikut segar setelah
  // edit/hapus/refetch — hanya key-nya yang disimpan di state.
  const detailItem = React.useMemo(() => {
    if (!detailItemKey) return null;
    return (
      treeData
        .flatMap((p) => p.children)
        .flatMap((k) => k.children)
        .flatMap((sk) => sk.children)
        .find((it) => it.key === detailItemKey) || null
    );
  }, [treeData, detailItemKey]);

  const columns = [
    {
      title: '',
      key: 'levelIcon',
      width: 32,
      align: 'center',
      render: (_, r) => {
        if (r.level === 'program') return <span style={{ fontSize: 14 }}>📁</span>;
        if (r.level === 'kegiatan') return <span style={{ fontSize: 13 }}>📂</span>;
        if (r.level === 'subkegiatan') return <span style={{ fontSize: 13 }}>🗂️</span>;
        return <span style={{ fontSize: 12, color: '#bfbfbf' }}>📄</span>;
      },
    },
    {
      title: 'Program / Kegiatan / Sub Kegiatan / Item Belanja',
      key: 'uraian',
      render: (_, r) => {
        if (r.level === 'program') {
          return (
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0958d9' }}>
              {r.kode && <span style={{ marginRight: 6 }}>{r.kode}</span>}
              {r.nama || '—'}
              <Tag style={{ marginLeft: 8, fontWeight: 400 }} color="blue">
                {r.kegiatanCount} kegiatan
              </Tag>
            </div>
          );
        }
        if (r.level === 'kegiatan') {
          return (
            <div style={{ fontWeight: 600, fontSize: 13, color: '#389e0d' }}>
              {r.kode && <span style={{ color: '#8c8c8c', marginRight: 6 }}>{r.kode}</span>}
              {r.nama || '—'}
              <Tag style={{ marginLeft: 8, fontWeight: 400 }} color="green">
                {r.subCount} sub kegiatan
              </Tag>
            </div>
          );
        }
        if (r.level === 'subkegiatan') {
          return (
            <div style={{ fontSize: 12, color: '#595959', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>
                {r.kode && <span style={{ marginRight: 4, fontWeight: 600 }}>{r.kode}</span>}
                {r.nama || '—'}
                {r.sudahDiimpor ? (
                  <Tag style={{ marginLeft: 8, fontWeight: 400 }} color="purple">
                    {r.itemCount} item belanja
                  </Tag>
                ) : (
                  <Tag style={{ marginLeft: 8, fontWeight: 400 }} color="default">
                    Belum diimpor realisasinya
                  </Tag>
                )}
              </span>
              <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => setAddForSubKegiatan(r)}>
                Tambah Item
              </Button>
            </div>
          );
        }
        // level 'item' (leaf): kode rekening + nama rekening item belanja
        return (
          <div style={{ fontSize: 12, color: '#595959', paddingLeft: 4 }}>
            ↳ {r.kode && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  background: '#f5f5f5',
                  padding: '1px 5px',
                  borderRadius: 3,
                  border: '1px solid #d9d9d9',
                  marginRight: 6,
                }}
              >
                {r.kode}
              </span>
            )}
            {r.nama || '-'}
          </div>
        );
      },
    },
    {
      title: 'Anggaran',
      dataIndex: 'anggaran',
      key: 'anggaran',
      width: 150,
      align: 'right',
      render: (v, r) => (r.level === 'item' ? null : <span style={{ fontWeight: 700, fontSize: 13 }}>{formatRupiah(v)}</span>),
    },
    {
      title: 'Realisasi',
      dataIndex: 'realisasi',
      key: 'realisasi',
      width: 150,
      align: 'right',
      render: (v) => (
        <span style={{ fontWeight: 700, fontSize: 13, color: v > 0 ? '#0958d9' : '#bfbfbf' }}>{formatRupiah(v)}</span>
      ),
    },
    {
      title: '% Capaian',
      key: 'capaian',
      width: 100,
      align: 'center',
      render: (_, r) => {
        if (r.level === 'item' || !r.anggaran) return null;
        const persen = (r.realisasi / r.anggaran) * 100;
        return (
          <Tag color={persen >= 100 ? 'success' : persen >= 75 ? 'processing' : 'default'}>{formatPersen(persen)}</Tag>
        );
      },
    },
    {
      title: 'Jenis Transaksi',
      key: 'jenis',
      width: 180,
      align: 'center',
      render: (_, r) =>
        r.level === 'item'
          ? r.jenisList.map((j) => (
              <Tag key={j} color={JENIS_TRANSAKSI_COLOR[j] || 'default'}>
                {j}
              </Tag>
            ))
          : null,
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 90,
      align: 'center',
      render: (_, r) =>
        r.level === 'item' ? (
          <Button size="small" onClick={() => setDetailItemKey(r.key)}>
            Aksi
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <Table
        rowKey="key"
        size="middle"
        loading={isFetching || isFetchingDpa}
        columns={columns}
        dataSource={treeData}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} program` }}
        expandable={{ defaultExpandAllRows: true, indentSize: 20 }}
        scroll={{ x: 950 }}
        rowClassName={(record) => {
          if (record.level === 'program') return 'penatausahaan-tree-program';
          if (record.level === 'kegiatan') return 'penatausahaan-tree-kegiatan';
          if (record.level === 'subkegiatan') return 'penatausahaan-tree-subkegiatan';
          return '';
        }}
        locale={{
          emptyText: (
            <Empty
              description={`Belum ada transaksi Penatausahaan untuk tahun ${tahun || '-'}. Impor realisasi PDF SIPD lewat tombol di atas untuk mulai mengisi Buku Kas Umum ini.`}
            />
          ),
        }}
      />
      <style>{`
        .penatausahaan-tree-program td { background: #e6f4ff !important; border-top: 2px solid #91caff !important; }
        .penatausahaan-tree-kegiatan td { background: #f6ffed !important; }
        .penatausahaan-tree-subkegiatan td { background: #f9f0ff !important; }
      `}</style>
      <Modal
        title={
          <>
            Detail Transaksi — {detailItem?.kode} {detailItem?.nama}
          </>
        }
        open={!!detailItemKey}
        onCancel={() => setDetailItemKey(null)}
        footer={
          <Button onClick={() => setDetailItemKey(null)}>Tutup</Button>
        }
        width={560}
      >
        {detailItem?.rows.map((row, idx) => (
          <React.Fragment key={row.id}>
            {idx > 0 && <div style={{ borderTop: '1px solid #f0f0f0' }} />}
            <ItemDetailRow row={row} onSaved={refreshAfterChange} onDeleted={refreshAfterChange} />
          </React.Fragment>
        ))}
        {(!detailItem || detailItem.rows.length === 0) && (
          <Empty description="Transaksi ini sudah dihapus." />
        )}
      </Modal>
      <Modal
        title={
          <>
            Tambah Item Belanja — {addForSubKegiatan?.kode} {addForSubKegiatan?.nama}
          </>
        }
        open={!!addForSubKegiatan}
        onCancel={() => setAddForSubKegiatan(null)}
        footer={null}
        destroyOnClose
      >
        {addForSubKegiatan && (
          <TambahItemForm
            subKegiatan={addForSubKegiatan}
            tahun={tahun}
            onClose={() => setAddForSubKegiatan(null)}
            onCreated={refreshAfterChange}
          />
        )}
      </Modal>
    </>
  );
};

export default BukuKasUmum;
