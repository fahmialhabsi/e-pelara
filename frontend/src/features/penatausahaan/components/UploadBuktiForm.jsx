import React from 'react';
import { Card, Space, Tag, Typography, Upload, Button } from 'antd';
import { FileTextOutlined, InboxOutlined } from '@ant-design/icons';

const { Text } = Typography;

const UploadBuktiForm = () => {
  return (
    <Card
      size="small"
      title={
        <Space>
          <FileTextOutlined style={{ color: '#0958d9' }} />
          <span>Upload Bukti Pertanggungjawaban</span>
        </Space>
      }
      extra={<Tag color="default">Segera Hadir</Tag>}
      style={{ height: '100%' }}
    >
      <Upload.Dragger disabled multiple={false} style={{ background: '#fafafa' }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ color: '#bfbfbf' }} />
        </p>
        <Text type="secondary">Klik atau seret berkas bukti pertanggungjawaban ke sini</Text>
      </Upload.Dragger>
      <Button disabled block style={{ marginTop: 12 }}>
        Upload
      </Button>
    </Card>
  );
};

export default UploadBuktiForm;
