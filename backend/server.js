const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
// Eksplisit path agar dotenv selalu baca dari direktori server.js, bukan process.cwd()
require('dotenv').config({ path: path.join(__dirname, '.env') });
const morgan = require('morgan');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const logger = require('./utils/logger');
const connectRedis = require('./utils/redisClient'); // versi retry otomatis
const masterReferensiRoutes = require('./routes/masterReferensiRoutes');
const perangkatDaerahRoutes = require('./routes/perangkatDaerahRoutes');
const dashboardAgregatPaguRoutes = require('./routes/dashboardAgregatPaguRoutes');

// === HUBUNGKAN REDIS CLIENT ===
(async () => {
  try {
    const redisClient = await connectRedis(); // Redis siap pakai, otomatis retry
    if (redisClient) {
      app.set('redisClient', redisClient); // Bisa dipakai di route lain
    } else {
      console.warn('⚠️  Mode development: fitur yang memerlukan Redis akan dinonaktifkan.');
    }
  } catch (err) {
    console.error('❌ Redis gagal connect:', err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Hentikan server di production kalau Redis tidak bisa connect
    }
  }
})();

// === SETUP MIDDLEWARE ===
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:3013',
];
const allowedOrigins = Array.from(
  new Set([
    ...defaultAllowedOrigins,
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : []),
  ]),
);
const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!isAllowedOrigin(origin)) {
        return callback(
          new Error(
            'The CORS policy for this site does not allow access from the specified Origin.',
          ),
          false,
        );
      }

      return callback(null, true);
    },
    credentials: true,

    // STEP R12:
    // Agar frontend bisa membaca header Content-Disposition
    // untuk mengambil nama file download dari backend.
    exposedHeaders: ['Content-Disposition'],
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// JSON API: jangan cache di browser/proxy — hindari 304 + body kosong untuk XHR (dropdown SPA).
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Global correlation/request id untuk auditability lintas flow.
app.use('/api', (req, res, next) => {
  const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || randomUUID();
  req.request_id = String(requestId);
  req.correlation_id = String(requestId);
  res.setHeader('x-request-id', String(requestId));
  res.setHeader('x-correlation-id', String(requestId));
  next();
});

// Structured request logging baseline.
app.use('/api', (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info({
      message: 'api_request',
      request_id: req.request_id || null,
      correlation_id: req.correlation_id || null,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      status_code: res.statusCode,
      duration_ms: Date.now() - startedAt,
      user_id: req?.user?.id || req?.user?.user_id || req?.user?.userId || req?.auth?.id || null,
    });
  });
  next();
});

// Telemetry baseline (in-memory) untuk observability ringan.
const telemetryLite = {
  started_at: new Date().toISOString(),
  total_requests: 0,
  by_status: {},
  by_route: {},
};

app.use('/api', (req, res, next) => {
  telemetryLite.total_requests += 1;
  const routeKey = `${req.method} ${req.baseUrl || ''}${req.path || req.url || ''}`;
  telemetryLite.by_route[routeKey] = (telemetryLite.by_route[routeKey] || 0) + 1;
  res.on('finish', () => {
    const statusKey = String(res.statusCode || 0);
    telemetryLite.by_status[statusKey] = (telemetryLite.by_status[statusKey] || 0) + 1;
  });
  next();
});

// Health & readiness operational baseline.
app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'ok',
    service: 'e-pelara-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/readiness', (req, res) => {
  const redisClient = app.get('redisClient');
  const redisReady = !!redisClient;
  return res.status(redisReady ? 200 : 503).json({
    success: redisReady,
    status: redisReady ? 'ready' : 'degraded',
    checks: {
      redis: redisReady ? 'up' : 'down',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics-lite', (req, res) => {
  return res.status(200).json({
    success: true,
    telemetry: telemetryLite,
    timestamp: new Date().toISOString(),
  });
});

app.get('/openapi/mr-report-minimal', (req, res) => {
  return res.status(200).json({
    openapi: '3.0.3',
    info: {
      title: 'MR Report Minimal API',
      version: '1.0.0',
    },
    paths: {
      '/api/mr-report/context/{contextId}/full': {
        get: { summary: 'Get full MR report payload' },
      },
      '/api/mr-report/context/{contextId}/export-word': {
        get: { summary: 'Export MR report DOCX' },
      },
      '/api/mr-report/context/{contextId}/export-pdf': {
        get: { summary: 'Export MR report PDF' },
      },
      '/api/mr-report/context/{contextId}/export-excel': {
        get: { summary: 'Export MR report XLSX' },
      },
    },
  });
});

// Rate limiting baseline untuk endpoint MR sensitif.
const mrSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak request. Coba lagi beberapa saat.',
    code: 'RATE_LIMITED',
  },
});

app.use('/api/mr-report', mrSensitiveLimiter);
app.use('/api/mr-planning-risk', mrSensitiveLimiter);
app.use('/api/mr-planning-monitoring', mrSensitiveLimiter);
app.use('/api/mr-planning-tindak-lanjut', mrSensitiveLimiter);
app.use('/api/mr-tlhp-report', mrSensitiveLimiter);

// Morgan log ke file
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'combined.log'), { flags: 'a' });
app.use(
  morgan('[:date[iso]] :method :url :status :res[content-length] - :response-time ms', {
    stream: accessLogStream,
  }),
);
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Force HTTPS di production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.protocol !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

// GLOBAL ROUTES
const signPdfRoutes = require('./routes/signPdfRoutes');
const periodeRoutes = require('./routes/periodeRoutes');
const rekomendasiAIRoutes = require('./routes/rekomendasiAIRoutes');
const dokumenOptionsRoutes = require('./routes/dokumenOptionsRoutes');
const userRoutes = require('./routes/userRoutes');
const divisionRoutes = require('./routes/divisionRoutes');
const roleRoutes = require('./routes/roleRoutes');
const authRoutes = require('./routes/authRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const dokumenRoutes = require('./routes/dokumenRoutes');

// RPJMD ROUTES
const indikatorDetailRoutes = require('./routes/indikatorDetailRoutes');
const kegiatanRoutes = require('./routes/kegiatanRoutes');
const misiRoutes = require('./routes/misiRoutes');
const opdPenanggungJawabRoutes = require('./routes/opdPenanggungJawabRoutes');
const programRoutes = require('./routes/programRoutes');
const sasaranRoutes = require('./routes/sasaranRoutes');
const strategiRoutes = require('./routes/strategiRoutes');
const arahKebijakanRoutes = require('./routes/arahKebijakanRoutes');
const subKegiatanRoutes = require('./routes/subKegiatanRoutes');
const tujuanRoutes = require('./routes/tujuanRoutes');
const visiRoutes = require('./routes/visiRoutes');
const targetsRoutes = require('./routes/targetsRoutes');
const rpjmdRoutes = require('./routes/rpjmdRoutes');
const rpjmdImportRoutes = require('./routes/rpjmdImportRoutes');
const rpjmdMonitoringRoutes = require('./routes/rpjmdMonitoringRoutes');
const rpjmdBulkFromMasterRoutes = require('./routes/rpjmdBulkFromMasterRoutes');
const rpjmdBackfillRoutes = require('./routes/rpjmdBackfillRoutes');
const rpjmdProgramAutoMapRoutes = require('./routes/rpjmdProgramAutoMapRoutes');
const rpjmdKegiatanAutoMapRoutes = require('./routes/rpjmdKegiatanAutoMapRoutes');
const rpjmdSubAutoMapRoutes = require('./routes/rpjmdSubAutoMapRoutes');
const rpjmdRkpdSyncRoutes = require('./routes/rpjmdRkpdSyncRoutes');
const rpjmdGovernanceSyncRoutes = require('./routes/rpjmdGovernanceSyncRoutes');
const planningAuditDashboardRoutes = require('./routes/planningAuditDashboardRoutes');
const realisasiRoutes = require('./routes/realisasiIndikatorRoutes');
const evaluasiRoutes = require('./routes/evaluasiRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const realisasiBulananRoutes = require('./routes/realisasiRoutes');
const laporanRoutes = require('./routes/laporanRoutes');
const laporanRpjmdRoutes = require('./routes/laporanRpjmdRoutes');
const prioritasNasionalRoutes = require('./routes/prioritasNasionalRoutes');
const prioritasDaerahRoutes = require('./routes/prioritasDaerahRoutes');
const prioritasGubernurRoutes = require('./routes/prioritasGubernurRoutes');
const indikatorWizardRoutes = require('./routes/indikatorWizardRoutes');
const indikatorMisiRoutes = require('./routes/indikatorMisiRoutes');
const indikatorTujuan = require('./routes/indikatorTujuanRoutes');
const indikatorSasaran = require('./routes/indikatorSasaran');
const indikatorProgram = require('./routes/indikatorProgram');
const indikatorKegiatan = require('./routes/indikatorKegiatan');
const indikatorStrategi = require('./routes/indikatorStrategi');
const indikatorArahKebijakan = require('./routes/indikatorArahKebijakan');
const indikatorSubKegiatan = require('./routes/indikatorSubKegiatan');
const wizardRoutes = require('./routes/wizardRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const dashboardRpjmdRoutes = require('./routes/dashboardRpjmdRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const cascadingRoutes = require('./routes/cascadingRoutes');
const kinerjaRoutes = require('./routes/kinerjaRoutes');

// RENSTRA ROUTES
const renstraBabRoutes = require('./routes/renstraBabRoutes');
const renstraRoutes = require('./routes/renstraRoutes');
const RenstraOpd = require('./routes/renstra_opdRoutes');
const renstraTujuanRoutes = require('./routes/renstra_tujuanRoutes');
const renstraSasaranRoutes = require('./routes/renstra_sasaranRoutes');
const renstraStrategiRoutes = require('./routes/renstra_strategiRoutes');
const renstraKebijakanRoutes = require('./routes/renstra_kebijakanRoutes');
const renstraProgramRoutes = require('./routes/renstra_programRoutes');
const renstraKegiatanRoutes = require('./routes/renstra_kegiatanRoutes');
const renstraSubkegiatanRoutes = require('./routes/renstra_subkegiatanRoutes');
const indikatorRenstraRoutes = require('./routes/indikatorRenstraRoutes');
const renstra_targetRoutes = require('./routes/renstra_targetRoutes');
const renstra_exportRoutes = require('./routes/renstra_exportRoutes');
const renstra_tabelProgramRoutes = require('./routes/renstra_tabelProgramRoutes');
const renstra_tabelKegiatanRoutes = require('./routes/renstra_tabelKegiatanRoutes');
const renstra_tabelSubKegiatanRoutes = require('./routes/renstra_tabelSubKegiatanRoutes');
const renstra_tabelSasaranRoutes = require('./routes/renstra_tabelSasaranRoutes');
const renstra_tabelTujuanRoutes = require('./routes/renstra_tabelTujuanRoutes');
const renstra_tabelStrategiRoutes = require('./routes/renstra_tabelStrategiRoutes');
const renstra_tabelArahKebijakanRoutes = require('./routes/renstra_tabelArahKebijakanRoutes');
const renstra_tabelPrioritasRoutes = require('./routes/renstra_tabelPrioritasRoutes');
const renstraRpjmdMappingRoutes = require('./routes/renstra_rpjmdMappingRoutes');
const renstraChainRoutes = require('./routes/renstra_chainRoutes');
// Manajemen Risiko (MR)
const mrPlanningRiskRoutes = require('./routes/mr_planningRiskRoutes');
const mrSmokeTestRoutes = require('./routes/mrSmokeTestRoutes');
const mrPlanningRiskAnalysisRoutes = require('./routes/mr_planningRiskAnalysisRoutes');
const mrPlanningRootCauseRoutes = require('./routes/mr_planningRootCauseRoutes');
const mrPlanningMitigationRoutes = require('./routes/mr_planningMitigationRoutes');
const mrPlanningMonitoringRoutes = require('./routes/mr_planningMonitoringRoutes');
const mrPlanningDeviationRoutes = require('./routes/mr_planningDeviationRoutes');
const mrPlanningWarningRoutes = require('./routes/mr_planningWarningRoutes');
const mrPlanningContextRoutes = require('./routes/mr_planningContextRoutes');
const mrReferenceDropdownRoutes = require('./routes/mr_referenceDropdownRoutes');
const mrPlanningReportRoutes = require('./routes/mr_planningReportRoutes');
const mrNarrativeDraftRoutes = require('./routes/mr_NarrativeDraftRoutes');
// Modul TLHP — Pengelolaan Tindak Lanjut Temuan Inspektorat/BPK/BPKP
const mrPlanningLhpRoutes = require('./routes/mr_planningLhpRoutes');
const mrPlanningTemuanRoutes = require('./routes/mr_planningTemuanRoutes');
const mrPlanningTindakLanjutRoutes = require('./routes/mr_planningTindakLanjutRoutes');
const mrPlanningTlhpReportRoutes = require('./routes/mr_planningTlhpReportRoutes');

// USE RPKD
const rkpdRoutes = require('./routes/rkpdRoutes');
const rkpdInitRoutes = require('./routes/rkpdInitRoutes');
const masterKodeRekeningBelanjaRoutes = require('./routes/masterKodeRekeningBelanjaRoutes');
const planningRkpdDokumenRoutes = require('./routes/planningRkpdDokumenRoutes');

// USE RENJA
const renjaRoutes = require('./routes/renjaRoutes');

// USE RKA
const rkaRoutes = require('./routes/rkaRoutes');
const tapdRoutes = require('./routes/tapdRoutes');
const pejabatPenandatanganRoutes = require('./routes/pejabatPenandatanganRoutes');
const dpaPergeseranRoutes = require('./routes/dpaPergeseranRoutes');
const masterSubBidangOpdRoutes = require('./routes/masterSubBidangOpdRoutes');

// USE DPA
const dpaRoutes = require('./routes/dpaRoutes');

// USE BMD
const bmdRoutes = require('./routes/bmdRoutes');

// USE PENATAUSAHAAN
const penatausahaanRoutes = require('./routes/penatausahaanRoutes');

// USE PENGKEG
const pengkegRoutes = require('./routes/pengkegRoutes');

// USE MONEV
const monevRoutes = require('./routes/monevRoutes');

// USE LPK-DISPANG
const lpkDispangRoutes = require('./routes/lpkDispangRoutes');

// USE LK-DISPANG
const lkDispangRoutes = require('./routes/lkDispangRoutes');

// USE LAKIP
const lakipRoutes = require('./routes/lakipRoutes');

// USE APPROVAL WORKFLOW
const approvalRoutes = require('./routes/approvalRoutes');

// USE SIPD INTERNAL
const sipdRoutes = require('./routes/sipdRoutes');

// USE LAKIP GENERATOR
const lakipGeneratorRoutes = require('./routes/lakipGeneratorRoutes');

// USE DASHBOARD LKD
const lkdRoutes = require('./routes/lkdRoutes');

// USE KODE REKENING (Permendagri 90)
const kodeRekeningRoutes = require('./routes/kodeRekeningRoutes');
const masterRoutes = require('./routes/masterRoutes');
const migrationRoutes = require('./routes/migrationRoutes');
const appPolicyRoutes = require('./routes/appPolicyRoutes');
const regulasiRoutes = require('./routes/regulasiRoutes');
const auditPlanningRoutes = require('./routes/auditPlanningRoutes');
const derivationRoutes = require('./routes/derivationRoutes');

// USE MODUL LAPORAN KEUANGAN (BAS, jurnal, saldo)
const lkAccountingRoutes = require('./routes/lkAccountingRoutes');

// USE CLONE PERIODE
const clonePeriodeRoutes = require('./routes/clonePeriodeRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const planRoutes = require('./routes/planRoutes');

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === STATIC FILES ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// USE GLOBAL ROUTES
app.use('/api/dokumen-options', dokumenOptionsRoutes);
app.use('/api', signPdfRoutes);
app.use('/api/periode-rpjmd', periodeRoutes);
app.use('/api/rekomendasi-ai', rekomendasiAIRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/plans', planRoutes);
app.use('/api', derivationRoutes);
app.use('/api', userRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/clone-periode', clonePeriodeRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/dokumen', dokumenRoutes);

// USE RPJMD ROUTES
app.use('/api/indikators', indikatorDetailRoutes);
app.use('/api/indikator-wizard', indikatorWizardRoutes);
app.use('/api/kegiatan', kegiatanRoutes);
app.use('/api/misi', misiRoutes);
app.use('/api/opd-penanggung-jawab', opdPenanggungJawabRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/sasaran', sasaranRoutes);
app.use('/api/strategi', strategiRoutes);
app.use('/api/arah-kebijakan', arahKebijakanRoutes);
app.use('/api/sub-kegiatan', subKegiatanRoutes);
app.use('/api/tujuan', tujuanRoutes);
app.use('/api/visi', visiRoutes);
app.use('/api/targets', targetsRoutes);
app.use('/api/rpjmd', rpjmdRoutes);
app.use('/api/rpjmd-import', rpjmdImportRoutes);
app.use('/api/rpjmd-monitoring', rpjmdMonitoringRoutes);
app.use('/api/rpjmd/bulk-from-master', rpjmdBulkFromMasterRoutes);
app.use('/api/rpjmd/backfill', rpjmdBackfillRoutes);
app.use('/api/rpjmd/program-auto-map', rpjmdProgramAutoMapRoutes);
app.use('/api/rpjmd/kegiatan-auto-map', rpjmdKegiatanAutoMapRoutes);
app.use('/api/rpjmd/sub-auto-map', rpjmdSubAutoMapRoutes);
app.use('/api/rpjmd-rkpd-sync', rpjmdRkpdSyncRoutes);
app.use('/api/rpjmd-governance-sync', rpjmdGovernanceSyncRoutes);
app.use('/api/planning-audit', planningAuditDashboardRoutes);
app.use('/api/realisasi-indikator', realisasiRoutes);
app.use('/api/evaluasi', evaluasiRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', realisasiBulananRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/laporan', laporanRpjmdRoutes);
app.use('/api/prioritas-nasional', prioritasNasionalRoutes);
app.use('/api/prioritas-daerah', prioritasDaerahRoutes);
app.use('/api/prioritas-gubernur', prioritasGubernurRoutes);
app.use('/api/indikator-misi', indikatorMisiRoutes);
app.use('/api/indikator-tujuans', indikatorTujuan);
app.use('/api/indikator-sasaran', indikatorSasaran);
app.use('/api/indikator-program', indikatorProgram);
app.use('/api/indikator-kegiatan', indikatorKegiatan);
app.use('/api/indikator-strategi', indikatorStrategi);
app.use('/api/indikator-arah-kebijakan', indikatorArahKebijakan);
app.use('/api/indikator-sub-kegiatan', indikatorSubKegiatan);
app.use('/api/wizard', wizardRoutes);
app.use('/api', monitoringRoutes);
app.use('/api/dashboard-rpjmd', dashboardRpjmdRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cascading', cascadingRoutes);
app.use('/api', kinerjaRoutes);
app.use('/api/dashboard', dashboardAgregatPaguRoutes);

// USE RENSTRA ROUTES
app.use('/api/renstra-docs', renstraRoutes);
app.use('/api/renstra', renstraBabRoutes);
app.use('/api/renstra-opd', RenstraOpd);
app.use('/api/renstra-tujuan', renstraTujuanRoutes);
app.use('/api/renstra-sasaran', renstraSasaranRoutes);
app.use('/api/renstra-strategi', renstraStrategiRoutes);
app.use('/api/renstra-kebijakan', renstraKebijakanRoutes);
app.use('/api/renstra-program', renstraProgramRoutes);
app.use('/api/renstra-kegiatan', renstraKegiatanRoutes);
app.use('/api/renstra-subkegiatan', renstraSubkegiatanRoutes);
app.use('/api/indikator-renstra', indikatorRenstraRoutes);
app.use('/api/renstra-target', renstra_targetRoutes);
app.use('/api/renstra', renstra_exportRoutes);
app.use('/api/renstra-tabel-tujuan', renstra_tabelTujuanRoutes);
app.use('/api/renstra-tabel-sasaran', renstra_tabelSasaranRoutes);
app.use('/api/renstra-tabel-program', renstra_tabelProgramRoutes);
app.use('/api/renstra-tabel-kegiatan', renstra_tabelKegiatanRoutes);
app.use('/api/renstra-tabel-subkegiatan', renstra_tabelSubKegiatanRoutes);
app.use('/api/renstra-tabel-strategi', renstra_tabelStrategiRoutes);
app.use('/api/renstra-tabel-arah-kebijakan', renstra_tabelArahKebijakanRoutes);
app.use('/api/renstra-tabel-prioritas', renstra_tabelPrioritasRoutes);
app.use('/api/renstra-rpjmd-mapping', renstraRpjmdMappingRoutes);
app.use('/api/renstra-chain', renstraChainRoutes);
app.use('/api/renstra-pagu-cache', require('./routes/renstra_pagu_cacheRoutes'));

// USE MANAJEMEN RISIKO (MR)
app.use('/api/mr-planning-risk', mrPlanningRiskRoutes);
app.use('/api/mr-smoke', mrSmokeTestRoutes);
app.use('/api/mr-planning-risk-analysis', mrPlanningRiskAnalysisRoutes);
app.use('/api/mr-planning-root-cause', mrPlanningRootCauseRoutes);
app.use('/api/mr-planning-mitigation', mrPlanningMitigationRoutes);
app.use('/api/mr-planning-monitoring', mrPlanningMonitoringRoutes);
app.use('/api/mr-planning-deviation', mrPlanningDeviationRoutes);
app.use('/api/mr-planning-warning', mrPlanningWarningRoutes);
app.use('/api/mr-planning-context', mrPlanningContextRoutes);
app.use('/api/mr-reference-items', mrReferenceDropdownRoutes);
app.use('/api/mr-report', mrPlanningReportRoutes);
app.use('/api/mr-planning-risk', mrNarrativeDraftRoutes);

// USE MODUL TLHP — Pengelolaan Tindak Lanjut Temuan Inspektorat/BPK/BPKP
app.use('/api/mr-planning-lhp', mrPlanningLhpRoutes);
app.use('/api/mr-planning-temuan', mrPlanningTemuanRoutes);
app.use('/api/mr-planning-tindak-lanjut', mrPlanningTindakLanjutRoutes);
app.use('/api/mr-tlhp-report', mrPlanningTlhpReportRoutes);

// USE RKPD
app.use('/api/rkpd', rkpdRoutes);
app.use('/api/rkpd-init', rkpdInitRoutes);
app.use('/api/master-kode-rekening-belanja', masterKodeRekeningBelanjaRoutes);
app.use('/api/rkpd-dokumen', planningRkpdDokumenRoutes);

// USE RENJA
app.use('/api/renja', renjaRoutes);

// Audit konsistensi perencanaan (domain v2)
app.use('/api/audit', auditPlanningRoutes);

const planningDocumentRoutes = require('./routes/planningDocumentRoutes');
app.use('/api/planning', planningDocumentRoutes);

// USE RKA
app.use('/api/rka', rkaRoutes);
app.use('/api/tapd', tapdRoutes);
app.use('/api/pejabat-penandatangan', pejabatPenandatanganRoutes);
app.use('/api/dpa', dpaPergeseranRoutes);
app.use('/api/master-sub-bidang-opd', masterSubBidangOpdRoutes);

// USE DPA
app.use('/api/dpa', dpaRoutes);

// USE BMD
app.use('/api/bmd', bmdRoutes);

// USE PENATAUSAHAAN
app.use('/api/penatausahaan', penatausahaanRoutes);

// USE PENGKEG
app.use('/api/pengkeg', pengkegRoutes);

// USE MONEV
app.use('/api/monev', monevRoutes);

// USE LPK-DISPANG
app.use('/api/lpk-dispang', lpkDispangRoutes);

// USE LK-DISPANG
app.use('/api/lk-dispang', lkDispangRoutes);

// USE LAKIP
app.use('/api/lakip', lakipRoutes);

// USE APPROVAL WORKFLOW
app.use('/api/approval', approvalRoutes);

// USE SIPD INTERNAL
app.use('/api/sipd', sipdRoutes);

// USE LAKIP GENERATOR
app.use('/api/lakip-generator', lakipGeneratorRoutes);

// USE DASHBOARD LKD
app.use('/api/lkd', lkdRoutes);
app.use('/api/rekening', kodeRekeningRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/v1/master', masterRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/v1/migration', migrationRoutes);
app.use('/api/v1/app-policy', appPolicyRoutes);
app.use('/api/regulasi', regulasiRoutes);
app.use('/api', lkAccountingRoutes);
app.use('/api', masterReferensiRoutes);
app.use('/api/perangkat-daerah', perangkatDaerahRoutes);

app.use((err, req, res, _next) => {
  console.error('🔥 ERROR CAUGHT:', err.stack);
  const errorStack = `${new Date().toISOString()} - ${err.stack}`;
  const conciseMessage = `${req.method} ${req.originalUrl} → ${err.message}`;

  logger.error(errorStack); // log lengkap ke file
  logger.error(conciseMessage); // log ringkas ke file

  res.status(500).json({ message: 'Terjadi kesalahan server internal.' });
});

const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  const { role, userId } = socket.handshake.query;
  console.log(`User connected: role=${role}, userId=${userId}`);

  if (role) socket.join(role);
  if (userId) socket.join(`user_${userId}`);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`[SSO] SSO_SHARED_SECRET configured: ${!!process.env.SSO_SHARED_SECRET}`);
});
