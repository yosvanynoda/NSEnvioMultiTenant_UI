import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ENDPOINTS } from '../../api/endpoints';
import { fetchPdfBlobUrl } from '../../utils/pdfUtils';

export default function ServiceInvoicePrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setPdfBlobUrl(null);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    fetchPdfBlobUrl(ENDPOINTS.GENERAL_INVOICE_PDF(id))
      .then((url) => {
        if (cancelled) { URL.revokeObjectURL(url); return; }
        blobUrlRef.current = url;
        setPdfBlobUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error al generar el PDF');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ flex: 1, fontWeight: 700, fontSize: '1.1rem' }}>
          Factura de Servicio
        </Box>
        <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/serviceinvoice')}>
          Regresar
        </Button>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#666', minHeight: '80vh' }}>
        {loading ? (
          <CircularProgress sx={{ color: 'white' }} />
        ) : error ? (
          <Box sx={{ bgcolor: 'white', p: 4, borderRadius: 1, maxWidth: 500 }}>
            <Alert severity="error">
              Error al generar el PDF.<br />
              <small>{error}</small>
            </Alert>
          </Box>
        ) : (
          <iframe
            src={pdfBlobUrl}
            title="Factura de Servicio"
            style={{ width: '100%', height: '100%', minHeight: '80vh', border: 'none' }}
          />
        )}
      </Box>
    </Box>
  );
}
