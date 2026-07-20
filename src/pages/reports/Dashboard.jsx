import React, { useState } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Alert,
  TextField, Button, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InventoryIcon from '@mui/icons-material/Inventory';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';

// ── HBL Status Enum ───────────────────────────────────────────────────────────
const HBL_STATUS = {
  0: { label: 'Seleccione',      color: 'default'  },
  1: { label: 'Facturado',       color: 'warning'  },
  2: { label: 'En Almacén',      color: 'primary'  },
  3: { label: 'En Tránsito',     color: 'info'     },
  4: { label: 'Entregado',       color: 'success'  },
  5: { label: 'Almacén Miami',   color: 'secondary'},
  6: { label: 'Puerto USA',      color: 'secondary'},
  7: { label: 'En Destino Cuba', color: 'info'     },
  8: { label: 'En Aduana Cuba',  color: 'warning'  },
  9: { label: 'En Repartición',  color: 'success'  },
};

// ── Color palettes ────────────────────────────────────────────────────────────
const CHART_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#00796b'];

const PAGO_COLORS = { Pendiente: '#ed6c02', Parcial: '#0288d1', Pagado: '#2e7d32' };

const TIPO_COLORS = {
  'Aéreo':            '#1976d2',
  'Transcargo':       '#388e3c',
  'Palco':            '#f57c00',
  'CubaPack':         '#7b1fa2',
  'CubaPost':         '#d32f2f',
  'Transcargo Aéreo': '#0288d1',
};

// ── Small helper components ───────────────────────────────────────────────────
function KpiCard({ title, value, icon, bgcolor = 'primary.main', loading }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
      <Box sx={{ bgcolor, color: 'white', borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary" lineHeight={1.2}>{title}</Typography>
        {loading
          ? <CircularProgress size={20} sx={{ mt: 0.5 }} />
          : <Typography variant="h5" fontWeight={700} lineHeight={1.3}>{value ?? '—'}</Typography>
        }
      </Box>
    </Paper>
  );
}

function ChartCard({ title, children, height = 300, action }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary">{title}</Typography>
        {action}
      </Box>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );
}

function BarTooltip({ active, payload, label, isMoney = true }) {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }} elevation={3}>
      <Typography variant="caption" display="block" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} color="primary.main">
        {isMoney ? `$${Number(payload[0].value).toFixed(2)}` : payload[0].value}
      </Typography>
    </Paper>
  );
}

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function LoadingBox({ height = 260 }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
      <CircularProgress />
    </Box>
  );
}

function EmptyBox({ height = 260, message = 'Sin datos.' }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
      <Typography color="text.secondary" variant="body2">{message}</Typography>
    </Box>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [fechaDesde, setFechaDesde] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [fechaHasta, setFechaHasta] = useState(dayjs().format('YYYY-MM-DD'));
  const [queryRange, setQueryRange] = useState({ desde: fechaDesde, hasta: fechaHasta });

  const applyRange = () => setQueryRange({ desde: fechaDesde, hasta: fechaHasta });

  // ── Queries ──────────────────────────────────────────────────────────────
  const resumenQ = useQuery({
    queryKey: ['dashboard-resumen'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_RESUMEN);
      return res.data?.data || res.data || {};
    },
    staleTime: 3 * 60 * 1000,
  });

  const resumenServiciosQ = useQuery({
    queryKey: ['dashboard-resumen-servicios'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_RESUMEN_SERVICIOS);
      return res.data?.data || res.data || {};
    },
    staleTime: 3 * 60 * 1000,
  });

  const ventasQ = useQuery({
    queryKey: ['dashboard-ventas', queryRange.desde, queryRange.hasta],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_VENTAS_DIARIAS(queryRange.desde, queryRange.hasta));
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
  });

  const ventasServiciosQ = useQuery({
    queryKey: ['dashboard-ventas-servicios', queryRange.desde, queryRange.hasta],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_VENTAS_SERVICIOS_DIARIAS(queryRange.desde, queryRange.hasta));
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
  });

  const provinciaQ = useQuery({
    queryKey: ['dashboard-provincia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_HBL_POR_PROVINCIA);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const tipoQ = useQuery({
    queryKey: ['dashboard-tipo'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_HBL_POR_TIPO);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const estadoQ = useQuery({
    queryKey: ['dashboard-estado-pago'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_HBL_POR_ESTADO_PAGO);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const duracionQ = useQuery({
    queryKey: ['dashboard-duracion-entrega'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_DURACION_ENTREGA);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const topProductosQ = useQuery({
    queryKey: ['dashboard-top-productos'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_TOP_PRODUCTOS);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const topClientesQ = useQuery({
    queryKey: ['dashboard-top-clientes-hbl'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_TOP_CLIENTES_HBL);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const inventoryStatusQ = useQuery({
    queryKey: ['dashboard-inventory-status'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_INVENTORY_STATUS);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const oldestHblsQ = useQuery({
    queryKey: ['dashboard-oldest-hbls'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD_OLDEST_HBLS);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const r = resumenQ.data || {};
  const ventasMes = r.ventasMes != null ? `$${Number(r.ventasMes).toFixed(2)}` : null;
  const ventasServiciosMes = resumenServiciosQ.data?.ventasServiciosMes != null
    ? `$${Number(resumenServiciosQ.data.ventasServiciosMes).toFixed(2)}`
    : null;

  return (
    <Box>
      <PageTitle
        title="Dashboard"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }, { label: 'Dashboard' }]}
      />

      {/* ── KPI Row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <KpiCard title="HBLs este mes" value={r.totalHbls} icon={<LocalShippingIcon />} bgcolor="primary.main" loading={resumenQ.isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <KpiCard title="Ventas inventario (mes)" value={ventasMes} icon={<TrendingUpIcon />} bgcolor="success.main" loading={resumenQ.isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <KpiCard title="Ventas servicios (mes)" value={ventasServiciosMes} icon={<ReceiptIcon />} bgcolor="secondary.main" loading={resumenServiciosQ.isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <KpiCard title="HBLs pendientes de pago" value={r.hblsPendientes} icon={<PaymentIcon />} bgcolor="warning.main" loading={resumenQ.isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <KpiCard title="HBLs en almacén" value={r.hblsEnAlmacen} icon={<InventoryIcon />} bgcolor="info.main" loading={resumenQ.isLoading} />
        </Grid>
      </Grid>

      {/* ── Shared date filter ── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>Período de ventas:</Typography>
        <TextField label="Desde" type="date" size="small" value={fechaDesde}
          onChange={e => setFechaDesde(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 145 }} />
        <TextField label="Hasta" type="date" size="small" value={fechaHasta}
          onChange={e => setFechaHasta(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 145 }} />
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={applyRange}>Aplicar</Button>
      </Paper>

      {/* ── Ventas Diarias Row ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Ventas Diarias — Inventario">
            {ventasQ.isLoading ? <LoadingBox /> : ventasQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !ventasQ.data?.length ? <EmptyBox message="Sin ventas en el período seleccionado." />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ventasQ.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={v => dayjs(v).format('MM/DD')} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={65} />
                    <RTooltip content={({ active, payload, label }) => <BarTooltip active={active} payload={payload} label={dayjs(label).format('MM/DD/YYYY')} isMoney />} />
                    <Bar dataKey="total" fill="#1976d2" radius={[4, 4, 0, 0]} name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Ventas Diarias — Servicios">
            {ventasServiciosQ.isLoading ? <LoadingBox /> : ventasServiciosQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !ventasServiciosQ.data?.length ? <EmptyBox message="Sin ventas de servicios en el período seleccionado." />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ventasServiciosQ.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={v => dayjs(v).format('MM/DD')} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={65} />
                    <RTooltip content={({ active, payload, label }) => <BarTooltip active={active} payload={payload} label={dayjs(label).format('MM/DD/YYYY')} isMoney />} />
                    <Bar dataKey="total" fill="#9c27b0" radius={[4, 4, 0, 0]} name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── HBL Status + Tipo + Duración ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartCard title="HBLs por Estado de Pago">
            {estadoQ.isLoading ? <LoadingBox height={300} /> : estadoQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !estadoQ.data?.length ? <EmptyBox height={300} />
              : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={estadoQ.data} cx="50%" cy="48%" innerRadius={60} outerRadius={95}
                      dataKey="cantidad" nameKey="estado" labelLine={false} label={renderPieLabel}>
                      {estadoQ.data.map((entry, i) => (
                        <Cell key={i} fill={PAGO_COLORS[entry.estado] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartCard title="HBLs por Tipo de Envío">
            {tipoQ.isLoading ? <LoadingBox height={300} /> : tipoQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !tipoQ.data?.length ? <EmptyBox height={300} />
              : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={tipoQ.data} cx="50%" cy="44%" innerRadius={60} outerRadius={95}
                      dataKey="cantidad" nameKey="tipo" labelLine={false} label={renderPieLabel}>
                      {tipoQ.data.map((entry, i) => (
                        <Cell key={i} fill={TIPO_COLORS[entry.tipo] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartCard title="Duración de Entrega (días promedio)">
            {duracionQ.isLoading ? <LoadingBox height={300} /> : duracionQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !duracionQ.data?.length ? <EmptyBox height={300} message="Sin datos de entrega disponibles." />
              : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={duracionQ.data} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="tipoEnvio" tick={{ fontSize: 11 }} width={110} />
                    <RTooltip content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }} elevation={3}>
                          <Typography variant="caption" display="block" color="text.secondary">{label}</Typography>
                          <Typography variant="body2" fontWeight={700} color="primary.main">{Number(payload[0].value).toFixed(1)} días</Typography>
                          <Typography variant="caption" color="text.secondary">{payload[0].payload.totalHbls} HBLs</Typography>
                        </Paper>
                      ) : null}
                    />
                    <Bar dataKey="promedioDias" radius={[0, 4, 4, 0]} name="Días prom.">
                      {duracionQ.data.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Provincia + Top Clientes ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard title="HBLs en Almacén por Provincia">
            {provinciaQ.isLoading ? <LoadingBox height={340} /> : provinciaQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !provinciaQ.data?.length ? <EmptyBox height={340} message="Sin HBLs en almacén actualmente." />
              : (
                <ResponsiveContainer width="100%" height={Math.max(300, provinciaQ.data.length * 36)}>
                  <BarChart data={provinciaQ.data} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="provincia" tick={{ fontSize: 11 }} width={90} />
                    <RTooltip content={({ active, payload, label }) => <BarTooltip active={active} payload={payload} label={label} isMoney={false} />} />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} name="HBLs">
                      {provinciaQ.data.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard title="Top 10 Clientes por Envíos">
            {topClientesQ.isLoading ? <LoadingBox height={340} /> : topClientesQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !topClientesQ.data?.length ? <EmptyBox height={340} />
              : (
                <ResponsiveContainer width="100%" height={Math.max(300, topClientesQ.data.length * 36)}>
                  <BarChart data={topClientesQ.data} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="remitenteName" tick={{ fontSize: 10 }} width={110} />
                    <RTooltip content={({ active, payload, label }) => <BarTooltip active={active} payload={payload} label={label} isMoney={false} />} />
                    <Bar dataKey="totalHbls" radius={[0, 4, 4, 0]} name="HBLs">
                      {topClientesQ.data.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Top Productos ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <ChartCard title="Top 10 Productos más Vendidos">
            {topProductosQ.isLoading ? <LoadingBox height={280} /> : topProductosQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
              : !topProductosQ.data?.length ? <EmptyBox height={280} />
              : (
                <ResponsiveContainer width="100%" height={Math.max(260, topProductosQ.data.length * 36)}>
                  <BarChart data={topProductosQ.data} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="productoName" tick={{ fontSize: 11 }} width={160} />
                    <RTooltip content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }} elevation={3}>
                          <Typography variant="caption" display="block" color="text.secondary">{label}</Typography>
                          <Typography variant="body2" fontWeight={700} color="primary.main">{payload[0].value} unidades</Typography>
                          <Typography variant="caption" color="text.secondary">${Number(payload[0].payload.totalVenta).toFixed(2)} total</Typography>
                        </Paper>
                      ) : null}
                    />
                    <Bar dataKey="totalUnidades" radius={[0, 4, 4, 0]} name="Unidades">
                      {topProductosQ.data.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Inventory Status Table ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Estado del Inventario</Typography>
        <Divider sx={{ mb: 2 }} />
        {inventoryStatusQ.isLoading ? <LoadingBox height={120} />
          : inventoryStatusQ.isError ? <Alert severity="error">Error al cargar inventario.</Alert>
          : !inventoryStatusQ.data?.length ? <EmptyBox height={80} />
          : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Stock Actual</TableCell>
                    <TableCell align="right">Mín.</TableCell>
                    <TableCell align="right">Máx.</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="right">Valor Stock</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventoryStatusQ.data.map((row) => {
                    const isLow = row.currentStock <= row.minInventory;
                    const isOver = row.maxInventory > 0 && row.currentStock > row.maxInventory;
                    const statusLabel = isLow ? 'Bajo Stock' : isOver ? 'Sobrestock' : 'Normal';
                    const statusColor = isLow ? 'error' : isOver ? 'warning' : 'success';
                    return (
                      <TableRow key={row.productoInventoryID} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                        <TableCell>{row.productoInventoryName}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: isLow ? 'error.main' : 'inherit' }}>{row.currentStock}</TableCell>
                        <TableCell align="right">{row.minInventory}</TableCell>
                        <TableCell align="right">{row.maxInventory || '—'}</TableCell>
                        <TableCell align="right">${Number(row.retailPrice).toFixed(2)}</TableCell>
                        <TableCell align="right">${(row.currentStock * Number(row.retailPrice)).toFixed(2)}</TableCell>
                        <TableCell align="center"><Chip label={statusLabel} color={statusColor} size="small" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
      </Paper>

      {/* ── Oldest HBLs Table ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>HBLs más Antiguos — Facturado / En Almacén</Typography>
        <Divider sx={{ mb: 2 }} />
        {oldestHblsQ.isLoading ? <LoadingBox height={120} />
          : oldestHblsQ.isError ? <Alert severity="error">Error al cargar datos.</Alert>
          : !oldestHblsQ.data?.length ? <EmptyBox height={80} message="No hay HBLs pendientes de despacho." />
          : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
                    <TableCell>Número</TableCell>
                    <TableCell>Tipo Envío</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="right">Días en Sistema</TableCell>
                    <TableCell>Fecha Creación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {oldestHblsQ.data.map((row, i) => (
                    <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.numero}</TableCell>
                      <TableCell>{row.tipoEnvio}</TableCell>
                      <TableCell>{row.remitenteName}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={HBL_STATUS[row.estado]?.label ?? row.estado}
                          color={HBL_STATUS[row.estado]?.color ?? 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: row.diasEnSistema > 30 ? 'error.main' : row.diasEnSistema > 14 ? 'warning.main' : 'inherit' }}>
                        {row.diasEnSistema}
                      </TableCell>
                      <TableCell>{dayjs(row.createdDate).format('MM/DD/YYYY')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
      </Paper>
    </Box>
  );
}
