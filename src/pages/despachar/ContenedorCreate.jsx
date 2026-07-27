import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Button, TextField, Grid, Paper, Tab, Tabs, Typography,
  Alert, Snackbar, CircularProgress, IconButton, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem as MuiMenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MoveUpIcon from '@mui/icons-material/MoveUp';
import BlockIcon from '@mui/icons-material/Block';
import PrintIcon from '@mui/icons-material/Print';
import TableViewIcon from '@mui/icons-material/TableView';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { downloadBlobPost } from '../../utils/pdfUtils';
import { CONTENEDOR_ENDPOINT_MAP, CONTENEDOR_SCAN_MAP, CONTENEDOR_HBLS_MAP, CONTENEDOR_ASSIGN_MAP, CONTENEDOR_REMOVE_MAP, CONTENEDOR_SAVE_ERRORS_MAP, HBL_PALLET_BY_NUMBER_MAP, ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { dataGridStyles } from '../../components/common/dataGridStyles';
import TrackingModal from './TrackingModal';
import ContenedorPrintModal from './ContenedorPrintModal';
import dayjs from 'dayjs';

const MANIFIESTO_CONFIG = {
  aereo:           [{ label: 'Manifiesto CSV',   endpoint: ENDPOINTS.MANIFIESTO_AEREO,            ext: 'csv'  }],
  transcargo:      [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_TRANSCARGO,       ext: 'xlsx' }],
  transcargoaereo: [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_AEREO_TRANSCARGO, ext: 'xlsx' }],
  palco:           [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_PALCO,            ext: 'xlsx' }],
  cubapack:        [
    { label: 'Manifiesto Excel', endpoint: ENDPOINTS.MANIFIESTO_CUBAPACK,     ext: 'xlsx' },
    { label: 'Manifiesto TXT',   endpoint: ENDPOINTS.MANIFIESTO_CUBAPACK_TXT, ext: 'txt'  },
  ],
  cubapost:        [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_CUBAPOST,         ext: 'xlsx' }],
};

const PALLET_PREFIX = {
  aereo:           'P-AE-',
  transcargo:      'P-TR-',
  palco:           'P-PA-',
  cubapack:        'P-CA-',
  cubapost:        'P-CO-',
  transcargoaereo: 'P-TA-',
};

const CARRIER_CONFIG = {
  aereo:           { title: 'Aéreo',             numContenedorLabel: 'Numero Contenedor', selloLabel: 'Sello', masterBLLabel: 'Master BL' },
  palco:           { title: 'Palco',             numContenedorLabel: 'Numero Contenedor', selloLabel: 'Sello', masterBLLabel: 'Master BL' },
  transcargo:      { title: 'Transcargo',        numContenedorLabel: 'Numero Contenedor', selloLabel: 'Sello', masterBLLabel: 'Master BL' },
  transcargoaereo: { title: 'Transcargo Aéreo',  numContenedorLabel: 'Numero Contenedor', selloLabel: 'Sello', masterBLLabel: 'Master BL' },
  cubapack:        { title: 'CubaPack',          numContenedorLabel: 'Numero Contenedor', selloLabel: 'Sello', masterBLLabel: 'Master BL' },
  cubapost:        { title: 'CubaPost',          numContenedorLabel: 'Numero Contenedor', selloLabel: 'Sello', masterBLLabel: 'Master BL' },
};

/**
 * Parse a raw scan code into { numero, bultoNumero }.
 * Formats supported:
 *   HBLNUMBER/1        → numero=HBLNUMBER, bultoNumero=1
 *   HBLNUMBER-001      → numero=HBLNUMBER, bultoNumero=1
 *   HBLNUMBER          → numero=HBLNUMBER, bultoNumero=1 (default)
 */
function parseScanCode(raw) {
  const code = (raw || '').trim();
  // Try split on last '/'
  const slashIdx = code.lastIndexOf('/');
  if (slashIdx !== -1) {
    const suffix = code.slice(slashIdx + 1);
    if (/^\d+$/.test(suffix)) {
      return { numero: code.slice(0, slashIdx).trim(), bultoNumero: parseInt(suffix, 10) || 1 };
    }
  }
  // Try split on last '-' if the right side is all digits
  const dashIdx = code.lastIndexOf('-');
  if (dashIdx !== -1) {
    const suffix = code.slice(dashIdx + 1);
    if (/^\d+$/.test(suffix)) {
      return { numero: code.slice(0, dashIdx).trim(), bultoNumero: parseInt(suffix, 10) || 1 };
    }
  }
  return { numero: code, bultoNumero: 1 };
}

export default function ContenedorCreate({ hblType = 'aereo', editMode = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const cfg = CARRIER_CONFIG[hblType] || CARRIER_CONFIG.aereo;
  const endpoint = CONTENEDOR_ENDPOINT_MAP[hblType];
  const scanFn = CONTENEDOR_SCAN_MAP[hblType];
  const hblsFn = CONTENEDOR_HBLS_MAP[hblType];
  const assignFn = CONTENEDOR_ASSIGN_MAP[hblType];
  const removeFn = CONTENEDOR_REMOVE_MAP[hblType];
  const saveErrorsFn = CONTENEDOR_SAVE_ERRORS_MAP[hblType];

  const fileInputRef = useRef(null);
  const scanInputRef = useRef(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [exportingManifiesto, setExportingManifiesto] = useState(false);
  const [manifiestoMenuAnchor, setManifiestoMenuAnchor] = useState(null);
  const manifiestoOptions = MANIFIESTO_CONFIG[hblType] ?? [];
  const [selectedRows, setSelectedRows] = useState({ type: 'include', ids: new Set() });
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveEnvio, setMoveEnvio] = useState('');
  const [moving, setMoving] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [searchNumero, setSearchNumero] = useState('');

  // Form state
  const [form, setForm] = useState({
    contenedorEnvio: '',
    fecha: dayjs().format('YYYY-MM-DD'),
    contenedorNumber: '',
    contenedorSello: '',
    contenedorMasterBL: '',
    contenedorBuque: '',
    contenedorViaje: '',
    contenedorManifiestoNumero: '',
    portLoading: '',
    portDischarge: '',
    contenedorTipo: 0,
  });

  // Scan state
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  // scannedList rows: { hblid, numero, bultoNumero, totalBultos, remitenteName, destinatarioName, producto, peso, cantidad, volumen, isNew }
  const [scannedList, setScannedList] = useState([]);
  // errores rows: { id(uuid), numero, bultoNumero, reason, errorType, hblData }
  // errorType: 'not_found' | 'other_container' | 'missing_bulto'
  const [errores, setErrores] = useState([]);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(editMode);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load GeneralSettings to get blockScanError flag
  const { data: generalSettings } = useQuery({
    queryKey: ['generalSettings'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.GENERAL_SETTING);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d[0] : d;
    },
    staleTime: 5 * 60 * 1000,
  });
  const blockScanError = Boolean(generalSettings?.blockScanError);
  const blockScanErrorRef = useRef(false);
  useEffect(() => { blockScanErrorRef.current = blockScanError; }, [blockScanError]);

  const [scanBlockedError, setScanBlockedError] = useState(null);
  const scanBlocked = Boolean(scanBlockedError);

  const addScanError = (errObj) => {
    setErrores(e => [...e, errObj]);
    if (blockScanErrorRef.current) setScanBlockedError(errObj);
  };

  // Load TipoEnvios for "Crear Envio" button — no staleTime so we always get the current EnvioActual
  const { data: tiposEnvio = [] } = useQuery({
    queryKey: ['tipoenvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  // Load existing contenedor data in edit mode
  useEffect(() => {
    if (editMode && id) {
      setLoadingEdit(true);
      Promise.all([
        apiClient.get(`${endpoint}/${id}`),
        apiClient.get(hblsFn(id)),
      ])
        .then(([cRes, hblRes]) => {
          const c = cRes.data?.data || cRes.data;
          setForm({
            contenedorEnvio: c.contenedorEnvio || '',
            fecha: c.dispatchDate ? dayjs(c.dispatchDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            contenedorNumber: c.contenedorNumber || '',
            contenedorSello: c.contenedorSello || '',
            contenedorMasterBL: c.contenedorMasterBL || '',
            contenedorBuque: c.contenedorBuque || '',
            contenedorViaje: c.contenedorViaje || '',
            contenedorManifiestoNumero: c.contenedorManifiestoNumero || '',
            portLoading: c.portLoading || '',
            portDischarge: c.portDischarge || '',
            contenedorTipo: c.contenedorTipo || 0,
          });
          const hbls = Array.isArray(hblRes.data) ? hblRes.data : hblRes.data?.data ?? [];
          setScannedList(hbls.map(h => ({
            ...h,
            hblid: h.hBLID ?? h.hblid ?? h.HBLID,
            bultoNumero: 1,
            totalBultos: h.totalBultos ?? h.TotalBultos ?? 1,
            isNew: false,
          })));
          try {
            const raw = c.scanErrors ?? c.ScanErrors;
            if (raw) setErrores(JSON.parse(raw));
          } catch {
            // malformed JSON — start with empty errors
          }
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar el contenedor', severity: 'error' }))
        .finally(() => setLoadingEdit(false));
    }
  }, [editMode, id, endpoint, hblsFn]);

  const saveErrorsTimer = useRef(null);
  useEffect(() => {
    if (!editMode || !id) return;
    clearTimeout(saveErrorsTimer.current);
    saveErrorsTimer.current = setTimeout(async () => {
      try {
        await apiClient.patch(saveErrorsFn(id), {
          scanErrors: errores.length > 0 ? JSON.stringify(errores) : null,
        });
      } catch {
        // non-critical — errors will still be in state for this session
      }
    }, 1500);
    return () => clearTimeout(saveErrorsTimer.current);
  }, [errores, editMode, id, saveErrorsFn]);

  const filteredScanned = useMemo(() =>
    !searchNumero.trim()
      ? scannedList
      : scannedList.filter(h => (h.numero || '').toLowerCase().includes(searchNumero.trim().toLowerCase())),
    [scannedList, searchNumero]);

  const selectionCount = selectedRows.type === 'exclude'
    ? filteredScanned.length - selectedRows.ids.size
    : selectedRows.ids.size;

  const getSelectedHblData = useCallback(() => {
    if (selectedRows.type === 'exclude') {
      return filteredScanned.filter(row => {
        const rowId = `${row.hblid ?? row.numero}-${row.bultoNumero ?? 1}`;
        return !selectedRows.ids.has(rowId);
      });
    }
    return scannedList.filter(row => {
      const rowId = `${row.hblid ?? row.numero}-${row.bultoNumero ?? 1}`;
      return selectedRows.ids.has(rowId);
    });
  }, [selectedRows, filteredScanned, scannedList]);

  const totales = useMemo(() => ({
    hbls: new Set(scannedList.map(h => h.hblid)).size,
    bultos: scannedList.length,
    peso: scannedList.reduce((a, h) => a + (Number(h.peso) || 0), 0),
    volumen: scannedList.reduce((a, h) => a + (Number(h.volumen) || 0), 0),
  }), [scannedList]);

  const handleField = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const [creatingEnvio, setCreatingEnvio] = useState(false);
  const handleCrearEnvio = async () => {
    if (!form.contenedorEnvio.trim()) {
      setSnackbar({ open: true, message: 'Escriba el número de envío', severity: 'warning' });
      return;
    }
    setCreatingEnvio(true);
    try {
      const dto = {
        contenedorEnvio: form.contenedorEnvio,
        dispatchDate: form.fecha || new Date().toISOString(),
        contenedorNumber: form.contenedorNumber,
        contenedorSello: form.contenedorSello,
        contenedorMasterBL: form.contenedorMasterBL,
        contenedorBuque: form.contenedorBuque,
        contenedorViaje: form.contenedorViaje,
        contenedorManifiestoNumero: form.contenedorManifiestoNumero,
        portLoading: form.portLoading,
        portDischarge: form.portDischarge,
        contenedorTipo: form.contenedorTipo,
        isActive: true,
        agenciaID: user?.agenciaId || 0,
        createdBy: user?.username || '',
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: new Date().toISOString(),
      };
      const res = await apiClient.post(endpoint, dto);
      const newId = typeof res.data === 'number' ? res.data : (res.data?.data ?? res.data?.id);
      setSnackbar({ open: true, message: 'Envío creado', severity: 'success' });
      setTimeout(() => navigate(`/hbl/${hblType}/contenedor/edit/${newId}`), 800);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al crear envío', severity: 'error' });
    } finally {
      setCreatingEnvio(false);
    }
  };

  /**
   * Process a single parsed scan code. Adds to scannedList or errores.
   * Returns the HBL data if successfully scanned, null otherwise.
   */
  const processScan = useCallback(async (numero, bultoNumero, skipDuplicate = false) => {
    // Already scanned this HBL+bulto combo?
    const alreadyScanned = scannedList.some(
      h => h.numero?.toLowerCase() === numero.toLowerCase() && h.bultoNumero === bultoNumero
    );
    if (alreadyScanned) {
      if (!skipDuplicate) {
        addScanError({
          id: `${Date.now()}-${Math.random()}`,
          numero,
          bultoNumero,
          reason: 'Ya escaneado',
          errorType: 'duplicate',
        });
      }
      return null;
    }

    try {
      const res = await apiClient.get(scanFn(numero));
      const hbl = res.data?.data || res.data;
      const hblid = hbl.hBLID ?? hbl.hblid ?? hbl.HBLID;
      const totalBultos = hbl.totalBultos ?? hbl.TotalBultos ?? 1;
      const contenedorID = hbl.contenedorID ?? hbl.ContenedorID;
      const contenedorEnvio = hbl.contenedorEnvio ?? hbl.ContenedorEnvio ?? '';

      // HBL already in another container?
      if (contenedorID && String(contenedorID) !== String(id)) {
        addScanError({
          id: `${Date.now()}-${Math.random()}`,
          numero,
          bultoNumero,
          reason: `HBL en otro contenedor: ${contenedorEnvio || contenedorID}`,
          errorType: 'other_container',
          hblData: { ...hbl, hblid, totalBultos },
        });
        return null;
      }

      // Auto-assign immediately if container already exists (edit mode)
      let assignedNow = false;
      if (editMode && id) {
        try {
          await apiClient.post(assignFn(Number(id)), {
            hblIds: [hblid],
            envio: form.contenedorEnvio,
            lastUpdatedBy: user?.username || '',
          });
          assignedNow = true;
        } catch {
          // Fall through — HBL stays isNew:true so Save will retry
        }
      }

      // Add to scanned list
      setScannedList(list => [...list, {
        ...hbl,
        hblid,
        bultoNumero,
        totalBultos,
        isNew: !assignedNow,
      }]);

      // Clear resolved errors for this HBL: missing_bulto for this bulto, and sibling warning
      setErrores(e => e.filter(x => {
        if (x.errorType === 'missing_bulto' &&
            x.numero?.toLowerCase() === numero.toLowerCase() &&
            x.bultoNumero === bultoNumero) return false;
        if (x.errorType === 'not_scanned_sibling' &&
            x.numero?.toLowerCase() === numero.toLowerCase()) return false;
        return true;
      }));

      // Warn about header siblings not yet scanned
      const siblingNros = (hbl.siblingNros ?? hbl.SiblingNros ?? '').trim();
      if (siblingNros) {
        const siblings = siblingNros.split(',').map(s => s.trim()).filter(Boolean);
        setErrores(currentErrors => {
          const existingSiblingKeys = new Set(
            currentErrors
              .filter(e => e.errorType === 'not_scanned_sibling')
              .map(e => e.numero?.toLowerCase())
          );
          const newErrors = [];
          for (const sibNum of siblings) {
            const key = sibNum.toLowerCase();
            const alreadyScanned = scannedList.some(h => h.numero?.toLowerCase() === key);
            if (!alreadyScanned && !existingSiblingKeys.has(key)) {
              newErrors.push({
                id: `${Date.now()}-${Math.random()}-sib-${sibNum}`,
                numero: sibNum,
                bultoNumero: 1,
                reason: 'HBL del mismo grupo no escaneado',
                errorType: 'not_scanned_sibling',
              });
            }
          }
          return [...currentErrors, ...newErrors];
        });
      }

      // Warn about bultos not yet scanned for multi-bulto HBLs
      if (totalBultos > 1) {
        const missingBultos = [];
        for (let b = 1; b <= totalBultos; b++) {
          if (b === bultoNumero) continue;
          const alreadyIn = scannedList.some(
            h => h.numero?.toLowerCase() === numero.toLowerCase() && h.bultoNumero === b
          );
          if (!alreadyIn) missingBultos.push(b);
        }
        if (missingBultos.length > 0) {
          setErrores(currentErrors => {
            const existingKeys = new Set(
              currentErrors
                .filter(e => e.errorType === 'missing_bulto')
                .map(e => `${e.numero?.toLowerCase()}-${e.bultoNumero}`)
            );
            const newErrors = missingBultos
              .filter(b => !existingKeys.has(`${numero.toLowerCase()}-${b}`))
              .map(b => ({
                id: `${Date.now()}-${Math.random()}-${b}`,
                numero,
                bultoNumero: b,
                reason: `Bulto ${b} de ${totalBultos} no escaneado`,
                errorType: 'missing_bulto',
              }));
            return [...currentErrors, ...newErrors];
          });
        }
      }

      return hbl;
    } catch (err) {
      const reason = err.status === 404 ? 'HBL no encontrado' : 'Error al escanear';
      addScanError({
        id: `${Date.now()}-${Math.random()}`,
        numero,
        bultoNumero,
        reason,
        errorType: 'not_found',
      });
      return null;
    }
  }, [scanFn, scannedList, id, editMode, assignFn, form.contenedorEnvio, user?.username]);

  const handlePalletScan = useCallback(async (raw, skipDuplicate = false) => {
    const palletNumber = raw.toUpperCase();
    const expectedPrefix = PALLET_PREFIX[hblType];

    if (!palletNumber.startsWith(expectedPrefix)) {
      addScanError({
        id: `${Date.now()}-${Math.random()}`,
        numero: palletNumber,
        bultoNumero: 0,
        reason: `Pallet de otro carrier (se esperaba ${expectedPrefix}...)`,
        errorType: 'wrong_carrier',
      });
      return;
    }

    try {
      const res = await apiClient.get(HBL_PALLET_BY_NUMBER_MAP[hblType](palletNumber));
      const { hbls } = res.data;
      if (!hbls || hbls.length === 0) {
        addScanError({
          id: `${Date.now()}-${Math.random()}`,
          numero: palletNumber,
          bultoNumero: 0,
          reason: 'Pallet sin HBLs asignados',
          errorType: 'not_found',
        });
        return;
      }
      let added = 0;
      for (const hbl of hbls) {
        const numero = hbl.numero ?? hbl.Numero ?? '';
        if (!numero) continue;
        const result = await processScan(numero, 1, skipDuplicate);
        if (result) added++;
      }
      setSnackbar({ open: true, message: `Pallet ${palletNumber}: ${added} HBL(s) cargados`, severity: 'success' });
    } catch (err) {
      addScanError({
        id: `${Date.now()}-${Math.random()}`,
        numero: palletNumber,
        bultoNumero: 0,
        reason: err.status === 404 ? 'Pallet no encontrado' : (err.message || 'Error al cargar pallet'),
        errorType: 'not_found',
      });
    }
  }, [hblType, processScan]);

  const handleScan = async () => {
    if (scanBlocked) return;
    const raw = scanInput.trim();
    if (!raw) return;
    setScanInput('');
    setScanning(true);
    if (raw.toUpperCase().startsWith('P-')) {
      await handlePalletScan(raw);
    } else {
      const { numero, bultoNumero } = parseScanCode(raw);
      await processScan(numero, bultoNumero);
    }
    setScanning(false);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const handleRemoveScanned = (hblid, bultoNumero) => {
    setScannedList(list => list.filter(h => !(h.hblid === hblid && h.bultoNumero === bultoNumero)));
  };

  const handleDismissError = (errorId) => {
    setErrores(e => e.filter(x => x.id !== errorId));
  };

  const handleMoveToContainer = async (error) => {
    // Move the HBL from another container into this one
    if (!error.hblData) return;
    const { hblData } = error;
    setScannedList(list => [...list, {
      ...hblData,
      bultoNumero: error.bultoNumero,
      totalBultos: hblData.totalBultos ?? 1,
      isNew: true,
    }]);
    handleDismissError(error.id);
  };

  // Excel import
  const handleExcelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-imported

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // Extract first column, skip empty cells, deduplicate
      const codes = [...new Set(
        rows.map(r => String(r[0] ?? '').trim()).filter(Boolean)
      )];

      if (codes.length === 0) {
        setSnackbar({ open: true, message: 'El archivo no contiene datos en la primera columna', severity: 'warning' });
        return;
      }

      setSnackbar({ open: true, message: `Importando ${codes.length} códigos...`, severity: 'info' });

      for (const raw of codes) {
        if (raw.toUpperCase().startsWith('P-')) {
          await handlePalletScan(raw, true);
        } else {
          const { numero, bultoNumero } = parseScanCode(raw);
          await processScan(numero, bultoNumero, true);
        }
      }

      setSnackbar({ open: true, message: `Importación completada: ${codes.length} códigos procesados`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Error al leer el archivo Excel', severity: 'error' });
    }
  };

  const handleExportManifiesto = async (option) => {
    if (!id) return;
    setExportingManifiesto(true);
    const payload = { agenciaID: user?.agenciaId ?? 0, contenedorID: Number(id) };
    const filename = `Manifiesto_${form.contenedorEnvio || id}.${option.ext}`;
    try {
      await downloadBlobPost(option.endpoint, payload, filename);
    } catch {
      setSnackbar({ open: true, message: 'Error al exportar el manifiesto', severity: 'error' });
    } finally {
      setExportingManifiesto(false);
    }
  };


  const handleSave = async () => {
    if (!form.contenedorEnvio.trim()) {
      setSnackbar({ open: true, message: 'El campo Envío es requerido', severity: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const dto = {
        contenedorEnvio: form.contenedorEnvio,
        dispatchDate: form.fecha || new Date().toISOString(),
        contenedorNumber: form.contenedorNumber,
        contenedorSello: form.contenedorSello,
        contenedorMasterBL: form.contenedorMasterBL,
        contenedorBuque: form.contenedorBuque,
        contenedorViaje: form.contenedorViaje,
        contenedorManifiestoNumero: form.contenedorManifiestoNumero,
        portLoading: form.portLoading,
        portDischarge: form.portDischarge,
        contenedorTipo: form.contenedorTipo,
        isActive: true,
        agenciaID: user?.agenciaId || 0,
        createdBy: user?.username || '',
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: new Date().toISOString(),
      };

      let contenedorId = id ? Number(id) : null;
      if (editMode && contenedorId) {
        await apiClient.put(`${endpoint}?id=${contenedorId}`, dto);
      } else {
        const res = await apiClient.post(endpoint, dto);
        contenedorId = typeof res.data === 'number' ? res.data : (res.data?.data ?? res.data?.id);
      }

      // Assign only new HBLs
      const newHbls = scannedList.filter(h => h.isNew);
      if (newHbls.length > 0 && contenedorId) {
        // Deduplicate by hblid (multiple bultos share the same HBLID)
        const uniqueIds = [...new Set(newHbls.map(h => h.hblid))];
        await apiClient.post(assignFn(contenedorId), {
          hblIds: uniqueIds,
          envio: form.contenedorEnvio,
          lastUpdatedBy: user?.username || '',
        });
      }

      setSnackbar({ open: true, message: editMode ? 'Contenedor actualizado' : 'Contenedor creado', severity: 'success' });
      setTimeout(() => navigate(
        editMode
          ? `/hbl/${hblType}/contenedor`
          : `/hbl/${hblType}/contenedor/edit/${contenedorId}`
      ), 1000);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleMoveSelected = async () => {
    if (!moveEnvio.trim() || selectedRows.ids.size === 0) return;
    setMoving(true);
    try {
      const res = await apiClient.get(endpoint);
      const contenedores = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const target = contenedores.find(c =>
        (c.contenedorEnvio || '').toLowerCase() === moveEnvio.trim().toLowerCase()
      );
      if (!target) {
        setSnackbar({ open: true, message: `No se encontró contenedor con Envío: ${moveEnvio.trim()}`, severity: 'error' });
        return;
      }
      const targetId = target.contenedorID ?? target.ContenedorID ?? target.id;

      const selectedHblData = getSelectedHblData();
      const uniqueHblIds = [...new Set(selectedHblData.map(r => r.hblid).filter(Boolean))];
      const selectedRowIds = new Set(selectedHblData.map(r => `${r.hblid ?? r.numero}-${r.bultoNumero ?? 1}`));

      await apiClient.post(assignFn(targetId), {
        hblIds: uniqueHblIds,
        envio: moveEnvio.trim(),
        lastUpdatedBy: user?.username || '',
      });

      setScannedList(list => list.filter(row => {
        const rowId = `${row.hblid ?? row.numero}-${row.bultoNumero ?? 1}`;
        return !selectedRowIds.has(rowId);
      }));
      setSelectedRows({ type: 'include', ids: new Set() });
      setMoveModalOpen(false);
      setMoveEnvio('');
      setSnackbar({ open: true, message: `${uniqueHblIds.length} HBL(s) movidos al contenedor ${moveEnvio.trim()}`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al mover HBLs', severity: 'error' });
    } finally {
      setMoving(false);
    }
  };

  const handleRemoveFromContainer = async () => {
    if (selectionCount === 0 || !id) return;
    setRemoving(true);
    try {
      const lbl = cfg.title.toLowerCase();
      const match = tiposEnvio.find(te => (te.tipoEnvioName || '').toLowerCase().includes(lbl));
      const defaultEnvio = match?.envioActual ?? tiposEnvio[0]?.envioActual ?? '';

      const selectedHblData = getSelectedHblData();
      const uniqueHblIds = [...new Set(selectedHblData.map(r => r.hblid).filter(Boolean))];
      const selectedRowIds = new Set(selectedHblData.map(r => `${r.hblid ?? r.numero}-${r.bultoNumero ?? 1}`));

      await apiClient.post(removeFn(id), {
        hblIds: uniqueHblIds,
        envio: defaultEnvio,
        lastUpdatedBy: user?.username || '',
      });

      setScannedList(list => list.filter(row => {
        const rowId = `${row.hblid ?? row.numero}-${row.bultoNumero ?? 1}`;
        return !selectedRowIds.has(rowId);
      }));
      setSelectedRows({ type: 'include', ids: new Set() });
      setRemoveConfirmOpen(false);
      setSnackbar({ open: true, message: `${uniqueHblIds.length} HBL(s) retirados del contenedor`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setRemoving(false);
    }
  };

  const scannedColumns = [
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Quitar">
          <IconButton size="small" color="error"
            onClick={() => handleRemoveScanned(row.hblid, row.bultoNumero)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    { field: 'numero',           headerName: 'Numero',   width: 130 },
    { field: 'bultoNumero',      headerName: 'Bulto',    width: 70 },
    { field: 'totalBultos',      headerName: 'Total B.', width: 80 },
    { field: 'remitenteName',    headerName: 'Envia',    flex: 1, minWidth: 130 },
    { field: 'destinatarioName', headerName: 'Recibe',   flex: 1, minWidth: 130 },
    { field: 'producto',         headerName: 'Producto', flex: 1, minWidth: 130 },
    { field: 'peso',             headerName: 'Peso',     width: 80, valueFormatter: v => Number(v).toFixed(2) },
    { field: 'cantidad',         headerName: 'Cantidad', width: 90 },
  ];

  const erroresColumns = [
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {row.errorType === 'other_container' && (
            <Tooltip title="Mover a este contenedor">
              <IconButton size="small" color="primary" onClick={() => handleMoveToContainer(row)}>
                <MoveUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Ignorar">
            <IconButton size="small" color="default" onClick={() => handleDismissError(row.id)}>
              <BlockIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    { field: 'numero',      headerName: 'Numero',  width: 160 },
    { field: 'bultoNumero', headerName: 'Bulto',   width: 70 },
    { field: 'reason',      headerName: 'Razón',   flex: 1 },
  ];

  if (loadingEdit) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box>
      <PageTitle
        title={`${editMode ? 'Editar' : 'Crear'} Despacho ${cfg.title}`}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: cfg.title },
          { label: 'Despachar', href: `/hbl/${hblType}/contenedor` },
          { label: editMode ? 'Editar' : 'Nuevo' },
        ]}
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {editMode && id && (
              <>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<PrintIcon />}
                  size="small"
                  onClick={() => setPrintOpen(true)}
                >
                  Imprimir PDF
                </Button>
                {manifiestoOptions.length === 1 && (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={exportingManifiesto ? <CircularProgress size={16} /> : <TableViewIcon />}
                    size="small"
                    disabled={exportingManifiesto}
                    onClick={() => handleExportManifiesto(manifiestoOptions[0])}
                  >
                    Manifiesto
                  </Button>
                )}
                {manifiestoOptions.length > 1 && (
                  <>
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={exportingManifiesto ? <CircularProgress size={16} /> : <TableViewIcon />}
                      size="small"
                      disabled={exportingManifiesto}
                      onClick={(e) => setManifiestoMenuAnchor(e.currentTarget)}
                    >
                      Manifiesto
                    </Button>
                    <Menu
                      anchorEl={manifiestoMenuAnchor}
                      open={Boolean(manifiestoMenuAnchor)}
                      onClose={() => setManifiestoMenuAnchor(null)}
                    >
                      {manifiestoOptions.map((opt) => (
                        <MuiMenuItem key={opt.ext} onClick={() => { setManifiestoMenuAnchor(null); handleExportManifiesto(opt); }}>
                          {opt.label}
                        </MuiMenuItem>
                      ))}
                    </Menu>
                  </>
                )}
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<LocalShippingIcon />}
                  size="small"
                  onClick={() => setTrackingOpen(true)}
                >
                  Tracking
                </Button>
              </>
            )}
            {editMode && (
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            )}
            <Button variant="outlined" startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/hbl/${hblType}/contenedor`)}>
              Regresar
            </Button>
          </Box>
        }
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Row 1: Envio + Crear Envio, Fecha, Bultos Total, Peso Total, Volumen Total */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth size="small" label="Envío"
              name="contenedorEnvio" value={form.contenedorEnvio}
              onChange={handleField}
              inputProps={{ readOnly: editMode }}
              sx={editMode ? { '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } } : undefined}
            />
          </Grid>
          {!editMode && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button variant="contained" color="success"
                startIcon={creatingEnvio ? <CircularProgress size={16} color="inherit" /> : <AddCircleIcon />}
                onClick={handleCrearEnvio} fullWidth
                disabled={creatingEnvio || !form.contenedorEnvio.trim()}>
                Crear Envio
              </Button>
            </Grid>
          )}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField fullWidth size="small" label="Fecha" type="date" name="fecha"
              value={form.fecha}
              inputProps={{ readOnly: true }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField fullWidth size="small" label="HBLs" value={totales.hbls}
              inputProps={{ readOnly: true }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField fullWidth size="small" label="Bultos Total" value={totales.bultos}
              inputProps={{ readOnly: true }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField fullWidth size="small" label="Peso Total" value={totales.peso.toFixed(2)}
              inputProps={{ readOnly: true }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField fullWidth size="small" label="Volumen Total" value={totales.volumen.toFixed(2)}
              inputProps={{ readOnly: true }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } }} />
          </Grid>
        </Grid>

        {/* Row 2: Scan input, Import Excel, Numero Contenedor, Sello, Master BL */}
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth size="small" label="Escanear HBL" placeholder="Número de HBL..."
              value={scanInput} inputRef={scanInputRef}
              disabled={scanBlocked}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton size="small" onClick={handleScan} disabled={scanning || !scanInput.trim() || scanBlocked}>
                      {scanning ? <CircularProgress size={18} /> : <QrCodeScannerIcon fontSize="small" />}
                    </IconButton>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleExcelFile}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              fullWidth
              onClick={() => fileInputRef.current?.click()}
            >
              Import Excel
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField fullWidth size="small" label={cfg.numContenedorLabel}
              name="contenedorNumber" value={form.contenedorNumber} onChange={handleField} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField fullWidth size="small" label={cfg.selloLabel}
              name="contenedorSello" value={form.contenedorSello} onChange={handleField} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField fullWidth size="small" label={cfg.masterBLLabel}
              name="contenedorMasterBL" value={form.contenedorMasterBL} onChange={handleField} />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs: HBLs Escaneados | Errores */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`HBLs Escaneados (${scannedList.length})`} />
          <Tab label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {errores.length > 0 && <Chip label={errores.length} color="error" size="small" />}
              Errores
            </Box>
          } />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 1 }}>
            <Box sx={{ mb: 1 }}>
              <TextField
                size="small"
                placeholder="Buscar por número HBL..."
                value={searchNumero}
                onChange={e => setSearchNumero(e.target.value)}
                sx={{ width: 260 }}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />,
                  },
                }}
              />
            </Box>
            {selectionCount > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedRows({ type: 'include', ids: new Set() })}
                >
                  Quitar Selección ({selectionCount})
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<MoveUpIcon />}
                  onClick={() => setMoveModalOpen(true)}
                >
                  Mover Seleccionados a otro Contenedor
                </Button>
                {editMode && id && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<BlockIcon />}
                    onClick={() => setRemoveConfirmOpen(true)}
                  >
                    Retirar del Contenedor ({selectionCount})
                  </Button>
                )}
              </Box>
            )}
            <Box sx={{ height: 380 }}>
              <DataGrid
                rows={filteredScanned}
                columns={scannedColumns}
                getRowId={(row) => `${row.hblid ?? row.numero}-${row.bultoNumero ?? 1}`}
                pageSizeOptions={[25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
                checkboxSelection
                disableRowSelectionOnClick
                keepNonExistentRowsSelected
                rowSelectionModel={selectedRows}
                onRowSelectionModelChange={(newSelection) => setSelectedRows(newSelection)}
                sx={dataGridStyles}
              />
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ height: 380, p: 1 }}>
            <DataGrid
              rows={errores}
              columns={erroresColumns}
              getRowId={(row) => row.id}
              pageSizeOptions={[25, 50]}
              disableRowSelectionOnClick
              sx={dataGridStyles}
            />
          </Box>
        )}
      </Paper>


      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <TrackingModal
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        hblType={hblType}
        contenedorId={id ? Number(id) : null}
        contenedorLabel={`${form.contenedorEnvio} — ${form.contenedorNumber || id}`}
        username={user?.username}
      />
      <ContenedorPrintModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        hblType={hblType}
        contenedorId={id ? Number(id) : null}
        title={`Imprimir — ${form.contenedorEnvio} ${form.contenedorNumber || ''}`}
      />

      <Dialog open={removeConfirmOpen} onClose={() => { if (!removing) setRemoveConfirmOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>Retirar del Contenedor</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Retirar {selectedRows.ids.size} bulto(s) seleccionado(s) del contenedor? Los HBLs volverán a estado Facturado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirmOpen(false)} disabled={removing}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveFromContainer}
            disabled={removing}
            startIcon={removing ? <CircularProgress size={16} color="inherit" /> : <BlockIcon />}
          >
            {removing ? 'Retirando...' : 'Retirar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveModalOpen} onClose={() => { if (!moving) { setMoveModalOpen(false); setMoveEnvio(''); } }} maxWidth="sm" fullWidth>
        <DialogTitle>Mover Seleccionados a otro Contenedor</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Contenedor Envio"
            value={moveEnvio}
            onChange={e => setMoveEnvio(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && moveEnvio.trim()) handleMoveSelected(); }}
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setMoveModalOpen(false); setMoveEnvio(''); }} disabled={moving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleMoveSelected}
            disabled={moving || !moveEnvio.trim()}
            startIcon={moving ? <CircularProgress size={16} color="inherit" /> : <MoveUpIcon />}
          >
            {moving ? 'Moviendo...' : 'Mover'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={scanBlocked} maxWidth="xs" fullWidth disableEscapeKeyDown>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
          Error de Escaneo
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            <strong>{scanBlockedError?.numero}</strong>
            {scanBlockedError?.bultoNumero > 0 ? ` — Bulto ${scanBlockedError.bultoNumero}` : ''}
          </Typography>
          <Typography color="error.main">{scanBlockedError?.reason}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Resuelva el error antes de continuar escaneando.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setScanBlockedError(null);
              setTimeout(() => scanInputRef.current?.focus(), 100);
            }}
          >
            Continuar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
