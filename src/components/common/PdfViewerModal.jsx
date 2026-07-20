import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Box, Typography,
} from '@mui/material';
import { fetchPdfBlobUrl } from '../../utils/pdfUtils';

/**
 * Modal that fetches a PDF from the API and renders it in an <iframe>.
 *
 * Props:
 *  open       {boolean}         - controls dialog visibility
 *  onClose    {function}        - called when user closes
 *  endpoint   {string}          - API endpoint that returns application/pdf
 *  params     {object}          - optional query params for the GET request
 *  title      {string}          - dialog title
 */
export default function PdfViewerModal({ open, onClose, endpoint, params, title = 'Documento' }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !endpoint) return;

    let revoked = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    fetchPdfBlobUrl(endpoint, params)
      .then((url) => {
        if (!revoked) setBlobUrl(url);
      })
      .catch((err) => {
        if (!revoked) setError(err?.message || 'Error al cargar el documento.');
      })
      .finally(() => {
        if (!revoked) setLoading(false);
      });

    return () => {
      revoked = true;
    };
  }, [open, endpoint, JSON.stringify(params)]);

  // Revoke blob URL when dialog closes or URL changes
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleClose = () => {
    setBlobUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ p: 0, height: '80vh', display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            title={title}
            style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
