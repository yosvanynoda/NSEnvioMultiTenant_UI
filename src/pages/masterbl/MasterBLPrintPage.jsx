import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import PdfViewer from '../../components/common/PdfViewer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ENDPOINTS } from '../../api/endpoints';
import { fetchPdfBlobUrl } from '../../utils/pdfUtils';

const PDF_ENDPOINT_MAP = {
  transcargo:     (id) => ENDPOINTS.TRANSCARGO_MASTER_BL_PDF(id),
  palco:          (id) => ENDPOINTS.PALCO_MASTER_BL_PDF(id),
  aereo:          (id) => ENDPOINTS.AEREO_MASTER_BL_PDF(id),
  transcargoaereo:(id) => ENDPOINTS.TRANSCARGO_AEREO_MASTER_BL_PDF(id),
  cubapack:       (id) => ENDPOINTS.CUBAPACK_MASTER_BL_PDF(id),
  cubapost:       (id) => ENDPOINTS.CUBAPOST_MASTER_BL_PDF(id),
};

const TITLE_MAP = {
  transcargo:      'Transcargo Master BL',
  palco:           'Palco Master BL',
  aereo:           'Aéreo Master BL',
  transcargoaereo: 'Transcargo Aéreo Master BL',
  cubapack:        'CubaPack Master BL',
  cubapost:        'CubaPost Master BL',
};

export default function MasterBLPrintPage() {
  const { hblType, id } = useParams();
  const navigate = useNavigate();
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (!id || !hblType) return;
    const endpointFn = PDF_ENDPOINT_MAP[hblType];
    if (!endpointFn) { setError('Tipo de Master BL no reconocido.'); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPdfBlobUrl(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    fetchPdfBlobUrl(endpointFn(id))
      .then((url) => {
        if (cancelled) { URL.revokeObjectURL(url); return; }
        blobUrlRef.current = url;
        setPdfBlobUrl(url);
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Error al generar el PDF'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, hblType]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ flex: 1, fontWeight: 700, fontSize: '1.1rem' }}>
          {TITLE_MAP[hblType] ?? 'Master BL'}
        </Box>
        <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(`/masterbl/${hblType}`)}>
          Regresar
        </Button>
      </Box>
      <PdfViewer
        blobUrl={pdfBlobUrl}
        loading={loading}
        error={error}
        title="Master BL PDF"
        wrapperSx={{ minHeight: '80vh' }}
      />
    </Box>
  );
}
