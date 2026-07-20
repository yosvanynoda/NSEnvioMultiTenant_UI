import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Typography, Snackbar, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import PreviewIcon from '@mui/icons-material/Preview';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS, CONTENEDOR_ENDPOINT_MAP } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { useAuth } from '../../contexts/AuthContext';

const HBL_TYPE_LABELS = {
  aereo: 'Aéreo',
  transcargo: 'Transcargo',
  palco: 'Palco',
  cubapack: 'CubaPack',
  cubapost: 'CubaPost',
  transcargoaereo: 'Transcargo Aéreo',
};

export default function SucursalInvoiceCreate({ hblType }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const parentSucursalID = user?.sucursalId;
  const label = HBL_TYPE_LABELS[hblType] ?? hblType;

  const [childSucursalID, setChildSucursalID] = useState('');
  const [formulaID, setFormulaID] = useState('');
  const [contenedorID, setContenedorID] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateInvoice, setDuplicateInvoice] = useState(null); // { id, number }
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursalDescendants', parentSucursalID],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL_DESCENDANTS(parentSucursalID));
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!parentSucursalID,
  });

  // Load formulas for the selected child sucursal
  const { data: formulas = [] } = useQuery({
    queryKey: ['agenciaInvoiceFormula', parentSucursalID, childSucursalID],
    queryFn: async () => {
      const res = await apiClient.get(
        `${ENDPOINTS.AGENCIA_INVOICE_FORMULA}?parentSucursalId=${parentSucursalID}`
      );
      const all = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return all.filter((f) => f.childSucursalID === Number(childSucursalID) && f.isActive);
    },
    enabled: !!parentSucursalID && !!childSucursalID,
  });

  const selectedFormula = formulas.find((f) => f.formulaID === Number(formulaID));

  const contenedorEndpoint = CONTENEDOR_ENDPOINT_MAP[hblType];
  const { data: contenedores = [] } = useQuery({
    queryKey: ['contenedor', hblType],
    queryFn: async () => {
      const res = await apiClient.get(contenedorEndpoint);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!contenedorEndpoint,
  });

  const selectedContenedor = contenedores.find((c) => c.contenedorID === Number(contenedorID));

  const buildPayload = () => ({
    hblType,
    parentSucursalID: Number(parentSucursalID),
    childSucursalID: Number(childSucursalID),
    contenedorID: Number(contenedorID),
    contenedorEnvio: selectedContenedor?.contenedorEnvio ?? '',
    tipoEnvioID: selectedFormula?.tipoEnvioID ?? 0,
    fecha: new Date().toISOString(),
    createdBy: user.username,
  });

  const canPreview = childSucursalID && formulaID && contenedorID && selectedContenedor && selectedFormula;

  const handlePreview = useCallback(async () => {
    if (!canPreview) return;
    setLoadingPreview(true);
    setError('');
    setPreview(null);
    try {
      const res = await apiClient.post(`${ENDPOINTS.SUCURSAL_INVOICE}/preview`, buildPayload());
      setPreview(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childSucursalID, formulaID, contenedorID, selectedContenedor, selectedFormula]);

  const handleSave = async () => {
    if (!preview || !canPreview) return;
    setSaving(true);
    setError('');
    setDuplicateInvoice(null);
    try {
      await apiClient.post(ENDPOINTS.SUCURSAL_INVOICE, buildPayload());
      setSnackbar({ open: true, message: 'Factura creada exitosamente', severity: 'success' });
      setTimeout(() => navigate(`/hbl/${hblType}/sucursal-invoice`), 1200);
    } catch (err) {
      const msg = err.message ?? '';
      if (msg.startsWith('DUPLICATE:')) {
        const [, id, number] = msg.split(':');
        setDuplicateInvoice({ id: Number(id), number });
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const lineColumns = [
    { field: 'hblNumero', headerName: 'HBL', width: 150 },
    { field: 'remitenteName', headerName: 'Remitente', flex: 1, minWidth: 120 },
    { field: 'destinatarioName', headerName: 'Destinatario', flex: 1, minWidth: 120 },
    { field: 'region', headerName: 'Región', width: 120 },
    { field: 'bultoDescription', headerName: 'Bulto', flex: 1, minWidth: 100 },
    {
      field: 'priceMethod', headerName: 'Método', width: 100,
      renderCell: (p) => (
        <Chip
          label={p.value === 'weight' ? 'Peso' : 'Cant.'}
          size="small"
          variant="outlined"
          color={p.value === 'weight' ? 'primary' : 'secondary'}
        />
      ),
    },
    {
      field: 'pricePerUnit', headerName: '$/Unidad', width: 90,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'peso', headerName: 'Peso', width: 80,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `${Number(v).toFixed(2)} lb` : '—',
    },
    {
      field: 'cantidad', headerName: 'Cant.', width: 70,
      align: 'right', headerAlign: 'right',
    },
    {
      field: 'baseAmount', headerName: 'Base', width: 90,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'locationAmount', headerName: 'Región', width: 90,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'totalLine', headerName: 'Total', width: 100,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
  ];

  const resetSelections = () => { setFormulaID(''); setContenedorID(''); setPreview(null); };

  return (
    <Box>
      <PageTitle
        title={`Nueva Factura — ${label}`}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: label },
          { label: 'Facturas Agencia', href: `/hbl/${hblType}/sucursal-invoice` },
          { label: 'Nueva' },
        ]}
        action={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/hbl/${hblType}/sucursal-invoice`)}>
            Volver
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <FormControl sx={{ minWidth: 220 }} required>
              <InputLabel>Franquicia Hija</InputLabel>
              <Select
                value={childSucursalID}
                label="Franquicia Hija"
                onChange={(e) => { setChildSucursalID(e.target.value); resetSelections(); }}
              >
                {sucursales.map((s) => (
                  <MenuItem key={s.sucursalID} value={s.sucursalID}>{s.sucursalName}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 220 }} required disabled={!childSucursalID}>
              <InputLabel>Fórmula</InputLabel>
              <Select
                value={formulaID}
                label="Fórmula"
                onChange={(e) => { setFormulaID(e.target.value); setContenedorID(''); setPreview(null); }}
              >
                {formulas.length === 0
                  ? <MenuItem disabled value="">Sin fórmulas activas</MenuItem>
                  : formulas.map((f) => (
                    <MenuItem key={f.formulaID} value={f.formulaID}>
                      {f.tipoEnvioName} — {f.pesoLimite
                        ? `Tramo: ${f.pesoOperador || '<'}${f.pesoLimite}lb $${Number(f.precioSiMenor).toFixed(2)} / >${f.pesoLimite}lb $${Number(f.precioSiMayor).toFixed(2)}`
                        : (f.defaultPriceMethod === 'weight' ? `$${f.defaultPricePerUnit}/lb` : `$${f.defaultPricePerUnit}/u`)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 220 }} required disabled={!formulaID}>
              <InputLabel>Contenedor</InputLabel>
              <Select
                value={contenedorID}
                label="Contenedor"
                onChange={(e) => { setContenedorID(e.target.value); setPreview(null); }}
              >
                {contenedores.map((c) => (
                  <MenuItem key={c.contenedorID} value={c.contenedorID}>
                    {c.contenedorEnvio ?? c.contenedorID}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={loadingPreview ? <CircularProgress size={16} /> : <PreviewIcon />}
              onClick={handlePreview}
              disabled={!canPreview || loadingPreview}
            >
              Vista Previa
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {duplicateInvoice && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="warning"
              size="small"
              variant="outlined"
              onClick={() => navigate(`/hbl/${hblType}/sucursal-invoice/${duplicateInvoice.id}`)}
            >
              Ver Factura
            </Button>
          }
        >
          Ya existe una factura para este contenedor y franquicia: <strong>{duplicateInvoice.number}</strong>
        </Alert>
      )}

      {preview && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">
              Detalle — {preview.lines?.length ?? 0} líneas
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="h6" color="primary">
                Total: ${Number(preview.totalAmount).toFixed(2)}
              </Typography>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                Guardar Factura
              </Button>
            </Box>
          </Box>
          <Box sx={dataGridContainerSx}>
            <DataGrid
              rows={preview.lines ?? []}
              columns={lineColumns}
              getRowId={(row) => `${row.hblid}-${row.bultoDescription}`}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
              disableRowSelectionOnClick
              sx={dataGridStyles}
            />
          </Box>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
