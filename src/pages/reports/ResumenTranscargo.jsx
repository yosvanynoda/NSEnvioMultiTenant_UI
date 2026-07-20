import React, { useRef, useState } from 'react';
import {
  Box, Paper, Grid, TextField, Button, CircularProgress, Typography, Divider, MenuItem, Alert,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FilterListIcon from '@mui/icons-material/FilterList';
import dayjs from 'dayjs';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { useQuery } from '@tanstack/react-query';

export default function ResumenTranscargo() {
  const [filters, setFilters] = useState({
    fechaDesde:   dayjs().startOf('month').format('YYYY-MM-DD'),
    fechaHasta:   dayjs().format('YYYY-MM-DD'),
    contenedorId: '',
  });
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const blobUrlRef = useRef(null);

  const { data: contenedores = [] } = useQuery({
    queryKey: ['transcargoContenedor'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TRANSCARGO_CONTENEDOR);
      return res.data?.data || res.data || [];
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

    const params = { fechaDesde: filters.fechaDesde, fechaHasta: filters.fechaHasta };
    if (filters.contenedorId) params.contenedorId = filters.contenedorId;

    try {
      const res = await apiClient.get(`${ENDPOINTS.EXCEL_WORK}/resumentranscargo`, {
        params,
        responseType: 'blob',
      });
      const contentType = res.headers['content-type'] || 'application/pdf';
      const url = URL.createObjectURL(new Blob([res.data], { type: contentType }));
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
        title="Transcargo - Resumen por Envío"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Resumen Transcargo' }]}
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
                  label="Fecha Desde"
                  type="date"
                  value={filters.fechaDesde}
                  onChange={handleFilterChange('fechaDesde')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Fecha Hasta"
                  type="date"
                  value={filters.fechaHasta}
                  onChange={handleFilterChange('fechaHasta')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Contenedor (opcional)"
                  value={filters.contenedorId}
                  onChange={handleFilterChange('contenedorId')}
                  fullWidth
                  select
                >
                  <MenuItem value=""><em>Todos los contenedores</em></MenuItem>
                  {Array.isArray(contenedores) && contenedores.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.numero || c.nombre || `Contenedor #${c.id}`}
                    </MenuItem>
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
                color="primary"
              >
                {loading ? 'Generando...' : 'Generar Reporte'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* ── Embedded viewer ── */}
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
                title="Resumen Transcargo"
                style={{ flex: 1, border: 'none', width: '100%', minHeight: '80vh' }}
              />
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: 'text.secondary', gap: 2 }}>
                <PictureAsPdfIcon sx={{ fontSize: 64, opacity: 0.2 }} />
                <Typography variant="body1">
                  Configure los filtros y haga clic en <strong>Generar Reporte</strong>
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}
