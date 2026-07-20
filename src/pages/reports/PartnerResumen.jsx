import React, { useState, useEffect } from 'react';
import {
  Box, Paper, TextField, Button, Alert, CircularProgress, Typography,
  Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { useCarrierOptions } from '../../hooks/useCarrierOptions';

export default function PartnerResumen() {
  const carriers = useCarrierOptions();
  const [carrier, setCarrier] = useState('');
  const [envio, setEnvio] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (carriers.length === 1) setCarrier(carriers[0].value);
  }, [carriers]);

  const handleSearch = async () => {
    const trimmed = envio.trim();
    if (!trimmed || !carrier) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await apiClient.get(ENDPOINTS.PARTNER_RESUMEN(trimmed, carrier));
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Group detalles by sucursal
  const sucursalGroups = React.useMemo(() => {
    if (!data?.detalles) return [];
    const map = new Map();
    for (const row of data.detalles) {
      const key = row.sucursalid;
      if (!map.has(key)) map.set(key, { sucursalid: row.sucursalid, sucursalname: row.sucursalname, agencias: new Map() });
      const suc = map.get(key);
      if (!suc.agencias.has(row.agencianame)) suc.agencias.set(row.agencianame, []);
      suc.agencias.get(row.agencianame).push(row);
    }
    return Array.from(map.values()).map(suc => ({
      ...suc,
      agencias: Array.from(suc.agencias.entries()).map(([name, rows]) => ({ name, rows })),
    }));
  }, [data]);

  const containerBySucursalMap = React.useMemo(() => {
    if (!data?.containerbysucursal) return new Map();
    return new Map(data.containerbysucursal.map(r => [r.sucursalid, r]));
  }, [data]);

  const fmt = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n) => Number(n).toLocaleString('es-ES');

  return (
    <Box>
      <PageTitle
        title="Resumen Productos Especiales por Partner"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Resumen Partners' }]}
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3, maxWidth: 560 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {carriers.length > 1 && (
            <TextField
              select label="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)}
              size="small" sx={{ minWidth: 160 }}
            >
              {carriers.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          )}
          <TextField
            label="Número de Envío"
            value={envio}
            onChange={e => setEnvio(e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            sx={{ flex: 1, minWidth: 160 }}
            placeholder="Ej: ENV-001"
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !envio.trim() || !carrier}
          >
            {loading ? 'Buscando...' : 'Generar'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, maxWidth: 500 }}>{error}</Alert>}

      {data && (
        <Box>
          {/* Container totals */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, maxWidth: 600, bgcolor: 'warning.light' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              TOTAL CONTENEDOR — Envío: {data.envio}
            </Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Bultos</Typography>
                <Typography variant="h6" fontWeight="bold">{fmtInt(data.totalbultoscontenedor)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="caption" color="text.secondary">Total Peso (lb)</Typography>
                <Typography variant="h6" fontWeight="bold">{fmt(data.totalpesocontenedor)}</Typography>
              </Box>
            </Box>
          </Paper>

          {sucursalGroups.length === 0 ? (
            <Alert severity="info">No se encontraron productos especiales para este envío.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sucursalGroups.map(suc => {
                const cont = containerBySucursalMap.get(suc.sucursalid);
                const contBultos = cont?.totalbultos ?? 0;
                const contPeso   = cont?.totalpeso   ?? 0;
                const especBultos = suc.agencias.reduce((s, a) => s + a.rows.reduce((ss, r) => ss + r.totalbultos, 0), 0);
                const especPeso   = suc.agencias.reduce((s, a) => s + a.rows.reduce((ss, r) => ss + r.totalpeso, 0), 0);
                const difBultos = contBultos - especBultos;
                const difPeso   = contPeso   - especPeso;

                return (
                  <Paper key={suc.sucursalid} variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarehouseIcon sx={{ color: 'primary.contrastText', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight="bold" color="primary.contrastText">
                        {suc.sucursalname}
                      </Typography>
                      {cont && (
                        <Chip
                          label={`Contenedor: ${fmtInt(contBultos)} bultos / ${fmt(contPeso)} lb`}
                          size="small"
                          sx={{ ml: 'auto', bgcolor: 'primary.light', color: 'primary.contrastText', fontWeight: 600 }}
                        />
                      )}
                    </Box>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Agencia</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Bultos</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Peso (lb)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {suc.agencias.map(ag => {
                            const agBultos = ag.rows.reduce((s, r) => s + r.totalbultos, 0);
                            const agPeso   = ag.rows.reduce((s, r) => s + r.totalpeso,   0);
                            return (
                              <React.Fragment key={ag.name}>
                                {ag.rows.map((row, i) => (
                                  <TableRow key={i} hover>
                                    <TableCell>{row.agencianame}</TableCell>
                                    <TableCell>{row.productoname}</TableCell>
                                    <TableCell align="right">{fmtInt(row.totalbultos)}</TableCell>
                                    <TableCell align="right">{fmt(row.totalpeso)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                  <TableCell colSpan={2} align="right" sx={{ fontStyle: 'italic', color: 'text.secondary', pr: 2 }}>
                                    Subtotal {ag.name}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtInt(agBultos)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(agPeso)}</TableCell>
                                </TableRow>
                              </React.Fragment>
                            );
                          })}

                          {/* Totals */}
                          <TableRow sx={{ bgcolor: 'grey.200' }}>
                            <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>TOTAL PRODUCTOS ESPECIALES</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtInt(especBultos)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(especPeso)}</TableCell>
                          </TableRow>

                          {/* Summary by product type */}
                          {(() => {
                            const byProduct = new Map();
                            for (const ag of suc.agencias)
                              for (const r of ag.rows) {
                                const prev = byProduct.get(r.productoname) || { bultos: 0, peso: 0 };
                                byProduct.set(r.productoname, { bultos: prev.bultos + r.totalbultos, peso: prev.peso + r.totalpeso });
                              }
                            return (
                              <>
                                <TableRow sx={{ bgcolor: 'info.light' }}>
                                  <TableCell colSpan={4} sx={{ fontWeight: 'bold', color: 'info.contrastText' }}>
                                    RESUMEN POR PRODUCTO — {suc.sucursalname}
                                  </TableCell>
                                </TableRow>
                                {Array.from(byProduct.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([prod, vals]) => (
                                  <TableRow key={prod} sx={{ bgcolor: 'info.lighter' }}>
                                    <TableCell />
                                    <TableCell>{prod}</TableCell>
                                    <TableCell align="right">{fmtInt(vals.bultos)}</TableCell>
                                    <TableCell align="right">{fmt(vals.peso)}</TableCell>
                                  </TableRow>
                                ))}
                              </>
                            );
                          })()}

                          {/* Difference */}
                          {cont && (
                            <TableRow sx={{ bgcolor: difBultos < 0 ? 'error.light' : 'success.light' }}>
                              <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                                DIFERENCIA (Contenedor − Especiales)
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtInt(difBultos)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(difPeso)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                );
              })}

              {/* Overall difference */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'error.light' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  DIFERENCIA GLOBAL (Contenedor − Total Especiales)
                </Typography>
                {(() => {
                  const totalEspecBultos = sucursalGroups.reduce((s, sg) =>
                    s + sg.agencias.reduce((ss, a) => ss + a.rows.reduce((sss, r) => sss + r.totalbultos, 0), 0), 0);
                  const totalEspecPeso = sucursalGroups.reduce((s, sg) =>
                    s + sg.agencias.reduce((ss, a) => ss + a.rows.reduce((sss, r) => sss + r.totalpeso, 0), 0), 0);
                  const dBultos = data.totalbultoscontenedor - totalEspecBultos;
                  const dPeso   = data.totalpesocontenedor - totalEspecPeso;
                  return (
                    <Box sx={{ display: 'flex', gap: 4 }}>
                      <Box>
                        <Typography variant="caption">Bultos</Typography>
                        <Typography variant="h6" fontWeight="bold">{fmtInt(dBultos)}</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="caption">Peso (lb)</Typography>
                        <Typography variant="h6" fontWeight="bold">{fmt(dPeso)}</Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </Paper>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
