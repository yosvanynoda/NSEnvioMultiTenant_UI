import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Button, Typography, CircularProgress, Alert,
} from '@mui/material';
import PdfViewer from '../../components/common/PdfViewer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import apiClient from '../../api/apiClient';
import { ENDPOINTS, HBL_DOC_TYPES } from '../../api/endpoints';
import { useTenant } from '../../contexts/TenantContext';
import { fetchPdfBlobUrl } from '../../utils/pdfUtils';

const SERVER_PDF_TYPES = {
  aereo: {
    label:     (id) => ENDPOINTS.AEREO_HBL_LABEL_PDF(id),
    factura:   (id) => ENDPOINTS.AEREO_HBL_FACTURA_PDF(id),
    guiaaerea: (id) => ENDPOINTS.AEREO_HBL_GUIAAEREA_PDF(id),
  },
  transcargo: {
    label:       (id) => ENDPOINTS.TRANSCARGO_HBL_LABEL_PDF(id),
    factura:     (id) => ENDPOINTS.TRANSCARGO_HBL_FACTURA_PDF(id),
    boleta:      (id) => ENDPOINTS.TRANSCARGO_HBL_BOLETA_PDF(id),
    resumen:     (id) => ENDPOINTS.TRANSCARGO_HBL_RESUMEN_PDF(id),
    iniciales:   (id) => ENDPOINTS.TRANSCARGO_HBL_INICIALES_PDF(id),
    numerocajas: (id) => ENDPOINTS.TRANSCARGO_HBL_NUMEROCAJAS_PDF(id),
  },
  transcargoaereo: {
    label:     (id) => ENDPOINTS.TRANSCARGO_AEREO_HBL_LABEL_PDF(id),
    factura:   (id) => ENDPOINTS.TRANSCARGO_AEREO_HBL_FACTURA_PDF(id),
    guiaaerea: (id) => ENDPOINTS.TRANSCARGO_AEREO_HBL_GUIAAEREA_PDF(id),
  },
  palco: {
    label:   (id) => ENDPOINTS.PALCO_HBL_LABEL_PDF(id),
    factura: (id) => ENDPOINTS.PALCO_HBL_FACTURA_PDF(id),
  },
  cubapack: {
    label:   (id) => ENDPOINTS.CUBA_PACK_HBL_LABEL_PDF(id),
    factura: (id) => ENDPOINTS.CUBA_PACK_HBL_FACTURA_PDF(id),
  },
  cubapost: {
    label:   (id) => ENDPOINTS.CUBA_POST_HBL_LABEL_PDF(id),
    factura: (id) => ENDPOINTS.CUBA_POST_HBL_FACTURA_PDF(id),
  },
};

const DOC_LABELS = {
  label:       'Label',
  factura:     'Factura',
  guiaaerea:   'Guía Aérea',
  boleta:      'Boleta',
  resumen:     'Resumen x Cajas',
  iniciales:   'Iniciales',
  numerocajas: 'Número Cajas',
  manifiesto:  'Manifiesto',
};

const TYPE_KEY_MAP = {
  aereo:           'aereo',
  transcargo:      'transcargo',
  palco:           'palco',
  cubapack:        'cubapack',
  cubapost:        'cubapost',
  transcargoaereo: 'transcargoaereo',
};

export default function HblPrintPage() {
  const { hblType, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantConfig } = useTenant();
  const [activeDoc, setActiveDoc] = useState('label');
  const ventaOrderId = location.state?.orderId ?? null;
  const [ventaPrinting, setVentaPrinting] = useState(false);

  const availableDocs = tenantConfig?.hblDocuments?.[TYPE_KEY_MAP[hblType]] ?? HBL_DOC_TYPES[hblType] ?? ['label', 'factura'];

  useEffect(() => {
    if (availableDocs.length > 0 && !availableDocs.includes(activeDoc)) {
      setActiveDoc(availableDocs[0]);
    }
  }, [availableDocs, activeDoc]);

  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError,   setPdfError]   = useState(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    const endpointFn = SERVER_PDF_TYPES[hblType]?.[activeDoc];
    if (!endpointFn || !id) return;

    let cancelled = false;
    setPdfLoading(true);
    setPdfError(null);
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
      .catch((err) => {
        if (!cancelled) setPdfError(err?.response?.data?.message || err?.message || 'Error al cargar el PDF');
      })
      .finally(() => { if (!cancelled) setPdfLoading(false); });

    return () => { cancelled = true; };
  }, [hblType, id, activeDoc]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const handleVentaPrint = async () => {
    setVentaPrinting(true);
    const win = window.open('', '_blank');
    try {
      const res = await apiClient.get(`${ENDPOINTS.ORDER}/${ventaOrderId}/print`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { if (win) win.close(); } finally {
      setVentaPrinting(false);
    }
  };

  const hasServerEndpoint = Boolean(SERVER_PDF_TYPES[hblType]?.[activeDoc]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Imprimir {DOC_LABELS[activeDoc] || activeDoc}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {availableDocs.map(doc => (
            <Button
              key={doc}
              variant={activeDoc === doc ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setActiveDoc(doc)}
            >
              {DOC_LABELS[doc] || doc}
            </Button>
          ))}
        </Box>

        {ventaOrderId && (
          <Button
            variant="outlined"
            size="small"
            color="success"
            startIcon={ventaPrinting ? <CircularProgress size={14} color="inherit" /> : <PrintIcon />}
            onClick={handleVentaPrint}
            disabled={ventaPrinting}
          >
            Factura Venta
          </Button>
        )}

        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/hbl/${hblType}`)}
        >
          Regresar
        </Button>
      </Box>

      {/* PDF Viewer area */}
      {!hasServerEndpoint ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#666' }}>
          <Box sx={{ bgcolor: 'white', p: 4, borderRadius: 1 }}>
            <Typography>{DOC_LABELS[activeDoc] || activeDoc} — próximamente</Typography>
          </Box>
        </Box>
      ) : (
        <PdfViewer
          blobUrl={pdfBlobUrl}
          loading={pdfLoading}
          error={pdfError}
          title={DOC_LABELS[activeDoc] || activeDoc}
          iframeMinHeight="600px"
        />
      )}
    </Box>
  );
}
