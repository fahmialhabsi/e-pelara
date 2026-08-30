const syntheticSecret = 'AUDIT_ONLY_DUMMY_NOT_A_REAL_CREDENTIAL';

const auditSyntheticFixtures = Object.freeze({
  tenants: [
    { id: 101, code: 'AUDIT-TENANT-A', name: 'Synthetic Tenant A' },
    { id: 202, code: 'AUDIT-TENANT-B', name: 'Synthetic Tenant B' },
  ],
  opds: [
    { id: 1101, tenant_id: 101, code: 'AUDIT-OPD-A1', name: 'Synthetic OPD A1' },
    { id: 2201, tenant_id: 202, code: 'AUDIT-OPD-B1', name: 'Synthetic OPD B1' },
  ],
  users: [
    { id: 10001, tenant_id: 101, opd_id: 1101, role: 'SUPER_ADMIN', active: true },
    { id: 10002, tenant_id: 101, opd_id: 1101, role: 'ADMINISTRATOR', active: true },
    { id: 10003, tenant_id: 202, opd_id: 2201, role: 'ADMINISTRATOR', active: true },
    { id: 10004, tenant_id: 101, opd_id: 1101, role: 'PENGAWAS', active: true },
    { id: 10005, tenant_id: 101, opd_id: 1101, role: 'PELAKSANA', active: true },
    { id: 10006, tenant_id: null, opd_id: null, role: 'PELAKSANA', active: true },
    { id: 10007, tenant_id: 101, opd_id: 1101, role: 'PELAKSANA', active: false },
    { id: 10008, tenant_id: 101, opd_id: 1101, role: 'ADMINISTRATOR', active: true, target_role: 'SUPER_ADMIN' },
    { id: 10009, tenant_id: 101, opd_id: 1101, role: 'ADMINISTRATOR', active: true, target_role: 'ADMINISTRATOR' },
    { id: 10010, tenant_id: 101, opd_id: 1101, role: 'ADMINISTRATOR', active: true, target_role: 'PELAKSANA' },
  ],
  business_domains: [
    'RPJMD',
    'RKPD',
    'RENJA',
    'RENJA_PERUBAHAN',
    'RENSTRA',
    'RKA',
    'DPA',
    'DPA_PERGESERAN',
    'DPA_PERUBAHAN',
    'JURNAL',
    'SALDO',
    'BKU',
    'TUTUP_BUKU',
    'LRA',
    'MR_LHP',
    'MR_TEMUAN',
    'MR_TINDAK_LANJUT',
    'DOKUMEN_RESMI',
    'ESIGAP_COMMAND',
  ],
  records: [
    { domain: 'DPA', id: 30101, tenant_id: 101, opd_id: 1101, classification: 'internal', amount: '1000000.00' },
    { domain: 'DPA', id: 30201, tenant_id: 202, opd_id: 2201, classification: 'internal', amount: '2000000.00' },
    { domain: 'JURNAL', id: 40101, tenant_id: 101, opd_id: 1101, classification: 'restricted', amount: '1000.10' },
    { domain: 'JURNAL', id: 40201, tenant_id: 202, opd_id: 2201, classification: 'restricted', amount: '2000.20' },
    { domain: 'MR_TEMUAN', id: 50101, tenant_id: 101, opd_id: 1101, classification: 'restricted' },
    { domain: 'MR_TEMUAN', id: 50201, tenant_id: 202, opd_id: 2201, classification: 'restricted' },
    { domain: 'DOKUMEN_RESMI', id: 60101, tenant_id: 101, opd_id: 1101, classification: 'confidential', file_name: 'synthetic-document-a.pdf' },
    { domain: 'DOKUMEN_RESMI', id: 60201, tenant_id: 202, opd_id: 2201, classification: 'confidential', file_name: 'synthetic-document-b.pdf' },
  ],
  account_registry: [
    { id: 70101, tenant_id: 101, provider: 'synthetic-provider-a', secret: syntheticSecret },
    { id: 70201, tenant_id: 202, provider: 'synthetic-provider-b', secret: syntheticSecret },
  ],
  payloads: {
    html: '<img src=x onerror=alert(1)>',
    traversal: '../../synthetic-file.txt',
    svg: '<svg><script>alert(1)</script></svg>',
    dangerous_url: 'javascript:alert(1)',
  },
});

module.exports = { auditSyntheticFixtures, syntheticSecret };
