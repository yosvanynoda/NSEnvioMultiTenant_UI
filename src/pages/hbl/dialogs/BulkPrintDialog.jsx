import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Typography, Box,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import apiClient from '../../../api/apiClient';
import { HBL_BULK_PRINT_MAP } from '../../../api/endpoints';

const DOC_LABELS = {
  label:       'Label',
  factura:     'Factura',
  guiaaerea:   'Guía Aérea',
  boleta:      'Boleta',
  resumen:     'Resumen x Cajas',
  iniciales:   'Iniciales',
  numerocajas: 'Número Cajas',
};

export default function BulkPrintDialog({ open, onClose, hblType, availableDocs = ['label', 'factura'], selectedIds = [] }) {
  const [docType, setDocType] = useState(availableDocs[0] || 'label');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handlePrint = async () => {
    setLoading(true);
    setError(null);
    const win = window.open('', '_blank');
    try {
      const endpoint = HBL_BULK_PRINT_MAP[hblType];
      const res = await apiClient.post(endpoint, { ids: selectedIds, docType }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      onClose();
    } catch (err) {
      if (win) win.close();
      setError(err?.response?.data?.message || err?.message || 'Error al generar el PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Imprimir {selectedIds.length} HBL(s)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Seleccione el tipo de documento a imprimir. Se generará un solo PDF con todos los HBLs seleccionados.
        </Typography>
        <ToggleButtonGroup
          value={docType}
          exclusive
          onChange={(_, v) => { if (v) setDocType(v); }}
          orientation="vertical"
          fullWidth
        >
          {availableDocs.map(d => (
            <ToggleButton key={d} value={d} sx={{ justifyContent: 'flex-start' }}>
              {DOC_LABELS[d] || d}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
          onClick={handlePrint}
          disabled={loading}
        >
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
