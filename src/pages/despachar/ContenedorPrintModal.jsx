import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, CircularProgress, Typography, Alert,
} from '@mui/material';
import { fetchPdfBlobUrl } from '../../utils/pdfUtils';
import { CONTENEDOR_PDF_MAP } from '../../api/endpoints';
import { useTenant } from '../../contexts/TenantContext';

const DOC_LABELS = {
  cartatransporte: 'Carta de Transporte',
  packinglist:     'Packing List',
};

/**
 * ContenedorPrintModal — PDF viewer modal for contenedor documents.
 *
 * Props:
 *  open         {boolean}
 *  onClose      {function}
 *  hblType      {string}  'aereo' | 'transcargo' | 'palco'
 *  contenedorId {number}
 *  title        {string}  display label
 */
export default function ContenedorPrintModal({ open, onClose, hblType, contenedorId, title }) {
  const { tenantConfig } = useTenant();
  const pdfFn = CONTENEDOR_PDF_MAP[hblType];

  const availableDocs = tenantConfig?.contenedorDocuments?.[hblType] ?? [];

  const [activeDoc, setActiveDoc] = useState(null);
  const [blobUrl, setBlobUrl]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const blobRef = useRef(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setActiveDoc(null);
      setBlobUrl(null);
      setError(null);
      if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
    }
  }, [open]);

  const handleSelectDoc = async (doc) => {
    if (activeDoc === doc) return; // already selected
    setActiveDoc(doc);
    setError(null);
    setBlobUrl(null);
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }

    if (!pdfFn || !contenedorId) return;

    setLoading(true);
    try {
      const url = await fetchPdfBlobUrl(pdfFn(contenedorId, doc));
      blobRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al cargar el PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <span>{title || 'Imprimir'}</span>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {availableDocs.map(doc => (
              <Button
                key={doc}
                size="small"
                variant={activeDoc === doc ? 'contained' : 'outlined'}
                onClick={() => handleSelectDoc(doc)}
                disabled={loading}
              >
                {DOC_LABELS[doc] || doc}
              </Button>
            ))}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '76vh', display: 'flex', flexDirection: 'column' }}>
        {availableDocs.length === 0 && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">
              No hay documentos PDF configurados para este tipo de envío.
            </Typography>
          </Box>
        )}
        {availableDocs.length > 0 && !activeDoc && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">
              Seleccione un tipo de documento para previsualizar
            </Typography>
          </Box>
        )}
        {activeDoc && loading && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}
        {activeDoc && error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        {activeDoc && !loading && blobUrl && (
          <iframe
            src={blobUrl}
            title={DOC_LABELS[activeDoc] || activeDoc}
            style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
