import React, { useState, useEffect } from 'react';
import {
  Box, Paper, TextField, Button, Alert, CircularProgress, Typography,
  Divider, MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { useCarrierOptions } from '../../hooks/useCarrierOptions';

export default function ResumenProductosEspeciales() {
  const carriers = useCarrierOptions();
  const [carrier, setCarrier] = useState('');
  const [envio, setEnvio] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (carriers.length === 1) setCarrier(carriers[0].value);
  }, [carriers]);

  const handleSearch = async () => {
    const trimmed = envio.trim();
    if (!trimmed || !carrier) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await apiClient.get(ENDPOINTS.RESUMEN_PRODUCTOS_ESPECIALES(trimmed, carrier));
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const trimmed = envio.trim();
    if (!trimmed || !carrier) return;
    setExporting(true);
    try {
      const res = await apiClient.get(ENDPOINTS.RESUMEN_PRODUCTOS_ESPECIALES_EXPORT(trimmed, carrier), {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ResumenEspeciales_${trimmed}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Archivo descargado correctamente', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al exportar', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };
  const fmt  = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtI = (n) => Number(n).toLocaleString('es-ES');

  return (
    <Box>
      <PageTitle
        title="Resumen Productos Especiales"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Resumen Prod. Especiales' }]}
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3, maxWidth: 560 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {carriers.length > 1 && (
            <TextField
              select label="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)}
              size="small" sx={{ minWidth: 160 }}
            >
              {carriers.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          )}
          <TextField
            label="Número de Envío" value={envio}
            onChange={e => setEnvio(e.target.value)} onKeyDown={handleKeyDown}
            size="small" placeholder="Ej: ENV-001" sx={{ flex: 1, minWidth: 160 }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !envio.trim() || !carrier}
          >
            {loading ? 'Buscando...' : 'Generar'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, maxWidth: 560 }}>{error}</Alert>}

      {data && (
        <Box sx={{ maxWidth: 700 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              variant="outlined" size="small"
              startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <FileDownloadIcon />}
              onClick={handleExport} disabled={exporting}
            >
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.800' }}>
                  <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Agencia</TableCell>
                  <TableCell align="right" sx={{ color: 'common.white', fontWeight: 'bold' }}>Total Bultos</TableCell>
                  <TableCell align="right" sx={{ color: 'common.white', fontWeight: 'bold' }}>Total Peso (lb)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Container total */}
                <TableRow sx={{ bgcolor: 'warning.light' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>TOTAL CONTENEDOR — Todos los productos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtI(data.totalbultoscontenedor)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(data.totalpesocontenedor)}</TableCell>
                </TableRow>

                {/* Special product rows */}
                {data.detalles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ fontStyle: 'italic', color: 'text.secondary', py: 2 }}>
                      No se encontraron productos especiales para este envío
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.detalles?.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{row.agenciagroup}</TableCell>
                        <TableCell align="right">{fmtI(row.totalbultos)}</TableCell>
                        <TableCell align="right">{fmt(row.totalpeso)}</TableCell>
                      </TableRow>
                    ))}

                    {/* Totals */}
                    {(() => {
                      const totalB = data.detalles?.reduce((s, r) => s + r.totalbultos, 0) ?? 0;
                      const totalP = data.detalles?.reduce((s, r) => s + r.totalpeso, 0) ?? 0;
                      const difB = data.totalbultoscontenedor - totalB;
                      const difP = data.totalpesocontenedor - totalP;
                      return (
                        <>
                          <TableRow sx={{ bgcolor: 'grey.200' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>TOTAL PRODUCTOS ESPECIALES</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtI(totalB)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(totalP)}</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: difB < 0 ? 'error.light' : 'success.light' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>DIFERENCIA (Contenedor − Especiales)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtI(difB)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(difP)}</TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Snackbar
        open={snackbar.open} autoHideDuration={4000}
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
