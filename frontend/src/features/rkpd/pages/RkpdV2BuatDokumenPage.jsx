import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import fetchWithLog from '../../../utils/fetchWithLog';
import { useDokumen } from '../../../hooks/useDokumen';
import { usePeriodeAktif } from '../../rpjmd/hooks/usePeriodeAktif';
import { canManagePlanningWorkflow } from '../../../utils/roleUtils';
import { useAuth } from '../../../hooks/useAuth';
import { createRkpdDokumenV2, createRkpdItemV2 } from '../services/planningRkpdV2Api';
import RkpdDashboardLayout from './RkpdDashboardLayout';
import usePrioritasTahun from '../hooks/usePrioritasTahun';

const STEPS = [
  'Metadata dokumen',
  'Prioritas pembangunan',
  'Program, kegiatan & sub kegiatan',
  'Review & simpan',
];

const RkpdV2BuatDokumenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tahun } = useDokumen();
  const { periode_id: periodeAktif } = usePeriodeAktif();
  const can = canManagePlanningWorkflow(user?.role);

  const [step, setStep] = useState(0);
  const [periodeList, setPeriodeList] = useState([]);
  const [periodeId, setPeriodeId] = useState('');
  const { resolvedTahun } = usePrioritasTahun(periodeList, periodeId, 'rkpd');
  const [tahunVal, setTahunVal] = useState(String(tahun || ''));
  const [judul, setJudul] = useState('');
  const [createReasonText, setCreateReasonText] = useState('');
  const [createReasonFile, setCreateReasonFile] = useState('');
  // Cascading RPJMD → RKPD

  const [visiId, setVisiId] = useState('');
  const [misiId, setMisiId] = useState('');

  const [prioritasNasionalId, setPrioritasNasionalId] = useState('');
  const [prioritasDaerahId, setPrioritasDaerahId] = useState('');
  const [prioritasGubernurId, setPrioritasGubernurId] = useState('');

  const [tujuanId, setTujuanId] = useState('');
  const [sasaranId, setSasaranId] = useState('');
  const [strategiId, setStrategiId] = useState('');
  const [arahKebijakanId, setArahKebijakanId] = useState('');

  const [visiList, setVisiList] = useState([]);
  const [misiList, setMisiList] = useState([]);

  const [prioritasNasionalList, setPrioritasNasionalList] = useState([]);
  const [prioritasDaerahList, setPrioritasDaerahList] = useState([]);
  const [prioritasGubernurList, setPrioritasGubernurList] = useState([]);

  const [tujuanList, setTujuanList] = useState([]);
  const [sasaranList, setSasaranList] = useState([]);
  const [strategiList, setStrategiList] = useState([]);
  const [arahKebijakanList, setArahKebijakanList] = useState([]);

  // MASTER RKPD

  const [namaOpd, setNamaOpd] = useState('');
  const [masterProgramList, setMasterProgramList] = useState([]);
  const [masterKegiatanList, setMasterKegiatanList] = useState([]);
  const [masterSubKegiatanList, setMasterSubKegiatanList] = useState([]);

  const [indikatorSubKegiatanList, setIndikatorSubKegiatanList] = useState([]);

  // INDIKATOR RKPD

  const [selectedArahKode, setSelectedArahKode] = useState('');

  const [programs, setPrograms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchWithLog('/periode-rpjmd', {}, setPeriodeList);
  }, []);

  useEffect(() => {
    fetchWithLog('/master-program', {}, (res) => {
      setMasterProgramList(Array.isArray(res) ? res : []);
    });
  }, []);

  useEffect(() => {
    if (periodeAktif && !periodeId) setPeriodeId(String(periodeAktif));
  }, [periodeAktif, periodeId]);

  useEffect(() => {
    if (!tahunVal) return;

    // SESUDAH
    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      visi_id: visiId,
      limit: 1000,
    });

    fetchWithLog(`/visi?${query.toString()}`, {}, (res) => {
      setVisiList(Array.isArray(res) ? res : []);
    });
  }, [tahunVal]);

  useEffect(() => {
    if (!visiId) return;

    console.log('VISI TERPILIH =', visiId);

    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      visi_id: visiId,
      limit: 1000,
    });

    fetchWithLog(`/misi?${query.toString()}`, {}, (res) => {
      console.log('MISI CALLBACK =', res);
      console.log('MISI ARRAY ?', Array.isArray(res));

      setMisiList(Array.isArray(res) ? res : []);
    });

    setMisiId('');
    setMisiList([]);

    setPrioritasNasionalId('');
    setPrioritasDaerahId('');
    setPrioritasGubernurId('');

    setTujuanId('');
    setSasaranId('');
    setStrategiId('');
    setArahKebijakanId('');

    setTujuanList([]);
    setSasaranList([]);
    setStrategiList([]);
    setArahKebijakanList([]);
  }, [visiId, tahunVal]);

  useEffect(() => {
    if (!misiId) return;

    const query = new URLSearchParams({
      jenis_dokumen: 'rkpd',
      tahun: resolvedTahun,
      limit: 1000,
    });

    fetchWithLog(`/prioritas-nasional?${query.toString()}`, {}, (res) => {
      setPrioritasNasionalList(Array.isArray(res) ? res : []);
    });
  }, [misiId, resolvedTahun]);

  useEffect(() => {
    if (!prioritasNasionalId) return;

    // reset seluruh turunan
    setPrioritasDaerahId('');
    setPrioritasGubernurId('');
    setTujuanId('');
    setSasaranId('');
    setStrategiId('');
    setArahKebijakanId('');

    setPrioritasDaerahList([]);
    setPrioritasGubernurList([]);
    setTujuanList([]);
    setSasaranList([]);
    setStrategiList([]);
    setArahKebijakanList([]);

    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun,
      prioritas_nasional_id: prioritasNasionalId,
      limit: 1000,
    });

    fetchWithLog(`/prioritas-daerah?${query.toString()}`, {}, (res) => {
      setPrioritasDaerahList(Array.isArray(res) ? res : []);
    });
  }, [prioritasNasionalId, resolvedTahun]);

  useEffect(() => {
    if (!prioritasDaerahId) return;

    // reset turunan
    setPrioritasGubernurId('');
    setTujuanId('');
    setSasaranId('');
    setStrategiId('');
    setArahKebijakanId('');

    setPrioritasGubernurList([]);
    setTujuanList([]);
    setSasaranList([]);
    setStrategiList([]);
    setArahKebijakanList([]);

    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun,
      prioritas_daerah_id: prioritasDaerahId,
      limit: 1000,
    });

    fetchWithLog(`/prioritas-gubernur?${query.toString()}`, {}, (res) => {
      setPrioritasGubernurList(Array.isArray(res) ? res : []);
    });
  }, [prioritasDaerahId, resolvedTahun]);

  useEffect(() => {
    if (!prioritasGubernurId) return;

    // reset turunan
    setTujuanId('');
    setSasaranId('');
    setStrategiId('');
    setArahKebijakanId('');

    setTujuanList([]);
    setSasaranList([]);
    setStrategiList([]);
    setArahKebijakanList([]);

    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun || tahunVal,
      prioritas_gubernur_id: prioritasGubernurId,
      limit: 1000,
    });

    fetchWithLog(`/tujuan?${query.toString()}`, {}, (res) => {
      setTujuanList(Array.isArray(res) ? res : []);
    });
  }, [prioritasGubernurId, tahunVal]);

  useEffect(() => {
    if (!tujuanId) return;

    // reset turunan
    setSasaranId('');
    setStrategiId('');
    setArahKebijakanId('');

    setSasaranList([]);
    setStrategiList([]);
    setArahKebijakanList([]);

    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun || tahunVal,
      tujuan_id: tujuanId,
      limit: 1000,
    });

    fetchWithLog(`/sasaran?${query.toString()}`, {}, (res) => {
      console.log('SASARAN =', res);
      setSasaranList(Array.isArray(res) ? res : []);
    });
  }, [tujuanId, tahunVal]);

  useEffect(() => {
    if (!sasaranId) return;

    setStrategiId('');
    setArahKebijakanId('');

    setStrategiList([]);
    setArahKebijakanList([]);

    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun || tahunVal,
      sasaran_id: sasaranId,
      limit: 1000,
    });

    fetchWithLog(`/strategi?${query.toString()}`, {}, (res) => {
      console.log('STRATEGI =', res);

      if (Array.isArray(res) && res.length > 0) {
        console.log('STRATEGI ITEM PERTAMA =', res[0]);
        console.log('KEYS =', Object.keys(res[0]));
      }

      setStrategiList(Array.isArray(res) ? res : []);
    });
  }, [sasaranId, tahunVal]);

  useEffect(() => {
    if (!strategiId) return;

    setArahKebijakanId('');
    setArahKebijakanList([]);

    const query = new URLSearchParams({
      jenis_dokumen: 'rpjmd',
      tahun: resolvedTahun || tahunVal,
      strategi_id: strategiId,
      limit: 1000,
    });

    const url = `/arah-kebijakan?${query.toString()}`;

    console.log('REQUEST ARAH KEBIJAKAN =', url);

    fetchWithLog(url, {}, (res) => {
      console.log('ARAH KEBIJAKAN RESPONSE =', res);

      if (Array.isArray(res) && res.length > 0) {
        console.log('ARAH ITEM PERTAMA =', res[0]);
        console.log('ARAH KEYS =', Object.keys(res[0]));
      }

      setArahKebijakanList(Array.isArray(res) ? res : []);
    });
  }, [strategiId, tahunVal]);

  useEffect(() => {
    if (!arahKebijakanId || !arahKebijakanList.length) return;
    console.log(
      'ARAH ID =',
      arahKebijakanId,
      'LIST =',
      arahKebijakanList.map((i) => i.id),
    );
    const selected = arahKebijakanList.find((item) => String(item.id) === String(arahKebijakanId));
    console.log('SELECTED =', selected);
    if (!selected) return;
    const kodeArah = selected?.kode_arah || selected?.kode_indikator || '';

    setSelectedArahKode(kodeArah);

    fetchWithLog(`/indikator-renstra?stage=program&kode_parent=${kodeArah}`, {}, (res) => {
      const options = Array.isArray(res) ? res : [];

      setPrograms((prev) =>
        prev.map((program) => ({
          ...program,
          indikatorProgramOptions: options,
        })),
      );
    });
  }, [arahKebijakanId, arahKebijakanList]);

  const periodeLabel = periodeList.find((p) => String(p.id) === periodeId);

  const getStepLabelColor = (index) => {
    if (index === step) return '#2563eb';
    if (index < step) return '#374151';
    return '#9ca3af';
  };

  const getStepCircleStyle = (index) => {
    if (index < step) {
      return { background: '#0d6efd', color: '#fff', border: 'none' };
    }
    if (index === step) {
      return { background: 'transparent', color: '#0d6efd', border: '1px solid #0d6efd' };
    }
    return { background: '#e9ecef', color: '#6c757d', border: 'none' };
  };

  const validateStep1 = () => {
    if (!periodeId || !tahunVal.trim() || !judul.trim() || !namaOpd.trim()) {
      setErr('Periode, tahun, judul, dan nama OPD wajib diisi.');
      return false;
    }
    if (!createReasonText.trim() && !createReasonFile.trim()) {
      setErr('Isi alasan pembuatan dokumen (teks) atau referensi berkas.');
      return false;
    }
    setErr('');
    return true;
  };

  const getNextId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const createProgram = () => ({
    id: getNextId('program'),

    program_id: '',
    kode_program: '',
    nama: '',

    indikator_program_id: '',
    kode_indikator_program: '',
    nama_indikator_program: '',

    indikatorProgramOptions: [],

    kegiatanOptions: [],

    kegiatan: [],
  });

  const createKegiatan = () => ({
    id: getNextId('kegiatan'),

    kegiatan_id: '',
    kode_kegiatan: '',
    nama: '',

    indikator_kegiatan_id: '',
    kode_indikator_kegiatan: '',
    nama_indikator_kegiatan: '',

    indikatorKegiatanOptions: [],

    indikatorSubOptions: [],

    subKegiatanOptions: [],

    sub_kegiatan: [],
  });

  const createSubKegiatan = () => ({
    id: getNextId('sub'),

    sub_kegiatan_id: '',
    kode_sub_kegiatan: '',

    nama: '',

    indikator_id: '',
    kode_indikator: '',
    indikator: '',

    satuan: '',
    target: '',
    pagu: '',

    keterkaitan_prioritas: '',
    rincian_belanja: null,
  });

  const handleIndikatorProgramSelect = (programId) => (event) => {
    const indikatorId = event.target.value;

    const program = programs.find((p) => p.id === programId);

    const indikator = program?.indikatorProgramOptions?.find(
      (item) => String(item.id) === String(indikatorId),
    );

    updateProgramById(programId, (program) => ({
      ...program,

      indikator_program_id: indikator?.id || '',
      kode_indikator_program: indikator?.kode_indikator || '',

      nama_indikator_program: indikator?.nama_indikator || '',
    }));

    if (!indikator?.kode_indikator) return;
    fetchWithLog(
      `/indikator-renstra?stage=kegiatan&kode_parent=${indikator?.kode_indikator}`,
      {},
      (res) => {
        const options = Array.isArray(res) ? res : [];

        updateProgramById(programId, (program) => ({
          ...program,
          kegiatan: program.kegiatan.map((kegiatan) => ({
            ...kegiatan,
            indikatorKegiatanOptions: options,
          })),
        }));
      },
    );
  };

  const addProgram = () => {
    const newProgram = createProgram();
    if (selectedArahKode) {
      fetchWithLog(
        `/indikator-renstra?stage=program&kode_parent=${selectedArahKode}`,
        {},
        (res) => {
          const options = Array.isArray(res) ? res : [];
          setPrograms((prev) => [...prev, { ...newProgram, indikatorProgramOptions: options }]);
        },
      );
    } else {
      setPrograms((prev) => [...prev, newProgram]);
    }
  };

  const updateProgramById = (programId, updater) => {
    setPrograms((prev) =>
      prev.map((program) => (program.id === programId ? updater(program) : program)),
    );
  };

  const updateKegiatanById = (programId, kegiatanId, updater) => {
    updateProgramById(programId, (program) => ({
      ...program,
      kegiatan: program.kegiatan.map((kegiatan) =>
        kegiatan.id === kegiatanId ? updater(kegiatan) : kegiatan,
      ),
    }));
  };

  const handleIndikatorKegiatanSelect = (programId, kegiatanId) => (event) => {
    const indikatorId = event.target.value;

    const program = programs.find((p) => p.id === programId);

    const kegiatan = program?.kegiatan?.find((k) => k.id === kegiatanId);

    const indikator = kegiatan?.indikatorKegiatanOptions?.find(
      (item) => String(item.id) === String(indikatorId),
    );

    updateKegiatanById(programId, kegiatanId, (kegiatan) => ({
      ...kegiatan,

      indikator_kegiatan_id: indikator?.id || '',

      kode_indikator_kegiatan: indikator?.kode_indikator || '',

      nama_indikator_kegiatan: indikator?.nama_indikator || '',
    }));

    if (!indikator?.kode_indikator) return;
    fetchWithLog(
      `/indikator-renstra?stage=sub_kegiatan&kode_parent=${indikator?.kode_indikator}`,
      {},
      (res) => {
        const allOptions = Array.isArray(res) ? res : [];
        const prefix = indikator?.kode_indikator?.replace(/^IK/, 'ISK') || '';
        const options = prefix
          ? allOptions.filter((o) => String(o.kode_indikator || '').startsWith(prefix))
          : allOptions;
        updateKegiatanById(programId, kegiatanId, (kegiatan) => ({
          ...kegiatan,
          indikatorSubOptions: options,
        }));
      },
    );
  };

  const updateSubKegiatanById = (programId, kegiatanId, subId, updater) => {
    updateKegiatanById(programId, kegiatanId, (kegiatan) => ({
      ...kegiatan,
      sub_kegiatan: kegiatan.sub_kegiatan.map((sub) => (sub.id === subId ? updater(sub) : sub)),
    }));
  };

  const addKegiatan = (programId) => {
    updateProgramById(programId, (program) => ({
      ...program,
      kegiatan: [...program.kegiatan, createKegiatan()],
    }));
  };

  const addSubKegiatan = (programId, kegiatanId) => {
    updateKegiatanById(programId, kegiatanId, (kegiatan) => ({
      ...kegiatan,
      sub_kegiatan: [...kegiatan.sub_kegiatan, createSubKegiatan()],
    }));
  };

  const handleIndikatorSubKegiatanSelect = (programId, kegiatanId, subId) => (event) => {
    const indikatorId = event.target.value;

    const program = programs.find((p) => p.id === programId);

    const kegiatan = program?.kegiatan?.find((k) => k.id === kegiatanId);

    const indikator = kegiatan?.indikatorSubOptions?.find(
      (item) => String(item.id) === String(indikatorId),
    );

    updateSubKegiatanById(programId, kegiatanId, subId, (sub) => ({
      ...sub,

      indikator_id: indikator?.id || '',

      kode_indikator: indikator?.kode_indikator || '',

      indikator: indikator?.nama_indikator || '',

      satuan: indikator?.satuan || '',

      target: indikator?.target_tahun_1 || indikator?.target || '',

      pagu:
        indikator?.pagu_tahun_1 ||
        indikator?.pagu_cached ||
        indikator?.total_pagu_rpjmd ||
        indikator?.pagu ||
        '',
    }));
  };

  const updateProgramField = (programId, field, value) => {
    updateProgramById(programId, (program) => ({ ...program, [field]: value }));
  };

  const updateKegiatanField = (programId, kegiatanId, field, value) => {
    updateKegiatanById(programId, kegiatanId, (kegiatan) => ({ ...kegiatan, [field]: value }));
  };

  const updateSubKegiatanField = (programId, kegiatanId, subId, field, value) => {
    updateSubKegiatanById(programId, kegiatanId, subId, (sub) => ({ ...sub, [field]: value }));
  };

  const handleProgramSelect = (programId) => (event) => {
    const selectedId = event.target.value;

    const selected = masterProgramList.find((item) => String(item.id) === String(selectedId));

    updateProgramById(programId, (program) => ({
      ...program,

      program_id: selected?.id || '',
      kode_program: selected?.kode_program || '',
      nama: selected?.nama_program || '',

      kegiatan: [],
    }));

    fetchWithLog(`/master-kegiatan?program_id=${selectedId}`, {}, (res) => {
      setMasterKegiatanList(Array.isArray(res) ? res : []);
    });
  };

  const handleKegiatanSelect = (programId, kegiatanId) => (event) => {
    const selectedId = event.target.value;

    const selected = masterKegiatanList.find((item) => String(item.id) === String(selectedId));

    updateKegiatanById(programId, kegiatanId, (kegiatan) => ({
      ...kegiatan,

      kegiatan_id: selected?.id || '',
      kode_kegiatan: selected?.kode_kegiatan || '',
      nama: selected?.nama_kegiatan || '',

      sub_kegiatan: [],
    }));

    fetchWithLog(`/master-sub-kegiatan?kegiatan_id=${selectedId}`, {}, (res) => {
      setMasterSubKegiatanList(Array.isArray(res) ? res : []);
    });

    fetchWithLog(
      `/indikator-renstra?stage=sub_kegiatan&kode_parent=${kegiatan.kode_indikator_kegiatan}`,
      {},
      (res) => {
        setIndikatorSubKegiatanList(Array.isArray(res) ? res : []);
      },
    );
  };

  const handleSubKegiatanSelect = (programId, kegiatanId, subId) => (event) => {
    const selectedId = event.target.value;

    const selected = masterSubKegiatanList.find((item) => String(item.id) === String(selectedId));

    updateSubKegiatanById(programId, kegiatanId, subId, (sub) => ({
      ...sub,

      sub_kegiatan_id: selected?.id || '',
      kode_sub_kegiatan: selected?.kode_sub_kegiatan || '',
      nama: selected?.nama_sub_kegiatan || '',
    }));
  };

  const handleKegiatanNameChange = (programId, kegiatanId) => (event) =>
    updateKegiatanField(programId, kegiatanId, 'nama', event.target.value);

  const handleSubFieldChange = (programId, kegiatanId, subId, field) => (event) =>
    updateSubKegiatanField(programId, kegiatanId, subId, field, event.target.value);

  const validateStep2 = () => {
    if (!visiId || !misiId || !prioritasNasionalId || !prioritasDaerahId || !prioritasGubernurId) {
      setErr(
        'Visi, Misi, Prioritas Nasional, Prioritas Daerah, dan Prioritas Gubernur wajib dipilih.',
      );
      return false;
    }

    setErr('');
    return true;
  };

  const validateStep3 = () => {
    if (programs.length === 0) {
      setErr('Minimal satu program harus ditambahkan.');
      return false;
    }
    const missing = programs.some(
      (program) =>
        program.kegiatan.length === 0 ||
        program.kegiatan.some((kegiatan) => kegiatan.sub_kegiatan.length === 0),
    );
    if (missing) {
      setErr(
        'Setiap program harus punya kegiatan, dan setiap kegiatan harus punya minimal satu sub kegiatan.',
      );
      return false;
    }
    setErr('');
    return true;
  };

  const goBack = () => {
    setErr('');
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const goNext = () => {
    if (step === 0) {
      if (validateStep1()) setStep(1);
      return;
    }
    if (step === 1) {
      if (validateStep2()) setStep(2);
      return;
    }
    if (step === 2) {
      if (validateStep3()) setStep(3);
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  console.log('SUBMIT PAYLOAD =', {
    visi_id: visiId,
    misi_id: misiId,
    prioritas_nasional_id: prioritasNasionalId,
    arah_kebijakan_id: arahKebijakanId,
  });

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const row = await createRkpdDokumenV2({
        periode_id: Number(periodeId),
        tahun: Number(tahunVal),
        judul: judul.trim(),
        nama_opd: namaOpd.trim(),

        visi_id: Number(visiId),
        misi_id: Number(misiId),

        prioritas_nasional_id: Number(prioritasNasionalId),
        prioritas_daerah_id: Number(prioritasDaerahId),
        prioritas_gubernur_id: Number(prioritasGubernurId),

        tujuan_id: tujuanId ? Number(tujuanId) : null,
        sasaran_id: sasaranId ? Number(sasaranId) : null,
        strategi_id: strategiId ? Number(strategiId) : null,
        arah_kebijakan_id: arahKebijakanId ? Number(arahKebijakanId) : null,

        status: 'draft',
        change_reason_text: createReasonText.trim() || undefined,
        change_reason_file: createReasonFile.trim() || undefined,
      });
      const id = row?.id;
      if (!id) throw new Error('Respons tidak berisi id dokumen.');

      // Simpan program/kegiatan/sub kegiatan sebagai rkpd_item
      let urutan = 1;
      for (const program of programs) {
        for (const kegiatan of program.kegiatan || []) {
          for (const sub of kegiatan.sub_kegiatan || []) {
            await createRkpdItemV2({
              rkpd_dokumen_id: id,
              urutan: urutan++,
              program: program.nama || '',
              kegiatan: kegiatan.nama || '',
              sub_kegiatan: sub.nama || '',
              indikator: sub.indikator || null,
              satuan: sub.satuan || null,
              target: sub.target !== '' ? Number(sub.target) : null,
              pagu: sub.pagu !== '' ? Number(sub.pagu) : null,
              change_reason_text: createReasonText.trim() || 'Pembuatan dokumen baru',
            });
          }
        }
      }

      navigate(`/dashboard-rkpd/v2/dokumen/${id}`);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex.message || 'Gagal membuat dokumen.');
      setStep(0);
    } finally {
      setBusy(false);
    }
  };

  if (!can) {
    return (
      <RkpdDashboardLayout>
        <Alert variant="danger">Anda tidak punya akses menulis dokumen RKPD v2.</Alert>
      </RkpdDashboardLayout>
    );
  }

  return (
    <RkpdDashboardLayout>
      <div className="mb-3">
        <h4 className="fw-bold text-primary mb-0">Buat dokumen RKPD (v2)</h4>
        <p className="small text-muted mb-0">
          Domain: <code>rkpd_dokumen</code>. Ini <strong>bukan</strong> entri tabel RKPD legacy.
        </p>
      </div>

      {/* Stepper */}
      <Card className="mb-4">
        <Card.Body className="py-3">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                    style={{
                      width: 32,
                      height: 32,
                      fontSize: 12,
                      flexShrink: 0,
                      ...getStepCircleStyle(i),
                    }}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="small fw-semibold" style={{ color: getStepLabelColor(i) }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: '#e9ecef' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </Card.Body>
      </Card>

      {err && (
        <Alert variant="warning" className="py-2">
          {err}
        </Alert>
      )}

      {/* Langkah 1 — Metadata */}
      {step === 0 && (
        <Card className="mb-4">
          <Card.Header className="bg-white border-bottom">
            <h6 className="fw-semibold mb-0">Metadata dokumen</h6>
            <p className="small text-muted mb-0">Informasi dasar dokumen RKPD yang akan dibuat</p>
          </Card.Header>
          <Card.Body>
            <Form>
              <div className="row g-3">
                <div className="col-md-8">
                  <Form.Group controlId="periode-rpjmd">
                    <Form.Label className="small fw-medium">
                      Periode RPJMD <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      size="sm"
                      value={periodeId}
                      onChange={(e) => setPeriodeId(e.target.value)}
                    >
                      <option value="">— pilih —</option>
                      {periodeList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({p.tahun_awal}–{p.tahun_akhir})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group controlId="tahun-anggaran">
                    <Form.Label className="small fw-medium">
                      Tahun anggaran <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min="2000"
                      max="2100"
                      size="sm"
                      value={tahunVal}
                      onChange={(e) => setTahunVal(e.target.value)}
                      placeholder="2026"
                    />
                  </Form.Group>
                </div>
                <div className="col-12">
                  <Form.Group controlId="judul-dokumen">
                    <Form.Label className="small fw-medium">
                      Judul dokumen <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={judul}
                      onChange={(e) => setJudul(e.target.value)}
                      placeholder="RKPD Provinsi …"
                    />
                  </Form.Group>
                </div>
                <div className="col-12">
                  <Form.Group controlId="nama-opd">
                    <Form.Label className="small fw-medium">
                      Nama OPD <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={namaOpd}
                      onChange={(e) => setNamaOpd(e.target.value)}
                      placeholder="Dinas Pangan …"
                    />
                  </Form.Group>
                </div>
                <div className="col-12">
                  <Form.Group controlId="alasan-pembuatan">
                    <Form.Label className="small fw-medium">
                      Alasan pembuatan <span className="text-danger">*</span>{' '}
                      <span className="text-muted fw-normal">(wajib salah satu)</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      size="sm"
                      value={createReasonText}
                      onChange={(e) => setCreateReasonText(e.target.value)}
                      placeholder="Tuliskan ringkasan alasan pembuatan dokumen ini…"
                    />
                  </Form.Group>
                </div>
                <div className="col-12">
                  <Form.Group controlId="referensi-berkas">
                    <Form.Label className="small fw-medium">Referensi berkas</Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={createReasonFile}
                      onChange={(e) => setCreateReasonFile(e.target.value)}
                      placeholder="path / URL / nama berkas"
                    />
                    <Form.Text className="text-muted">
                      Opsional — lampirkan referensi dokumen pendukung
                    </Form.Text>
                  </Form.Group>
                </div>
              </div>
            </Form>
          </Card.Body>
          <Card.Footer className="bg-light d-flex justify-content-between align-items-center">
            <span className="small text-muted">Langkah 1 dari 4</span>
            <Button size="sm" onClick={goNext}>
              Lanjut: prioritas pembangunan →
            </Button>
          </Card.Footer>
        </Card>
      )}

      {/* Langkah 2 — Cascading RPJMD */}
      {step === 1 && (
        <div className="bg-white border rounded-3 overflow-hidden">
          <div className="px-4 py-3 border-bottom">
            <h6 className="fw-semibold mb-0">Sinkronisasi RPJMD</h6>
            <p className="small text-muted mb-0">
              Pilih keterkaitan RKPD dengan dokumen RPJMD secara berjenjang.
            </p>
          </div>

          <div className="p-4">
            <div className="row g-3">
              {/* VISI */}
              <div className="col-12">
                <Form.Label className="small fw-medium">
                  Visi <span className="text-danger">*</span>
                </Form.Label>

                <Form.Select size="sm" value={visiId} onChange={(e) => setVisiId(e.target.value)}>
                  <option value="">Pilih Visi</option>

                  {visiList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.isi_visi}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* MISI */}
              <div className="col-12">
                <Form.Label className="small fw-medium">
                  Misi <span className="text-danger">*</span>
                </Form.Label>

                <Form.Select
                  size="sm"
                  value={misiId}
                  onChange={(e) => setMisiId(e.target.value)}
                  disabled={!visiId}
                >
                  <option value="">Pilih Misi</option>

                  {misiList.map((item) => (
                    <option key={item.id} value={item.id}>
                      Misi {item.no_misi} - {item.isi_misi}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* PRIORITAS NASIONAL */}
              <div className="col-12">
                <Form.Label className="small fw-medium">
                  Prioritas Nasional <span className="text-danger">*</span>
                </Form.Label>

                <Form.Select
                  size="sm"
                  value={prioritasNasionalId}
                  onChange={(e) => setPrioritasNasionalId(e.target.value)}
                  disabled={!misiId}
                >
                  <option value="">Pilih Prioritas Nasional</option>

                  {prioritasNasionalList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kode_prionas} - {item.nama_prionas}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* PRIORITAS DAERAH */}
              <div className="col-12">
                <Form.Label className="small fw-medium">
                  Prioritas Daerah <span className="text-danger">*</span>
                </Form.Label>

                <Form.Select
                  size="sm"
                  value={prioritasDaerahId}
                  onChange={(e) => setPrioritasDaerahId(e.target.value)}
                  disabled={!prioritasNasionalId}
                >
                  <option value="">Pilih Prioritas Daerah</option>

                  {prioritasDaerahList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kode_prioda} - {item.nama_prioda}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* PRIORITAS GUBERNUR */}
              <div className="col-12">
                <Form.Label className="small fw-medium">
                  Prioritas Gubernur <span className="text-danger">*</span>
                </Form.Label>

                <Form.Select
                  size="sm"
                  value={prioritasGubernurId}
                  onChange={(e) => setPrioritasGubernurId(e.target.value)}
                  disabled={!prioritasDaerahId}
                >
                  <option value="">Pilih Prioritas Gubernur</option>

                  {prioritasGubernurList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kode_priogub} - {item.nama_priogub}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* TUJUAN */}
              <div className="col-12">
                <Form.Label className="small fw-medium">Tujuan</Form.Label>

                <Form.Select
                  size="sm"
                  value={tujuanId}
                  onChange={(e) => setTujuanId(e.target.value)}
                  disabled={!prioritasGubernurId}
                >
                  <option value="">Pilih Tujuan</option>

                  {tujuanList.map((item) => (
                    <option key={item.id} value={item.id}>
                      Tujuan {item.no_tujuan} - {item.isi_tujuan}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* SASARAN */}
              <div className="col-12">
                <Form.Label className="small fw-medium">Sasaran</Form.Label>

                <Form.Select
                  size="sm"
                  value={sasaranId}
                  onChange={(e) => setSasaranId(e.target.value)}
                  disabled={!tujuanId}
                >
                  <option value="">Pilih Sasaran</option>

                  {sasaranList.map((item) => (
                    <option key={item.id} value={item.id}>
                      Sasaran {item.nomor} - {item.isi_sasaran}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* STRATEGI */}
              <div className="col-12">
                <Form.Label className="small fw-medium">Strategi</Form.Label>

                <Form.Select
                  size="sm"
                  value={strategiId}
                  onChange={(e) => setStrategiId(e.target.value)}
                  disabled={!sasaranId}
                >
                  <option value="">Pilih Strategi</option>

                  {strategiList.map((item) => (
                    <option key={item.id} value={item.id}>
                      Strategi {item.kode_strategi} - {item.deskripsi}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* ARAH KEBIJAKAN */}
              <div className="col-12">
                <Form.Label className="small fw-medium">Arah Kebijakan</Form.Label>

                <Form.Select
                  size="sm"
                  value={arahKebijakanId}
                  onChange={(e) => setArahKebijakanId(e.target.value)}
                  disabled={!strategiId}
                >
                  <option value="">Pilih Arah Kebijakan</option>

                  {arahKebijakanList.map((item) => (
                    <option key={item.id} value={item.id}>
                      Arah Kebijakan {item.kode_arah} - {item.nama_arah ?? item.deskripsi ?? ''}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-top bg-light d-flex justify-content-between align-items-center">
            <button className="btn btn-outline-secondary btn-sm" onClick={goBack}>
              ← Kembali ke metadata
            </button>

            <button className="btn btn-primary btn-sm" onClick={goNext}>
              Lanjut: program, kegiatan & sub kegiatan →
            </button>
          </div>
        </div>
      )}

      {/* Langkah 3 — Program, kegiatan & sub kegiatan */}
      {step === 2 && (
        <Card className="mb-4">
          <Card.Header className="bg-white border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-semibold mb-0">Program, kegiatan & sub kegiatan</h6>
                <p className="small text-muted mb-0">
                  Bangun hierarki program RKPD dengan kegiatan dan sub kegiatan.
                </p>
              </div>
              <Button variant="outline-primary" size="sm" onClick={addProgram}>
                Tambah program
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {programs.length === 0 ? (
              <Alert variant="info">Belum ada program. Tambahkan program terlebih dahulu.</Alert>
            ) : (
              programs.map((program, programIndex) => (
                <Card key={program.id} className="mb-4 bg-light border">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div className="flex-grow-1">
                        <Form.Group controlId={`program-nama-${program.id}`} className="mb-0">
                          <Form.Label className="small fw-medium">Nama program</Form.Label>
                          <Form.Select
                            size="sm"
                            value={program.program_id}
                            onChange={handleProgramSelect(program.id)}
                          >
                            <option value="">Pilih Program</option>

                            {masterProgramList.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.kode_program_full || item.kode_program} - {item.nama_program}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control
                            size="sm"
                            className="mt-2"
                            value={program.kode_program}
                            readOnly
                          />
                          <Form.Group className="mb-2">
                            <Form.Label>Indikator Program</Form.Label>

                            <Form.Select
                              size="sm"
                              value={program.indikator_program_id}
                              onChange={handleIndikatorProgramSelect(program.id)}
                            >
                              <option value="">Pilih Indikator Program</option>

                              {program.indikatorProgramOptions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.kode_indikator} - {item.nama_indikator}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Form.Group>
                      </div>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => addKegiatan(program.id)}
                      >
                        Tambah kegiatan
                      </Button>
                    </div>

                    {program.kegiatan.length === 0 ? (
                      <Alert variant="secondary">Belum ada kegiatan di program ini.</Alert>
                    ) : (
                      program.kegiatan.map((kegiatan, kegiatanIndex) => (
                        <Card key={kegiatan.id} className="mb-3">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                              <div className="flex-grow-1">
                                <Form.Group
                                  controlId={`kegiatan-nama-${kegiatan.id}`}
                                  className="mb-0"
                                >
                                  <Form.Label className="small fw-medium">Nama kegiatan</Form.Label>
                                  <Form.Select
                                    size="sm"
                                    value={kegiatan.kegiatan_id}
                                    onChange={handleKegiatanSelect(program.id, kegiatan.id)}
                                  >
                                    <option value="">Pilih Kegiatan</option>

                                    {masterKegiatanList.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.kode_kegiatan_full || item.kode_kegiatan} -{' '}
                                        {item.nama_kegiatan}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-2">
                                  <Form.Label>Indikator Kegiatan</Form.Label>

                                  <Form.Select
                                    size="sm"
                                    value={kegiatan.indikator_kegiatan_id}
                                    onChange={handleIndikatorKegiatanSelect(
                                      program.id,
                                      kegiatan.id,
                                    )}
                                  >
                                    <option value="">Pilih Indikator Kegiatan</option>

                                    {kegiatan.indikatorKegiatanOptions.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.kode_indikator} - {item.nama_indikator}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                              </div>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="mt-3"
                                onClick={() => addSubKegiatan(program.id, kegiatan.id)}
                              >
                                Tambah sub kegiatan
                              </Button>
                            </div>

                            {kegiatan.sub_kegiatan.length === 0 ? (
                              <Alert variant="secondary">
                                Belum ada sub kegiatan di kegiatan ini.
                              </Alert>
                            ) : (
                              kegiatan.sub_kegiatan.map((sub, subIndex) => (
                                <Card key={sub.id} className="mb-3 bg-light">
                                  <Card.Body>
                                    <div className="row g-3">
                                      <div className="col-12">
                                        <Form.Group
                                          controlId={`sub-nama-${sub.id}`}
                                          className="mb-0"
                                        >
                                          <Form.Label className="small fw-medium">
                                            Nama sub kegiatan
                                          </Form.Label>
                                          <Form.Select
                                            size="sm"
                                            value={sub.sub_kegiatan_id}
                                            onChange={handleSubKegiatanSelect(
                                              program.id,
                                              kegiatan.id,
                                              sub.id,
                                            )}
                                          >
                                            <option value="">Pilih Sub Kegiatan</option>

                                            {masterSubKegiatanList.map((item) => (
                                              <option key={item.id} value={item.id}>
                                                {item.kode_sub_kegiatan_full ||
                                                  item.kode_sub_kegiatan}{' '}
                                                - {item.nama_sub_kegiatan}
                                              </option>
                                            ))}
                                          </Form.Select>
                                          <Form.Group>
                                            <Form.Label>Indikator Sub Kegiatan</Form.Label>

                                            <Form.Select
                                              size="sm"
                                              value={sub.indikator_id}
                                              onChange={handleIndikatorSubKegiatanSelect(
                                                program.id,
                                                kegiatan.id,
                                                sub.id,
                                              )}
                                            >
                                              <option value="">Pilih Indikator</option>

                                              {kegiatan.indikatorSubOptions.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                  {item.kode_indikator} - {item.nama_indikator}
                                                </option>
                                              ))}
                                            </Form.Select>
                                          </Form.Group>
                                        </Form.Group>
                                      </div>
                                      <div className="col-md-6">
                                        <Form.Group
                                          controlId={`sub-indikator-${sub.id}`}
                                          className="mb-0"
                                        >
                                          <Form.Label className="small fw-medium">
                                            Indikator
                                          </Form.Label>
                                          <Form.Control
                                            size="sm"
                                            value={sub.indikator}
                                            onChange={handleSubFieldChange(
                                              program.id,
                                              kegiatan.id,
                                              sub.id,
                                              'indikator',
                                            )}
                                          />
                                        </Form.Group>
                                      </div>
                                      <div className="col-md-6">
                                        <Form.Group
                                          controlId={`sub-satuan-${sub.id}`}
                                          className="mb-0"
                                        >
                                          <Form.Label className="small fw-medium">
                                            Satuan
                                          </Form.Label>
                                          <Form.Control
                                            size="sm"
                                            value={sub.satuan}
                                            onChange={handleSubFieldChange(
                                              program.id,
                                              kegiatan.id,
                                              sub.id,
                                              'satuan',
                                            )}
                                          />
                                        </Form.Group>
                                      </div>
                                      <div className="col-md-4">
                                        <Form.Group
                                          controlId={`sub-target-${sub.id}`}
                                          className="mb-0"
                                        >
                                          <Form.Label className="small fw-medium">
                                            Target
                                          </Form.Label>
                                          <Form.Control
                                            size="sm"
                                            value={sub.target}
                                            onChange={handleSubFieldChange(
                                              program.id,
                                              kegiatan.id,
                                              sub.id,
                                              'target',
                                            )}
                                          />
                                        </Form.Group>
                                      </div>
                                      <div className="col-md-4">
                                        <Form.Group
                                          controlId={`sub-pagu-${sub.id}`}
                                          className="mb-0"
                                        >
                                          <Form.Label className="small fw-medium">Pagu</Form.Label>
                                          <Form.Control
                                            size="sm"
                                            value={sub.pagu}
                                            onChange={handleSubFieldChange(
                                              program.id,
                                              kegiatan.id,
                                              sub.id,
                                              'pagu',
                                            )}
                                          />
                                        </Form.Group>
                                      </div>
                                      <div className="col-md-4">
                                        <Form.Group
                                          controlId={`sub-keterkaitan-${sub.id}`}
                                          className="mb-0"
                                        >
                                          <Form.Label className="small fw-medium">
                                            Keterkaitan prioritas
                                          </Form.Label>
                                          <Form.Control
                                            size="sm"
                                            value={sub.keterkaitan_prioritas}
                                            onChange={handleSubFieldChange(
                                              program.id,
                                              kegiatan.id,
                                              sub.id,
                                              'keterkaitan_prioritas',
                                            )}
                                          />
                                        </Form.Group>
                                      </div>
                                    </div>
                                  </Card.Body>
                                </Card>
                              ))
                            )}
                          </Card.Body>
                        </Card>
                      ))
                    )}
                  </Card.Body>
                </Card>
              ))
            )}
          </Card.Body>
          <Card.Footer className="bg-light d-flex justify-content-between align-items-center">
            <Button variant="outline-secondary" size="sm" onClick={goBack}>
              ← Kembali ke prioritas
            </Button>
            <Button size="sm" onClick={goNext}>
              Lanjut: review & simpan →
            </Button>
          </Card.Footer>
        </Card>
      )}

      {/* Langkah 4 — Review & simpan */}
      {step === 3 && (
        <Card className="mb-4">
          <Card.Header className="bg-white border-bottom">
            <h6 className="fw-semibold mb-0">Review & simpan</h6>
            <p className="small text-muted mb-0">Periksa ringkasan sebelum dokumen disimpan.</p>
          </Card.Header>
          <Card.Body>
            <p
              className="small text-muted fw-medium text-uppercase mb-2"
              style={{ letterSpacing: '.05em' }}
            >
              Ringkasan metadata
            </p>
            <table className="table table-sm table-borderless mb-4" style={{ fontSize: 13 }}>
              <tbody>
                <tr>
                  <td className="text-muted" style={{ width: 160 }}>
                    Periode RPJMD
                  </td>
                  <td>
                    {periodeLabel
                      ? `${periodeLabel.nama} (${periodeLabel.tahun_awal}–${periodeLabel.tahun_akhir})`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Tahun anggaran</td>
                  <td>{tahunVal}</td>
                </tr>
                <tr>
                  <td className="text-muted">Judul dokumen</td>
                  <td>{judul}</td>
                </tr>
                <tr>
                  <td className="text-muted">Alasan</td>
                  <td>
                    {createReasonText || (
                      <span className="text-muted fst-italic">— lihat referensi berkas —</span>
                    )}
                  </td>
                </tr>
                {createReasonFile && (
                  <tr>
                    <td className="text-muted">Referensi berkas</td>
                    <td>
                      <code>{createReasonFile}</code>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="text-muted">Visi</td>
                  <td>{visiList.find((v) => v.id == visiId)?.isi_visi || '-'}</td>
                </tr>

                <tr>
                  <td className="text-muted">Misi</td>
                  <td>
                    {misiList.find((v) => v.id == misiId)?.isi_misi ||
                      misiList.find((v) => v.id == misiId)?.nama_misi ||
                      '-'}
                  </td>
                </tr>

                <tr>
                  <td className="text-muted">Prioritas Nasional</td>
                  <td>
                    {prioritasNasionalList.find((v) => v.id == prioritasNasionalId)?.nama_prionas ||
                      '-'}
                  </td>
                </tr>

                <tr>
                  <td className="text-muted">Prioritas Daerah</td>
                  <td>
                    {prioritasDaerahList.find((v) => v.id == prioritasDaerahId)?.nama_prioda || '-'}
                  </td>
                </tr>

                <tr>
                  <td className="text-muted">Prioritas Gubernur</td>
                  <td>
                    {prioritasGubernurList.find((v) => v.id == prioritasGubernurId)?.nama_priogub ||
                      '-'}
                  </td>
                </tr>

                <tr>
                  <td className="text-muted">Tujuan</td>
                  <td>{tujuanList.find((v) => v.id == tujuanId)?.isi_tujuan || '-'}</td>
                </tr>

                <tr>
                  <td className="text-muted">Sasaran</td>
                  <td>{sasaranList.find((v) => v.id == sasaranId)?.isi_sasaran || '-'}</td>
                </tr>

                <tr>
                  <td className="text-muted">Strategi</td>
                  <td>{strategiList.find((v) => v.id == strategiId)?.deskripsi || '-'}</td>
                </tr>

                <tr>
                  <td className="text-muted">Arah Kebijakan</td>
                  <td>
                    {arahKebijakanList.find((v) => v.id == arahKebijakanId)?.deskripsi || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Jumlah program</td>
                  <td>{programs.length}</td>
                </tr>
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td className="text-muted">Program</td>
                    <td>
                      <strong>
                        {program.nama || (
                          <span className="text-muted fst-italic">(tanpa nama)</span>
                        )}
                      </strong>
                      <div className="small text-muted">{program.kegiatan.length} kegiatan</div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="text-muted">Status awal</td>
                  <td>
                    <span className="badge bg-secondary">draft</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <Alert variant="info" className="py-2 small mb-0">
              Setelah disimpan, dokumen berstatus <strong>draft</strong> dan Anda akan diarahkan ke
              halaman detail untuk menambahkan item.
            </Alert>
          </Card.Body>
          <Card.Footer className="bg-light d-flex justify-content-between align-items-center">
            <Button variant="outline-secondary" size="sm" onClick={goBack}>
              ← Kembali
            </Button>
            <Button variant="success" size="sm" onClick={submit} disabled={busy}>
              {busy ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  Menyimpan…
                </>
              ) : (
                '✓ Simpan dokumen'
              )}
            </Button>
          </Card.Footer>
        </Card>
      )}
    </RkpdDashboardLayout>
  );
};

export default RkpdV2BuatDokumenPage;
