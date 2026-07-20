import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import PageTitle from '../components/common/PageTitle';

const QUICK_LINKS = [
  {
    title: 'Buscar HBL',
    description: 'Buscar un HBL por número, remitente o teléfono en todos los carriers',
    icon: <SearchIcon sx={{ fontSize: 48 }} />,
    color: '#546e7a',
    path: '/hbl/search',
    action: 'Buscar',
    serviceKey: null,
  },
  {
    title: 'HBL Transcargo',
    description: 'Crear y gestionar envíos marítimos Transcargo',
    icon: <DirectionsBoatIcon sx={{ fontSize: 48 }} />,
    color: '#1565c0',
    path: '/hbl/transcargo',
    action: 'Ver HBLs',
    createPath: '/hbl/transcargo/create',
    dispatchPath: '/hbl/transcargo/contenedor',
    serviceKey: 'carrier_transcargo',
  },
  {
    title: 'HBL Palco',
    description: 'Crear y gestionar envíos marítimos Palco',
    icon: <DirectionsBoatIcon sx={{ fontSize: 48 }} />,
    color: '#2e7d32',
    path: '/hbl/palco',
    action: 'Ver HBLs',
    createPath: '/hbl/palco/create',
    dispatchPath: '/hbl/palco/contenedor',
    serviceKey: 'carrier_palco',
  },
  {
    title: 'HBL Aéreo',
    description: 'Crear y gestionar envíos aéreos',
    icon: <AirplanemodeActiveIcon sx={{ fontSize: 48 }} />,
    color: '#6a1b9a',
    path: '/hbl/aereo',
    action: 'Ver HBLs',
    createPath: '/hbl/aereo/create',
    dispatchPath: '/hbl/aereo/contenedor',
    serviceKey: 'carrier_aereo',
  },
  {
    title: 'HBL CubaPack',
    description: 'Crear y gestionar envíos CubaPack',
    icon: <AllInboxIcon sx={{ fontSize: 48 }} />,
    color: '#0277bd',
    path: '/hbl/cubapack',
    action: 'Ver HBLs',
    createPath: '/hbl/cubapack/create',
    dispatchPath: '/hbl/cubapack/contenedor',
    serviceKey: 'carrier_cubapack',
  },
  {
    title: 'HBL CubaPost',
    description: 'Crear y gestionar envíos CubaPost',
    icon: <MarkunreadMailboxIcon sx={{ fontSize: 48 }} />,
    color: '#ad1457',
    path: '/hbl/cubapost',
    action: 'Ver HBLs',
    createPath: '/hbl/cubapost/create',
    dispatchPath: '/hbl/cubapost/contenedor',
    serviceKey: 'carrier_cubapost',
  },
  {
    title: 'HBL Transcargo Aéreo',
    description: 'Crear y gestionar envíos aéreos Transcargo',
    icon: <FlightTakeoffIcon sx={{ fontSize: 48 }} />,
    color: '#4527a0',
    path: '/hbl/transcargoaereo',
    action: 'Ver HBLs',
    createPath: '/hbl/transcargoaereo/create',
    dispatchPath: '/hbl/transcargoaereo/contenedor',
    serviceKey: 'carrier_transcargo_aereo',
  },
  {
    title: 'Inventario - Compras',
    description: 'Gestionar compras de inventario',
    icon: <InventoryIcon sx={{ fontSize: 48 }} />,
    color: '#e65100',
    path: '/inventory/purchase',
    action: 'Ver Compras',
    createPath: '/inventory/purchase/create',
    serviceKey: null,
  },
  {
    title: 'Facturas de Servicio',
    description: 'Gestionar facturas de servicio',
    icon: <ReceiptIcon sx={{ fontSize: 48 }} />,
    color: '#00695c',
    path: '/serviceinvoice',
    action: 'Ver Facturas',
    createPath: '/serviceinvoice/create',
    serviceKey: null,
  },
  {
    title: 'Reportes',
    description: 'Ver reportes de ventas y envíos',
    icon: <AssessmentIcon sx={{ fontSize: 48 }} />,
    color: '#37474f',
    path: '/reports/reporteventa',
    action: 'Ver Reportes',
    serviceKey: null,
  },
];

export default function Home() {
  const { user, isAdmin } = useAuth();
  const { tenantConfig } = useTenant();
  const navigate = useNavigate();
  const enabledServices = new Set(tenantConfig?.enabledServices ?? []);
  const visibleLinks = QUICK_LINKS.filter(
    (link) => link.serviceKey === null || enabledServices.has(link.serviceKey)
  );

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <LocalShippingIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            Bienvenido a NSEnvio
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hola, <strong>{user?.username}</strong>. ¿Qué desea hacer hoy?
            {isAdmin && (
              <Typography component="span" variant="body2" color="secondary.main" sx={{ ml: 1 }}>
                (Administrador)
              </Typography>
            )}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Grid container spacing={3}>
        {visibleLinks.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `4px solid ${link.color}`,
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
                <Box sx={{ color: link.color, mb: 2 }}>{link.icon}</Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {link.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {link.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    onClick={() => navigate(link.path)}
                    sx={{ borderColor: link.color, color: link.color }}
                  >
                    {link.action}
                  </Button>
                  {link.createPath && (
                    <Button
                      variant="contained"
                      fullWidth
                      size="small"
                      onClick={() => navigate(link.createPath)}
                      sx={{ bgcolor: link.color, '&:hover': { bgcolor: link.color, filter: 'brightness(0.85)' } }}
                    >
                      Nuevo
                    </Button>
                  )}
                </Box>
                {isAdmin && link.dispatchPath && (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    onClick={() => navigate(link.dispatchPath)}
                    sx={{ borderColor: link.color, color: link.color }}
                  >
                    Despachar
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
