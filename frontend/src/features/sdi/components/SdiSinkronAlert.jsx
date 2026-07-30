import React, { useState } from 'react';
import { Alert, Button, Modal, Table, Tag, Typography, Space, App } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STATUS_BARIS } from '../constants/sdiDaftarDataConstants';
import { sdiDaftarDataApi, sdiKeys } from '../services/sdiDaftarDataApi';

const { Text } = Typography;

/**
 * Pemberitahuan bahwa sebagian baris Daftar Data sudah tertinggal dari
 * indikator Renstra sumbernya.
 *
 * Baris berstatus Draft diselaraskan otomatis oleh server begitu indikator
 * Renstra disunting, jadi yang biasanya muncul di sini hanyalah baris
 * Diverifikasi/Final — yang sengaja menunggu persetujuan karena sudah menjadi
 * bagian dokumen resmi — serta baris yang indikator sumbernya telah dihapus.
 */
const SdiSinkronAlert = ({ renstraId, tahun }) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [buka, setBuka] = useState(false);

  const params = { renstra_id: renstraId, tahun };
  const { data } = useQuery({
    queryKey: sdiKeys.sinkron(params),
    enabled: !!renstraId,
    queryFn: () => sdiDaftarDataApi.periksaSinkron(params),
  });

  const segarkan = useMutation({
    mutationFn: (ids) => sdiDaftarDataApi.segarkanSinkron({ ...params, ids }),
    onSuccess: (res) => {
      message.success(res?.data?.message || 'Baris diselaraskan');
      queryClient.invalidateQueries({ queryKey: sdiKeys.all });
      setBuka(false);
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Gagal menyelaraskan baris'),
  });

  const jumlah = (data?.tidak_sinkron || 0) + (data?.sumber_hilang || 0);
  if (!jumlah) return null;

  const bagian = [
    data?.tidak_sinkron ? `${data.tidak_sinkron} baris tertinggal dari Renstra` : null,
    data?.sumber_hilang ? `${data.sumber_hilang} baris indikator sumbernya sudah dihapus` : null,
  ].filter(Boolean);

  return (
    <>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={bagian.join(' dan ')}
        description="Baris berstatus Draft diselaraskan otomatis. Baris Diverifikasi dan Final menunggu persetujuan Anda karena sudah menjadi bagian dokumen resmi."
        action={
          <Button size="small" onClick={() => setBuka(true)}>
            Tinjau
          </Button>
        }
      />

      <Modal
        title="Perbedaan terhadap Indikator Renstra"
        open={buka}
        onCancel={() => setBuka(false)}
        width={920}
        okText={`Selaraskan ${data?.tidak_sinkron || 0} baris`}
        okButtonProps={{ disabled: !data?.tidak_sinkron }}
        confirmLoading={segarkan.isPending}
        onOk={() =>
          segarkan.mutate((data?.data || []).filter((d) => !d.sumber_hilang).map((d) => d.id))
        }
        cancelText="Tutup"
      >
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          dataSource={data?.data || []}
          columns={[
            { title: 'Baris', dataIndex: 'nama_data', width: 230, ellipsis: true },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 110,
              render: (v) => <Tag color={STATUS_BARIS[v]?.color}>{STATUS_BARIS[v]?.label || v}</Tag>,
            },
            {
              title: 'Perbedaan',
              key: 'selisih',
              render: (_, r) =>
                r.sumber_hilang ? (
                  <Text type="danger">
                    Indikator sumber sudah tidak ada di Renstra. Baris dibiarkan apa adanya —
                    periksa apakah masih perlu dilaporkan.
                  </Text>
                ) : (
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {r.selisih.map((s) => (
                      <div key={s.key} style={{ fontSize: 12 }}>
                        <Text type="secondary">({s.no})</Text> <strong>{s.label}</strong>
                        <div>
                          <Text delete type="secondary">
                            {s.sekarang || '(kosong)'}
                          </Text>
                          {' → '}
                          <Text type="success">{s.seharusnya || '(kosong)'}</Text>
                        </div>
                      </div>
                    ))}
                  </Space>
                ),
            },
          ]}
        />
      </Modal>
    </>
  );
};

export default SdiSinkronAlert;
