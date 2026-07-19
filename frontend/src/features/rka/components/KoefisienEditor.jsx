import React from 'react';
import { Input, InputNumber, Button } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';

import { tambahKoefisien, hapusKoefisien, updateKoefisien } from '../utils/koefisienHelper';

const KoefisienEditor = ({ value = [], ppn = 0, onPpnChange, onChange }) => {
  const koefisien = Array.isArray(value) && value.length ? value : [{ volume: 1, satuan: 'unit' }];

  const triggerChange = (baru) => {
    if (typeof onChange === 'function') {
      onChange(baru);
    }
  };

  return (
    <div>
      {koefisien.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
          }}
        >
          <InputNumber
            min={1}
            controls={false}
            keyboard
            value={item.volume}
            style={{
              width: 80,
            }}
            onChange={(value) => triggerChange(updateKoefisien(koefisien, index, 'volume', value))}
          />

          <Input
            value={item.satuan}
            placeholder="Satuan"
            style={{
              flex: 1,
            }}
            onChange={(e) =>
              triggerChange(updateKoefisien(koefisien, index, 'satuan', e.target.value))
            }
          />

          <Button
            type="text"
            danger
            disabled={koefisien.length <= 1}
            icon={<MinusCircleOutlined />}
            onClick={() => triggerChange(hapusKoefisien(koefisien, index))}
          />
        </div>
      ))}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        size="small"
        block
        onClick={() => triggerChange(tambahKoefisien(koefisien))}
      >
        Tambah Koefisien
      </Button>
      <div
        style={{
          marginTop: 14,
          borderTop: '1px dashed #d9d9d9',
          paddingTop: 10,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          PPN
        </div>

        <Input
          value={ppn}
          suffix="%"
          style={{
            width: 90,
          }}
          onChange={(e) => onPpnChange?.(Number(e.target.value) || 0)}
        />
      </div>
    </div>
  );
};

export default KoefisienEditor;
