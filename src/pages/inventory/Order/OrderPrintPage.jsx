import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import PdfViewer from '../../../components/common/PdfViewer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ENDPOINTS } from '../../../api/endpoints';
import { fetchPdfBlobUrl } from '../../../utils/pdfUtils';

export default function OrderPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    fetchPdfBlobUrl(ENDPOINTS.ORDER_PDF(id))
      .then((url) => {
        if (cancelled) { URL.revokeObjectURL(url); return; }
        blobUrlRef.current = url;
        setPdfBlobUrl(url);
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Error al generar el PDF'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ flex: 1, fontWeight: 700, fontSize: '1.1rem' }}>Venta</Box>
        <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory/order')}>
          Regresar
        </Button>
      </Box>
      <PdfViewer
        blobUrl={pdfBlobUrl}
        loading={loading}
        error={error}
        title="Venta PDF"
        wrapperSx={{ minHeight: '80vh' }}
      />
    </Box>
  );
}
