import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert, Typography, Box, Chip, Divider,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../../../api/apiClient';
import { HBL_ENDPOINT_MAP } from '../../../api/endpoints';

const TIPO_HBL = { 1: 'Envío', 2: 'Ena', 3: 'Menaje' };

const CARRIER_LABELS = {
  aereo:           'Aéreo',
  transcargo:      'Transcargo',
  palco:           'Palco',
  cubapack:        'CubaPack',
  cubapost:        'CubaPost',
  transcargoaereo: 'Transcargo Aéreo',
};

function getHblEstadoLabel(hblStatus, contenedorID) {
  if (contenedorID == null) return { label: 'Facturado', color: 'primary' };
  return { label: 'InTránsito', color: 'warning' };
}

function Field({ label, value }) {
  return (
    <Box sx={{ minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value ?? '—'}</Typography>
    </Box>
  );
}

export default function HblDetailDialog({ open, onClose, hblType, hblId }) {
  const endpoint = HBL_ENDPOINT_MAP[hblType];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hbl-detail', hblType, hblId],
    queryFn: async () => {
      const res = await apiClient.get(`${endpoint}/${hblId}`);
      return res.data?.data || res.data;
    },
    enabled: open && Boolean(hblId) && Boolean(endpoint),
    staleTime: 0,
  });

  const bultos = data?.bultos || data?.detalle || [];
  const payments = data?.payments || [];
  const estado = data ? getHblEstadoLabel(data.hblStatus, data.contenedorID) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Detalle HBL {data?.numero ? `#${data.numero}` : ''}
        {hblType && <Chip label={CARRIER_LABELS[hblType] || hblType} size="small" sx={{ ml: 1 }} />}
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {isError && <Alert severity="error">Error al cargar el detalle del HBL.</Alert>}

        {data && !isLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Field label="Número" value={data.numero} />
              <Field label="Envío" value={data.envio} />
              <Field label="Fecha" value={data.fecha ? dayjs(data.fecha).format('MM/DD/YYYY') : '—'} />
              <Field label="Tipo HBL" value={TIPO_HBL[data.hBLType ?? data.hblType] || '—'} />
              <Box sx={{ minWidth: 160 }}>
                <Typography variant="caption" color="text.secondary" display="block">Estado</Typography>
                {estado && <Chip label={estado.label} color={estado.color} size="small" sx={{ mt: 0.5 }} />}
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Field label="Remitente" value={data.remitenteName} />
              <Field label="Destinatario" value={data.destinatarioName} />
              <Field label="Nota" value={data.nota} />
              <Field label="Observación" value={data.observation || data.observacion} />
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Bultos</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Peso</TableCell>
                    <TableCell align="right">Volumen</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="right">Valor Aduanal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bultos.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center">Sin bultos</TableCell></TableRow>
                  )}
                  {bultos.map((b, i) => (
                    <TableRow key={b.hblBultoID ?? i}>
                      <TableCell>{b.description || b.descripcionProducto || '—'}</TableCell>
                      <TableCell align="right">{b.cantidad ?? '—'}</TableCell>
                      <TableCell align="right">{b.peso ?? '—'}</TableCell>
                      <TableCell align="right">{b.volumen ?? '—'}</TableCell>
                      <TableCell align="right">{b.precio != null ? `$${Number(b.precio).toFixed(2)}` : '—'}</TableCell>
                      <TableCell align="right">{b.valorAduanal != null ? `$${Number(b.valorAduanal).toFixed(2)}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Cargos y Pagos</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Field label="Manipulación" value={data.handlingFee != null ? `$${Number(data.handlingFee).toFixed(2)}` : '—'} />
                <Field label="Seguro/Envío" value={data.shippingInsurance != null ? `$${Number(data.shippingInsurance).toFixed(2)}` : '—'} />
                <Field label="Descuento" value={data.discount != null ? `$${Number(data.discount).toFixed(2)}` : '—'} />
                <Field label="Distribución" value={data.deliveryServicesFee != null ? `$${Number(data.deliveryServicesFee).toFixed(2)}` : '—'} />
              </Box>
              {payments.length > 0 && (
                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Método de Pago</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.hBLPaymentName || p.hblPaymentName}</TableCell>
                        <TableCell align="right">${Number(p.hBLPaymentAmount ?? p.hblPaymentAmount ?? 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
