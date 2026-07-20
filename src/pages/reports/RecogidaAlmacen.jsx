import React, { useState, useEffect } from 'react';
import {
  Box, Paper, TextField, Button, Alert, Snackbar, CircularProgress, Typography,
  Divider, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { useCarrierOptions } from '../../hooks/useCarrierOptions';

export default function RecogidaAlmacen() {
  const carriers = useCarrierOptions();
  const [carrier, setCarrier] = useState('');
  const [envio, setEnvio] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (carriers.length === 1) setCarrier(carriers[0].value);
  }, [carriers]);

  const handleDownload = async () => {
    const trimmed = envio.trim();
    if (!trimmed || !carrier) return;
    setLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.EXCEL_WORK_RECOGIDA_ALMACEN(trimmed, carrier), {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `RecogidaAlmacen_${trimmed}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Archivo descargado correctamente', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al generar el archivo', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleDownload(); };

  return (
    <Box>
      <PageTitle
        title="Recogida en Almacén"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Recogida en Almacén' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Exporta a Excel los HBLs con Recogida en Almacén para un envío.
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {carriers.length > 1 && (
            <TextField
              select
              label="Carrier"
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              size="small"
              fullWidth
            >
              {carriers.map(c => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Número de Envío"
            value={envio}
            onChange={e => setEnvio(e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            fullWidth
            placeholder="Ej: ENV-001"
          />

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
            onClick={handleDownload}
            disabled={loading || !envio.trim() || !carrier}
            fullWidth
          >
            {loading ? 'Generando...' : 'Descargar Excel'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
