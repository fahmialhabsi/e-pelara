import { useReducer, useEffect, useCallback } from 'react';
import Select from 'react-select';
import api from '../../services/api';

const toOption = (item) => ({
  value: item.kode_rekening,
  label: `${item.kode_rekening} - ${item.uraian}`,
  raw: item,
});

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none',
    borderRadius: '0.5rem',
    minHeight: '40px',
    fontSize: '0.875rem',
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#111827',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
};

const initialState = {
  akunList: [],
  kelompokList: [],
  jenisList: [],
  objekList: [],
  rincianList: [],
  subRincianList: [],

  selectedAkun: null,
  selectedKelompok: null,
  selectedJenis: null,
  selectedObjek: null,
  selectedRincian: null,
  selectedSubRincian: null,

  loadingAkun: false,
  loadingKelompok: false,
  loadingJenis: false,
  loadingObjek: false,
  loadingRincian: false,
  loadingSubRincian: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING_AKUN':
      return { ...state, loadingAkun: true };
    case 'LOADING_KELOMPOK':
      return { ...state, loadingKelompok: true };
    case 'LOADING_JENIS':
      return { ...state, loadingJenis: true };
    case 'LOADING_OBJEK':
      return { ...state, loadingObjek: true };
    case 'LOADING_RINCIAN':
      return { ...state, loadingRincian: true };
    case 'LOADING_SUB_RINCIAN':
      return { ...state, loadingSubRincian: true };

    case 'SET_AKUN':
      return { ...state, akunList: action.payload, loadingAkun: false };

    case 'SELECT_AKUN':
      return {
        ...state,
        selectedAkun: action.payload,
        selectedKelompok: null,
        selectedJenis: null,
        selectedObjek: null,
        selectedRincian: null,
        kelompokList: [],
        jenisList: [],
        objekList: [],
        rincianList: [],
      };

    case 'SET_KELOMPOK':
      return { ...state, kelompokList: action.payload, loadingKelompok: false };

    case 'SELECT_KELOMPOK':
      return {
        ...state,
        selectedKelompok: action.payload,
        selectedJenis: null,
        selectedObjek: null,
        selectedRincian: null,
        jenisList: [],
        objekList: [],
        rincianList: [],
      };

    case 'SET_JENIS':
      return { ...state, jenisList: action.payload, loadingJenis: false };

    case 'SELECT_JENIS':
      return {
        ...state,
        selectedJenis: action.payload,
        selectedObjek: null,
        selectedRincian: null,
        objekList: [],
        rincianList: [],
      };

    case 'SET_OBJEK':
      return { ...state, objekList: action.payload, loadingObjek: false };

    case 'SELECT_OBJEK':
      return { ...state, selectedObjek: action.payload, selectedRincian: null, rincianList: [] };

    case 'SET_RINCIAN':
      return { ...state, rincianList: action.payload, loadingRincian: false };

    case 'SET_SUB_RINCIAN':
      return {
        ...state,
        subRincianList: action.payload,
        loadingSubRincian: false,
      };

    case 'SELECT_RINCIAN':
      return {
        ...state,
        selectedRincian: action.payload,
        selectedSubRincian: null,
        subRincianList: [],
      };

    case 'SELECT_SUB_RINCIAN':
      return {
        ...state,
        selectedSubRincian: action.payload,
      };

    default:
      return state;
  }
}

export default function MasterBelanjaCascading({
  value = null,
  onChange,
  disabled = false,
  required = false,
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    console.log('MasterBelanja value:', value);
  }, [value]);

  const {
    akunList,
    kelompokList,
    jenisList,
    objekList,
    rincianList,
    subRincianList,

    selectedAkun,
    selectedKelompok,
    selectedJenis,
    selectedObjek,
    selectedRincian,
    selectedSubRincian,

    loadingAkun,
    loadingKelompok,
    loadingJenis,
    loadingObjek,
    loadingRincian,
    loadingSubRincian,
  } = state;

  useEffect(() => {
    if (!value) return;

    console.log('PRELOAD RINCIAN', value);

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];

      console.log('Kode rekening existing:', first.kode_rekening);
    }
  }, [value]);

  // Level 1 — Akun
  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'LOADING_AKUN' });
    api
      .get('/master-kode-rekening-belanja')
      .then((res) => {
        if (!cancelled)
          dispatch({ type: 'SET_AKUN', payload: (res.data?.data || []).map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  // Level 2 — Kelompok
  useEffect(() => {
    if (!selectedAkun) return;
    let cancelled = false;
    dispatch({ type: 'LOADING_KELOMPOK' });
    api
      .get('/master-kode-rekening-belanja', { params: { parent_kode: selectedAkun.value } })
      .then((res) => {
        if (!cancelled)
          dispatch({ type: 'SET_KELOMPOK', payload: (res.data?.data || []).map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedAkun]);

  // Level 3 — Jenis
  useEffect(() => {
    if (!selectedKelompok) return;
    let cancelled = false;
    dispatch({ type: 'LOADING_JENIS' });
    api
      .get('/master-kode-rekening-belanja', { params: { parent_kode: selectedKelompok.value } })
      .then((res) => {
        if (!cancelled)
          dispatch({ type: 'SET_JENIS', payload: (res.data?.data || []).map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedKelompok]);

  // Level 4 — Objek
  useEffect(() => {
    if (!selectedJenis) return;
    let cancelled = false;
    dispatch({ type: 'LOADING_OBJEK' });
    api
      .get('/master-kode-rekening-belanja', { params: { parent_kode: selectedJenis.value } })
      .then((res) => {
        if (!cancelled)
          dispatch({ type: 'SET_OBJEK', payload: (res.data?.data || []).map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedJenis]);

  // Level 5 — Rincian
  useEffect(() => {
    if (!selectedObjek) return;
    let cancelled = false;
    dispatch({ type: 'LOADING_RINCIAN' });
    api
      .get('/master-kode-rekening-belanja', { params: { parent_kode: selectedObjek.value } })
      .then((res) => {
        if (!cancelled)
          dispatch({ type: 'SET_RINCIAN', payload: (res.data?.data || []).map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedObjek]);

  // Level 6 — Sub Rincian
  useEffect(() => {
    if (!selectedRincian) return;

    let cancelled = false;

    dispatch({ type: 'LOADING_SUB_RINCIAN' });

    api
      .get('/master-kode-rekening-belanja', {
        params: { parent_kode: selectedRincian.value },
      })
      .then((res) => {
        if (!cancelled) {
          dispatch({
            type: 'SET_SUB_RINCIAN',
            payload: (res.data?.data || []).map(toOption),
          });
        }
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [selectedRincian]);

  // Notify parent
  useEffect(() => {
    if (!onChange) return;
    onChange({
      akun: selectedAkun?.raw || null,
      kelompok: selectedKelompok?.raw || null,
      jenis: selectedJenis?.raw || null,
      objek: selectedObjek?.raw || null,
      rincian: selectedRincian?.raw || null,
      sub_rincian: selectedSubRincian?.raw || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedAkun,
    selectedKelompok,
    selectedJenis,
    selectedObjek,
    selectedRincian,
    selectedSubRincian,
  ]);

  const handleAkun = useCallback((opt) => dispatch({ type: 'SELECT_AKUN', payload: opt }), []);
  const handleKelompok = useCallback(
    (opt) => dispatch({ type: 'SELECT_KELOMPOK', payload: opt }),
    [],
  );
  const handleJenis = useCallback((opt) => dispatch({ type: 'SELECT_JENIS', payload: opt }), []);
  const handleObjek = useCallback((opt) => dispatch({ type: 'SELECT_OBJEK', payload: opt }), []);
  const handleRincian = useCallback(
    (opt) => dispatch({ type: 'SELECT_RINCIAN', payload: opt }),
    [],
  );
  const handleSubRincian = useCallback(
    (opt) => dispatch({ type: 'SELECT_SUB_RINCIAN', payload: opt }),
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={labelStyle}>
          Akun {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={akunList}
          value={selectedAkun}
          onChange={handleAkun}
          isLoading={loadingAkun}
          isDisabled={disabled}
          placeholder="Pilih Akun..."
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          isClearable
        />
        {selectedAkun && <p style={hintStyle}>Kode: {selectedAkun.value}</p>}
      </div>

      <div>
        <label style={labelStyle}>
          Kelompok {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={kelompokList}
          value={selectedKelompok}
          onChange={handleKelompok}
          isLoading={loadingKelompok}
          isDisabled={disabled || !selectedAkun}
          placeholder={selectedAkun ? 'Pilih Kelompok...' : 'Pilih Akun terlebih dahulu'}
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          isClearable
        />
        {selectedKelompok && <p style={hintStyle}>Kode: {selectedKelompok.value}</p>}
      </div>

      <div>
        <label style={labelStyle}>
          Jenis {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={jenisList}
          value={selectedJenis}
          onChange={handleJenis}
          isLoading={loadingJenis}
          isDisabled={disabled || !selectedKelompok}
          placeholder={selectedKelompok ? 'Pilih Jenis...' : 'Pilih Kelompok terlebih dahulu'}
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          isClearable
        />
        {selectedJenis && <p style={hintStyle}>Kode: {selectedJenis.value}</p>}
      </div>

      <div>
        <label style={labelStyle}>
          Objek {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={objekList}
          value={selectedObjek}
          onChange={handleObjek}
          isLoading={loadingObjek}
          isDisabled={disabled || !selectedJenis}
          placeholder={selectedJenis ? 'Pilih Objek...' : 'Pilih Jenis terlebih dahulu'}
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          isClearable
        />
        {selectedObjek && <p style={hintStyle}>Kode: {selectedObjek.value}</p>}
      </div>

      <div>
        <label style={labelStyle}>
          Rincian {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={rincianList}
          value={selectedRincian}
          onChange={handleRincian}
          isLoading={loadingRincian}
          isDisabled={disabled || !selectedObjek}
          placeholder={selectedObjek ? 'Pilih Rincian...' : 'Pilih Objek terlebih dahulu'}
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          isClearable
        />
        {selectedRincian && <p style={hintStyle}>Kode: {selectedRincian.value}</p>}
      </div>

      <div>
        <label style={labelStyle}>
          Sub Rincian {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>

        <Select
          options={subRincianList}
          value={selectedSubRincian}
          onChange={handleSubRincian}
          isLoading={loadingSubRincian}
          isDisabled={disabled || !selectedRincian}
          placeholder={selectedRincian ? 'Pilih Sub Rincian...' : 'Pilih Rincian terlebih dahulu'}
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          isClearable
        />

        {selectedSubRincian && <p style={hintStyle}>Kode: {selectedSubRincian.value}</p>}
      </div>

      {selectedAkun &&
        selectedKelompok &&
        selectedJenis &&
        selectedObjek &&
        selectedRincian &&
        selectedSubRincian && (
          <div style={summaryStyle}>
            <p
              style={{
                margin: '0 0 0.25rem',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#1d4ed8',
              }}
            >
              ✓ Kode Rekening Terpilih
            </p>
            <p style={summaryRow}>
              <span>Akun</span>
              <span>{selectedAkun.value}</span>
            </p>
            <p style={summaryRow}>
              <span>Kelompok</span>
              <span>{selectedKelompok.value}</span>
            </p>
            <p style={summaryRow}>
              <span>Jenis</span>
              <span>{selectedJenis.value}</span>
            </p>
            <p style={summaryRow}>
              <span>Objek</span>
              <span>{selectedObjek.value}</span>
            </p>
            <p style={summaryRow}>
              <span>Rincian</span>
              <span>{selectedRincian.value}</span>
            </p>
            <p style={summaryRow}>
              <span>Sub Rincian</span>
              <span>{selectedSubRincian.value}</span>
            </p>
          </div>
        )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.375rem',
};
const hintStyle = { margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280' };
const summaryStyle = {
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
};
const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '0.125rem 0',
  fontSize: '0.75rem',
  color: '#1e40af',
};
