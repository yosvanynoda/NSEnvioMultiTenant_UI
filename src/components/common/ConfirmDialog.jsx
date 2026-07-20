import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';

export default function ConfirmDialog({
  open,
  title = 'Confirmar eliminación',
  message = '¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.',
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  severity = 'error',
}) {
  const colorMap = {
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color={colorMap[severity] || 'error'} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined">
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color={colorMap[severity] || 'error'}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
