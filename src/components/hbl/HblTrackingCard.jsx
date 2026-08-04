import React, { useEffect, useState } from 'react';
import {
  Box, TextField, InputAdornment, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Typography, CircularProgress, Alert, Tooltip,
  Stack, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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

// Hides old, already-delivered shipments from the default mobile list.
// deliveryDate is set server-side the moment hblStatus actually becomes
// Entregado (via sp_<carrier>hbl_updatestatus) and stays null until then.
function isOldDelivered(r) {
  if (getHblEstadoLabel(r.hblStatus).label !== 'Entregado') return false;
  if (!r.deliveryDate) return false;
  return dayjs().diff(dayjs(r.deliveryDate), 'day') > 30;
}

export default function HblTrackingCard({ compact = false, initialQuery = '' }) {
  const [search, setSearch] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery) setSearch(initialQuery);
  }, [initialQuery]);

  const query = search.trim();

  // Debounce the actual search: this is a public, unauthenticated, rate-limited
  // endpoint (10 req/5min/IP), and without this a single typed phone number
  // fires one request per keystroke, easily exhausting the quota and surfacing
  // as a confusing "check your connection" error mid-typing.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 450);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['hbl-tracking', debouncedQuery],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.HBL_TRACKING(debouncedQuery));
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: debouncedQuery.length >= 3,
    staleTime: 0,
  });

  const results = data ?? [];

  // Mobile card list: collapsed-by-default cards, with old delivered shipments
  // hidden until "Ver todos" is tapped.
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showAllMobile, setShowAllMobile] = useState(false);
  const toggleExpanded = (key) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const mobileResults = showAllMobile ? results : results.filter((r) => !isOldDelivered(r));
  const hiddenOldCount = results.length - mobileResults.length;

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

      {isError && (
        <Alert severity="error">
          {error?.status === 429
            ? 'Demasiadas búsquedas seguidas. Espere un momento e intente de nuevo.'
            : 'Error al buscar. Verifique su conexión.'}
        </Alert>
      )}

      {!isLoading && debouncedQuery.length >= 3 && results.length === 0 && (
        <Typography variant="body2" color="text.secondary">No se encontraron envíos para "{debouncedQuery}".</Typography>
      )}

      {results.length > 0 && (
        <>
          {/* Mobile / narrow: collapsed-by-default cards */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {mobileResults.map((r) => {
              const key = `${r.hblType}-${r.hblid}`;
              const estado = getHblEstadoLabel(r.hblStatus);
              const isExpanded = expandedIds.has(key);
              return (
                <Paper key={key} variant="outlined" sx={{ p: 2 }}>
                  <Box
                    onClick={() => toggleExpanded(key)}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Chip label={CARRIER_LABELS[r.hblType] || r.hblType} size="small" variant="outlined" />
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{r.numero}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      <Chip label={estado.label} color={estado.color} size="small" />
                      <ChevronRightIcon
                        fontSize="small"
                        sx={{ color: 'text.secondary', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                      />
                    </Box>
                  </Box>

                  {isExpanded && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      {r.envio && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Envío: {r.envio}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block">Remitente</Typography>
                      <Typography variant="body2">
                        {[r.remitenteName, r.remitenteLastName].filter(Boolean).join(' ') || '—'}
                        {r.remitenteTelefono && ` · ${r.remitenteTelefono}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Destinatario</Typography>
                      <Typography variant="body2">
                        {[r.destinatarioName, r.destinatarioLastName].filter(Boolean).join(' ') || '—'}
                      </Typography>
                      {r.bultoDescriptions && (
                        <>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Productos</Typography>
                          <Typography variant="body2">{r.bultoDescriptions}</Typography>
                        </>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Hace {formatHaceTiempo(r.fecha)}
                      </Typography>
                    </>
                  )}
                </Paper>
              );
            })}

            {!showAllMobile && hiddenOldCount > 0 && (
              <Typography
                variant="body2"
                color="primary"
                onClick={() => setShowAllMobile(true)}
                sx={{ textAlign: 'center', py: 1, cursor: 'pointer', fontWeight: 600 }}
              >
                Ver todos los envíos ({hiddenOldCount} entregado{hiddenOldCount === 1 ? '' : 's'} hace más de un mes oculto{hiddenOldCount === 1 ? '' : 's'})
              </Typography>
            )}
          </Stack>

          {/* Desktop: table */}
          <Paper variant="outlined" sx={{ overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
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
        </>
      )}
    </Box>
  );
}
