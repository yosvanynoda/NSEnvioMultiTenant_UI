import React, { useState } from 'react';
import {
  Box, TextField, InputAdornment, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Button, Typography, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import HblDetailDialog from './dialogs/HblDetailDialog';

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

export default function HblGlobalSearch() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null); // { hblType, hblId }

  const query = search.trim();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hbl-search', query],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.HBL_SEARCH(query));
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: query.length >= 2,
    staleTime: 0,
  });

  const results = data ?? [];

  return (
    <Box>
      <PageTitle
        title="Buscar HBL"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Buscar HBL' }]}
      />

      <TextField
        fullWidth
        placeholder="Buscar por número, nombre, apellido o teléfono del remitente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, maxWidth: 520 }}
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

      {query.length > 0 && query.length < 2 && (
        <Typography variant="body2" color="text.secondary">Escriba al menos 2 caracteres para buscar.</Typography>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">Buscando...</Typography>
        </Box>
      )}

      {isError && <Alert severity="error">Error al buscar. Verifique su conexión.</Alert>}

      {!isLoading && query.length >= 2 && results.length === 0 && (
        <Typography variant="body2" color="text.secondary">No se encontraron HBLs para "{query}".</Typography>
      )}

      {results.length > 0 && (
        <Paper variant="outlined">
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
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => {
                const estado = getHblEstadoLabel(r.hblStatus, r.contenedorID);
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
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon fontSize="small" />}
                        onClick={() => setDetail({ hblType: r.hblType, hblId: r.hblid })}
                      >
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <HblDetailDialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        hblType={detail?.hblType}
        hblId={detail?.hblId}
      />
    </Box>
  );
}
