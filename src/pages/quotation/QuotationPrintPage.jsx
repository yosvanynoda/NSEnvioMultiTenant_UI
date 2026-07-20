import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Alert, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import { pdf } from '@react-pdf/renderer';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import QuotationPdfDocument from '../../components/reports/QuotationPdfDocument';

export default function QuotationPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef(null);
  const pdfBlobRef = useRef(null);

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

    (async () => {
      try {
        const qRes = await apiClient.get(`${ENDPOINTS.QUOTATION}/${id}`);
        const q = qRes.data?.data || qRes.data;
        if (cancelled) return;
        setQuotation(q);

        let a = null;
        if (q?.agenciaID) {
          try {
            const aRes = await apiClient.get(`${ENDPOINTS.AGENCIA}/${q.agenciaID}`);
            a = aRes.data?.data || aRes.data;
          } catch { /* letterhead is a convenience, not required */ }
        }
        if (cancelled) return;

        const blob = await pdf(<QuotationPdfDocument quotation={q} agencia={a} />).toBlob();
        if (cancelled) return;
        pdfBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setPdfBlobUrl(url);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Error al generar el PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  const handleDownload = () => {
    if (!pdfBlobRef.current) return;
    const url = URL.createObjectURL(pdfBlobRef.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cotizacion-${quotation?.quotationNumber || id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmail = () => {
    const subject = `Cotización ${quotation?.quotationNumber || ''}`;
    const body = [
      `Estimado ${quotation?.contactName || ''},`,
      '',
      'Adjunto encontrará la cotización solicitada.',
      '',
      '(Descargue el PDF con el botón "Descargar PDF" y adjúntelo manualmente a este correo antes de enviarlo -- los enlaces mailto: no permiten adjuntar archivos automáticamente.)',
    ].join('\n');
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, fontWeight: 700, fontSize: '1.1rem' }}>
          Cotización {quotation?.quotationNumber ? `- ${quotation.quotationNumber}` : ''}
        </Box>
        <Tooltip title="Los enlaces de email no pueden adjuntar el PDF automáticamente -- descárguelo primero y adjúntelo manualmente">
          <span>
            <Button variant="outlined" size="small" startIcon={<EmailIcon />} onClick={handleEmail} disabled={loading || Boolean(error)}>
              Enviar por Email
            </Button>
          </span>
        </Tooltip>
        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={loading || Boolean(error)}>
          Descargar PDF
        </Button>
        <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/quotation')}>
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
            title="Cotización"
            style={{ width: '100%', height: '100%', minHeight: '80vh', border: 'none' }}
          />
        )}
      </Box>
    </Box>
  );
}
