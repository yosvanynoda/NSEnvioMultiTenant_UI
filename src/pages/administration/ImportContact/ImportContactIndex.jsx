import React, { useRef, useState } from 'react';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress,
  Paper, Chip, Grid, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/Download';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import { useAuth } from '../../../contexts/AuthContext';
import PageTitle from '../../../components/common/PageTitle';

const TEMPLATE_HEADERS = [
  'RemitenteName','RemitenteLastName','RemitenteTelefono','RemitenteEmail',
  'DestinatarioName','DestinatarioLastName','DestinatarioSecondName','DestinatarioSecondLastName',
  'DestinatarioCI','DestinatarioCellphone',
  'Calle','HouseNumber','EntreCalles','EntreCallesSecond','AptoNumber','FloorNumber','Reparto',
  'MunicipioName','ProvinciaName',
];

function downloadTemplate() {
  const csv = TEMPLATE_HEADERS.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ImportContacts_Template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportContactIndex() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const agenciaId = user?.agenciaId ?? 0;

  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmClear, setConfirmClear] = useState(null); // null | 'processed' | 'all'
  const [clearing, setClearing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['importContacts', agenciaId],
    queryFn: async () => {
      const res = await apiClient.get(`${ENDPOINTS.IMPORT_CONTACT}/All/${agenciaId}`);
      const d = res.data?.data ?? res.data ?? [];
      return Array.isArray(d) ? d : [];
    },
    enabled: agenciaId > 0,
  });

  const filtered = statusFilter === 'all' ? contacts
    : statusFilter === 'pending' ? contacts.filter(c => !c.isProcessed)
    : contacts.filter(c => c.isProcessed);

  const totalCount     = contacts.length;
  const pendingCount   = contacts.filter(c => !c.isProcessed).length;
  const processedCount = contacts.filter(c => c.isProcessed).length;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(
        `${ENDPOINTS.IMPORT_CONTACT}/Import/${agenciaId}?createdBy=${encodeURIComponent(user?.username || '')}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const result = res.data?.data ?? res.data ?? {};
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['importContacts', agenciaId] });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al importar', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    if (!confirmClear) return;
    setClearing(true);
    try {
      const processedOnly = confirmClear === 'processed';
      await apiClient.delete(`${ENDPOINTS.IMPORT_CONTACT}/Clear/${agenciaId}?processedOnly=${processedOnly}`);
      qc.invalidateQueries({ queryKey: ['importContacts', agenciaId] });
      setSnackbar({ open: true, message: 'Datos eliminados', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al limpiar', severity: 'error' });
    } finally {
      setClearing(false);
      setConfirmClear(null);
    }
  };

  return (
    <Box>
      <PageTitle
        title="Importar Contactos"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Importar Contactos' }]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Importe remitentes y destinatarios desde Excel o CSV. Los registros se almacenan en una tabla de
        preparación y <strong>no se crean en el sistema hasta que el usuario los seleccione</strong> durante
        la creación de un envío. Descargue la plantilla para ver el formato esperado.
      </Alert>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total importados', value: totalCount,     color: 'text.primary'   },
          { label: 'Pendientes',       value: pendingCount,   color: 'warning.main'   },
          { label: 'Activados',        value: processedCount, color: 'success.main'   },
        ].map(({ label, value, color }) => (
          <Grid size={{ xs: 12, sm: 4 }} key={label}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Actions */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Acciones</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
          >
            Descargar plantilla CSV
          </Button>

          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Importando...' : 'Importar archivo'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <Divider orientation="vertical" flexItem />

          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteSweepIcon />}
            disabled={processedCount === 0}
            onClick={() => setConfirmClear('processed')}
          >
            Limpiar activados ({processedCount})
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            disabled={totalCount === 0}
            onClick={() => setConfirmClear('all')}
          >
            Limpiar todo ({totalCount})
          </Button>
        </Box>

        {uploading && <LinearProgress sx={{ mt: 2 }} />}

        {importResult && (
          <Alert
            severity={importResult.errors?.length > 0 ? 'warning' : 'success'}
            sx={{ mt: 2 }}
            onClose={() => setImportResult(null)}
          >
            <strong>{importResult.imported ?? 0} registros importados</strong>
            {importResult.skipped > 0 && `, ${importResult.skipped} omitidos (filas vacías)`}
            {importResult.errors?.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
              </Box>
            )}
          </Alert>
        )}
      </Paper>

      {/* Data table */}
      <Paper variant="outlined">
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Registros</Typography>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, v) => { if (v) setStatusFilter(v); }}
            size="small"
          >
            <ToggleButton value="all">Todos ({totalCount})</ToggleButton>
            <ToggleButton value="pending">Pendientes ({pendingCount})</ToggleButton>
            <ToggleButton value="processed">Activados ({processedCount})</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Remitente</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Destinatario</TableCell>
                  <TableCell>CI</TableCell>
                  <TableCell>Dirección</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      No hay registros
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(c => (
                  <TableRow key={c.importContactID} sx={{ opacity: c.isProcessed ? 0.55 : 1 }}>
                    <TableCell>{[c.remitenteName, c.remitenteLastName].filter(Boolean).join(' ')}</TableCell>
                    <TableCell>{c.remitenteTelefono}</TableCell>
                    <TableCell>{[c.destinatarioName, c.destinatarioLastName].filter(Boolean).join(' ')}</TableCell>
                    <TableCell>{c.destinatarioCI}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[c.calle, c.houseNumber, c.municipioName, c.provinciaName].filter(Boolean).join(', ')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.isProcessed ? 'Activado' : 'Pendiente'}
                        color={c.isProcessed ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Clear confirm dialog */}
      <Dialog open={Boolean(confirmClear)} onClose={() => setConfirmClear(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            {confirmClear === 'all'
              ? 'Se eliminarán TODOS los registros importados (pendientes y activados).'
              : 'Se eliminarán solo los registros ya activados.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(null)} disabled={clearing}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClear}
            disabled={clearing}
            startIcon={clearing ? <CircularProgress size={16} color="inherit" /> : <DeleteSweepIcon />}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

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
