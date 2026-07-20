import React from 'react';
import { Box, Button, CircularProgress, Alert, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';

const isMobileDevice =
  /Mobi|Android/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);

/**
 * Renders a PDF blob URL as an iframe on desktop or as open/download buttons on mobile,
 * since most mobile browsers don't support blob-URL PDFs inside iframes.
 *
 * Props:
 *   blobUrl       – blob: URL from URL.createObjectURL()
 *   loading       – show spinner
 *   error         – show error message
 *   title         – iframe title / display label
 *   filename      – suggested filename for the download button (default: title + '.pdf')
 *   wrapperSx     – extra sx for the outer gray wrapper Box
 *   iframeMinHeight – minHeight for the iframe (default '80vh')
 */
export default function PdfViewer({
  blobUrl,
  loading,
  error,
  title = 'PDF',
  filename,
  wrapperSx = {},
  iframeMinHeight = '80vh',
}) {
  const downloadName = filename || `${title}.pdf`;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#666',
        minHeight: 0,
        ...wrapperSx,
      }}
    >
      {loading ? (
        <CircularProgress sx={{ color: 'white' }} />
      ) : error ? (
        <Box sx={{ bgcolor: 'white', p: 4, borderRadius: 1, maxWidth: 500 }}>
          <Alert severity="error">
            Error al generar el PDF.<br />
            <small>{error}</small>
          </Alert>
        </Box>
      ) : blobUrl ? (
        isMobileDevice ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              p: 4,
              textAlign: 'center',
            }}
          >
            <PictureAsPdfIcon sx={{ fontSize: 72, color: 'white', opacity: 0.8 }} />
            <Typography color="white" variant="h6">PDF generado</Typography>
            <Typography color="white" variant="body2" sx={{ opacity: 0.75, maxWidth: 280 }}>
              El visor integrado no está disponible en móvil. Use los botones para ver o descargar el PDF.
            </Typography>
            <Button
              component="a"
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="large"
              startIcon={<OpenInNewIcon />}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
                minWidth: 220,
              }}
            >
              Abrir PDF
            </Button>
            <Button
              component="a"
              href={blobUrl}
              download={downloadName}
              variant="outlined"
              size="large"
              startIcon={<DownloadIcon />}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', minWidth: 220 }}
            >
              Descargar PDF
            </Button>
          </Box>
        ) : (
          <iframe
            src={blobUrl}
            title={title}
            style={{ width: '100%', height: '100%', minHeight: iframeMinHeight, border: 'none' }}
          />
        )
      ) : (
        <CircularProgress sx={{ color: 'white' }} />
      )}
    </Box>
  );
}
