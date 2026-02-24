import React from 'react';
import BukuKasUmum from '../components/BukuKasUmum';
import UploadSKForm from '../components/UploadSKForm';
import UploadBuktiForm from '../components/UploadBuktiForm';

const PenatausahaanDashboard = () => {
  return (
    <div>
      <h1>Dashboard Penatausahaan Keuangan</h1>
      <BukuKasUmum />
      <UploadSKForm />
      <UploadBuktiForm />
    </div>
  );
};

export default PenatausahaanDashboard;
