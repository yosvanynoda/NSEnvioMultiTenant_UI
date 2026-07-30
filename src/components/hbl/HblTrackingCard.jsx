import React, { useEffect, useState } from 'react';
import {
  Box, TextField, InputAdornment, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Typography, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';

const CARRIER_LABELS = {
  aereo:           'Aéreo',
  transcargo:      'Transcargo',
  palco:           'Palco',
  cubapack:        'CubaPack',
  cubapost:        'CubaPost',
  transcargoaereo: 'Transcargo Aéreo',
};

const HBL_STATUS_LABELS = {
  1: { label: 'Facturado',        color: 'default' },
  2: { label: 'En Almacén',       color: 'info' },
  3: { label: 'En Tránsito',      color: 'warning' },
  4: { label: 'Entregado',        color: 'success' },
  5: { label: 'Almacén Miami',    color: 'info' },
  6: { label: 'Puerto USA',       color: 'info' },
  7: { label: 'En Destino Cuba',  color: 'warning' },
  8: { label: 'En Aduana Cuba',   color: 'warning' },
  9: { label: 'En Repartición',   color: 'warning' },
};

function getHblEstadoLabel(hblStatus) {
  return HBL_STATUS_LABELS[hblStatus] || { label: 'Facturado', color: 'default' };
}

function formatHaceTiempo(fecha) {
  if (!fecha) return '—';
  const dias = dayjs().startOf('day').diff(dayjs(fecha).startOf('day'), 'day');
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return '1 día';
  return `${dias} días`;
}

export default function HblTrackingCard({ compact = false, initialQuery = '' }) {
  const [search, setSearch] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery) setSearch(initialQuery);
  }, [initialQuery]);

  const query = search.trim();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hbl-tracking', query],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.HBL_TRACKING(query));
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: query.length >= 3,
    staleTime: 0,
  });

  const results = data ?? [];

  return (
    <Box>
      {!compact && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ingrese su número de teléfono o el número de su envío para consultar el estado.
        </Typography>
      )}

      <TextField
        fullWidth
        placeholder="Teléfono o número de envío..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: compact ? 2 : 3, maxWidth: compact ? '100%' : 520 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {query.length > 0 && query.length < 3 && (
        <Typography variant="body2" color="text.secondary">Escriba al menos 3 caracteres para buscar.</Typography>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">Buscando...</Typography>
        </Box>
      )}

      {isError && <Alert severity="error">Error al buscar. Verifique su conexión.</Alert>}

      {!isLoading && query.length >= 3 && results.length === 0 && (
        <Typography variant="body2" color="text.secondary">No se encontraron envíos para "{query}".</Typography>
      )}

      {results.length > 0 && (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Carrier</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Envío</TableCell>
                <TableCell>Remitente</TableCell>
                <TableCell>Destinatario</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Productos</TableCell>
                <TableCell>Hace</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => {
                const estado = getHblEstadoLabel(r.hblStatus);
                return (
                  <TableRow key={`${r.hblType}-${r.hblid}`} hover>
                    <TableCell>
                      <Chip label={CARRIER_LABELS[r.hblType] || r.hblType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{r.numero}</TableCell>
                    <TableCell>{r.envio}</TableCell>
                    <TableCell>
                      {[r.remitenteName, r.remitenteLastName].filter(Boolean).join(' ')}
                      {r.remitenteTelefono && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {r.remitenteTelefono}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{[r.destinatarioName, r.destinatarioLastName].filter(Boolean).join(' ')}</TableCell>
                    <TableCell><Chip label={estado.label} color={estado.color} size="small" /></TableCell>
                    <TableCell>
                      <Tooltip title={r.bultoDescriptions || ''}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>{r.bultoDescriptions || '—'}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatHaceTiempo(r.fecha)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
