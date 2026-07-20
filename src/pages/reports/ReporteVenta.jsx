import React, { useRef, useState } from 'react';
import {
  Box, Paper, Grid, TextField, Button, Divider, MenuItem, Typography,
  CircularProgress, Alert,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FilterListIcon from '@mui/icons-material/FilterList';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { fetchPdfBlobUrl } from '../../utils/pdfUtils';

export default function ReporteVenta() {
  const [filters, setFilters] = useState({
    fechaInicial: dayjs().startOf('month').format('YYYY-MM-DD'),
    fechaFinal:   dayjs().format('YYYY-MM-DD'),
    createdBy:    '',
    agenciaId:    '',
  });
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const blobUrlRef = useRef(null);

  const { data: agencias = [] } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
      return res.data?.data || res.data || [];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuario'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.USER);
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return list.filter(u => u.isActive !== false);
    },
  });

  const handleFilterChange = (field) => (e) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setPdfBlobUrl(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const params = { fechaInicial: filters.fechaInicial, fechaFinal: filters.fechaFinal };
    if (filters.createdBy) params.createdBy = filters.createdBy;
    if (filters.agenciaId) params.agenciaId = filters.agenciaId;

    try {
      const url = await fetchPdfBlobUrl(ENDPOINTS.SALES_REPORT, params);
      blobUrlRef.current = url;
      setPdfBlobUrl(url);
    } catch (err) {
      setError(err?.message || 'Error al generar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <PageTitle
        title="Reporte de Venta"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Reporte de Venta' }]}
      />

      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>

        {/* ── Filters panel (always visible) ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterListIcon color="primary" />
              <Typography variant="h6" color="primary">Filtros</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Fecha Inicial"
                  type="date"
                  value={filters.fechaInicial}
                  onChange={handleFilterChange('fechaInicial')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Fecha Final"
                  type="date"
                  value={filters.fechaFinal}
                  onChange={handleFilterChange('fechaFinal')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Creado por (opcional)"
                  value={filters.createdBy}
                  onChange={handleFilterChange('createdBy')}
                  fullWidth
                  select
                >
                  <MenuItem value=""><em>Todos los usuarios</em></MenuItem>
                  {usuarios.map(u => (
                    <MenuItem key={u.userName} value={u.userName}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.userName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Agencia (opcional)"
                  value={filters.agenciaId}
                  onChange={handleFilterChange('agenciaId')}
                  fullWidth
                  select
                >
                  <MenuItem value=""><em>Todas las agencias</em></MenuItem>
                  {agencias.map(a => (
                    <MenuItem key={a.agenciaID} value={a.agenciaID}>{a.agenciaName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
                onClick={handleGenerate}
                disabled={loading}
                fullWidth
                size="large"
                color="error"
              >
                {loading ? 'Generando...' : 'Generar PDF'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* ── PDF viewer (embedded, always visible) ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            {error ? (
              <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : loading ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <CircularProgress />
              </Box>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title="Reporte de Venta"
                style={{ flex: 1, border: 'none', width: '100%', minHeight: '80vh' }}
              />
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: 'text.secondary', gap: 2 }}>
                <PictureAsPdfIcon sx={{ fontSize: 64, opacity: 0.2 }} />
                <Typography variant="body1">
                  Configure los filtros y haga clic en <strong>Generar PDF</strong>
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}
