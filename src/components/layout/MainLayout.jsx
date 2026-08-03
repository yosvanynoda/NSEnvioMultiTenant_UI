import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Tooltip,
  Avatar,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MenuIcon from '@mui/icons-material/Menu';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon from '@mui/icons-material/Business';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

// serviceKey must match TenantServices.ServiceKey in the master DB.
// null means always visible (not gated by a service).
const NAV_ITEMS = [
  {
    label: 'Franquicia',
    icon: <BusinessIcon fontSize="small" />,
    serviceKey: null,
    adminOnly: true,           // hidden for plain User role
    gerenteOk: true,           // also visible to Gerente (Manager)
    children: [
      { label: 'Oficinas / Agencias', path: '/administration/agencia' },
      { label: 'Usuarios', path: '/administration/usuario' },
      { label: 'Almacenes', path: '/administration/storage' },
      { label: 'Precio x Envíos', path: '/sucursal/precioenvio' },
      { label: 'Precios de Productos', path: '/sucursal/productoprecios' },
      { label: 'Productos Inventario', path: '/administration/productoinventory' },
      { label: 'Fórmulas Factura Agencia', path: '/sucursal/agencia-invoice-formula' },
    ],
  },
  {
    label: 'Transcargo',
    icon: <DirectionsBoatIcon fontSize="small" />,
    serviceKey: 'carrier_transcargo',
    children: [
      { label: 'HBL', path: '/hbl/transcargo' },
      { label: 'Pallets',        path: '/hbl/transcargo/pallet',           noLowRole: true },
      { label: 'Despachar',      path: '/hbl/transcargo/contenedor',        adminOnly: true },
      { label: 'Master BL',      path: '/masterbl/transcargo',              adminOnly: true },
      { label: 'Factura Agencia',path: '/hbl/transcargo/sucursal-invoice',  adminOnly: true },
    ],
  },
  {
    label: 'Transcargo Aéreo',
    icon: <AirplanemodeActiveIcon fontSize="small" />,
    serviceKey: 'carrier_transcargo_aereo',
    children: [
      { label: 'HBL', path: '/hbl/transcargoaereo' },
      { label: 'Pallets',        path: '/hbl/transcargoaereo/pallet',          noLowRole: true },
      { label: 'Despachar',      path: '/hbl/transcargoaereo/contenedor',       adminOnly: true },
      { label: 'Master BL',      path: '/masterbl/transcargoaereo',             adminOnly: true },
      { label: 'Factura Agencia',path: '/hbl/transcargoaereo/sucursal-invoice', adminOnly: true },
    ],
  },
  {
    label: 'Palco',
    icon: <DirectionsBoatIcon fontSize="small" />,
    serviceKey: 'carrier_palco',
    children: [
      { label: 'HBL', path: '/hbl/palco' },
      { label: 'Pallets',        path: '/hbl/palco/pallet',           noLowRole: true },
      { label: 'Despachar',      path: '/hbl/palco/contenedor',        adminOnly: true },
      { label: 'Master BL',      path: '/masterbl/palco',              adminOnly: true },
      { label: 'Factura Agencia',path: '/hbl/palco/sucursal-invoice',  adminOnly: true },
    ],
  },
  {
    label: 'Aéreo',
    icon: <AirplanemodeActiveIcon fontSize="small" />,
    serviceKey: 'carrier_aereo',
    children: [
      { label: 'HBL', path: '/hbl/aereo' },
      { label: 'Pallets',        path: '/hbl/aereo/pallet',           noLowRole: true },
      { label: 'Despachar',      path: '/hbl/aereo/contenedor',        adminOnly: true },
      { label: 'Master BL',      path: '/masterbl/aereo',              adminOnly: true },
      { label: 'Factura Agencia',path: '/hbl/aereo/sucursal-invoice',  adminOnly: true },
    ],
  },
  {
    label: 'Cubapack',
    icon: <DirectionsBoatIcon fontSize="small" />,
    serviceKey: 'carrier_cubapack',
    children: [
      { label: 'HBL', path: '/hbl/cubapack' },
      { label: 'Pallets',        path: '/hbl/cubapack/pallet',           noLowRole: true },
      { label: 'Despachar',      path: '/hbl/cubapack/contenedor',        adminOnly: true },
      { label: 'Master BL',      path: '/masterbl/cubapack',              adminOnly: true },
      { label: 'Factura Agencia',path: '/hbl/cubapack/sucursal-invoice',  adminOnly: true },
    ],
  },
  {
    label: 'Cubapost',
    icon: <DirectionsBoatIcon fontSize="small" />,
    serviceKey: 'carrier_cubapost',
    children: [
      { label: 'HBL', path: '/hbl/cubapost' },
      { label: 'Pallets',        path: '/hbl/cubapost/pallet',           noLowRole: true },
      { label: 'Despachar',      path: '/hbl/cubapost/contenedor',        adminOnly: true },
      { label: 'Master BL',      path: '/masterbl/cubapost',              adminOnly: true },
      { label: 'Factura Agencia',path: '/hbl/cubapost/sucursal-invoice',  adminOnly: true },
    ],
  },
  {
    label: 'Facturas de Inventario',
    icon: <InventoryIcon fontSize="small" />,
    serviceKey: 'factura_inventario',
    children: [
      { label: 'Comprar', path: '/inventory/purchase', noUser: true },
      { label: 'Vender',  path: '/inventory/order' },
    ],
  },
  {
    label: 'Facturas Servicio',
    icon: <ReceiptIcon fontSize="small" />,
    serviceKey: 'factura_servicio',
    children: [
      { label: 'Factura', path: '/serviceinvoice' },
    ],
  },
  {
    label: 'Cotizaciones',
    icon: <RequestQuoteIcon fontSize="small" />,
    serviceKey: null,
    adminOnly: true,
    children: [
      { label: 'Cotización', path: '/quotation' },
    ],
  },
  {
    label: 'Reportes',
    icon: <AssessmentIcon fontSize="small" />,
    serviceKey: null,
    children: [
      { label: 'Dashboard', path: '/reports/dashboard' },
      { label: 'Reporte de Venta', path: '/reports/reporteventa' },
      { label: 'Transcargo Resumen por Envío', path: '/reports/resumentranscargo' },
      { label: 'Productos Especiales', path: '/reports/resumen-productos-especiales' },
    ],
  },
  {
    label: 'Cancelados',
    icon: <CancelIcon fontSize="small" />,
    serviceKey: null,
    adminOnly: true,
    children: [
      { label: 'HBL Cancelados', path: '/hbl/cancelados' },
    ],
  },
];

const ADMIN_NAV = {
  label: 'Administración',
  icon: <AdminPanelSettingsIcon fontSize="small" />,
  serviceKey: null,
  children: [
    { label: 'Franquicias', path: '/administration/sucursal' },
    { label: 'Productos', path: '/administration/producto' },
    { label: 'Tipos de Envíos', path: '/administration/tipoenvio' },
    { label: 'Provincias', path: '/administration/provincia' },
    { label: 'Municipios', path: '/administration/municipio' },
    { label: 'Navieras', path: '/administration/naviera' },
    { label: 'Promociones', path: '/administration/promotion' },
    { label: 'Configuración General', path: '/administration/generalsetting' },
    { label: 'Configuración SMS', path: '/administration/smssetting' },
    { label: 'Plantillas de Email', path: '/administration/emailtemplate' },
    { label: 'Configuración Correo', path: '/administration/emailsetting' },
    { label: 'Templates Master BL', path: '/masterbl/template' },
    { label: 'Importar Contactos', path: '/administration/importcontact', superAdminOnly: true },
    { label: 'Claves Webhook',     path: '/administration/webhookkeys',   superAdminOnly: true },
    { label: 'Tenants',            path: '/administration/tenants',        superAdminOnly: true },
  ],
};

function NavDropdown({ item, navigate, location }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleNav = (path) => {
    navigate(path);
    handleClose();
  };

  const isActive = item.children?.some((c) => location.pathname.startsWith(c.path));

  return (
    <>
      <Button
        color="inherit"
        onClick={handleOpen}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        startIcon={item.icon}
        sx={{
          mx: 0.5,
          fontWeight: isActive ? 700 : 400,
          borderBottom: isActive ? '2px solid white' : '2px solid transparent',
          borderRadius: 0,
          px: 1.5,
        }}
      >
        {item.label}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {item.children.map((child) => (
          <MenuItem
            key={child.path}
            onClick={() => handleNav(child.path)}
            selected={location.pathname === child.path}
          >
            {child.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function MobileDrawer({ open, onClose, navigate, location, allNav }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (label) => setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: 260 } }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocalShippingIcon />
        <Typography variant="h6" fontWeight={700}>NSEnvio</Typography>
      </Box>
      <List disablePadding>
        {allNav.map((item) => (
          <React.Fragment key={item.label}>
            <ListItemButton onClick={() => toggle(item.label)}>
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              {expanded[item.label] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={expanded[item.label]} unmountOnExit>
              <List disablePadding>
                {item.children.map((child) => (
                  <ListItemButton
                    key={child.path}
                    sx={{ pl: 4 }}
                    onClick={() => handleNav(child.path)}
                    selected={location.pathname === child.path}
                  >
                    <ListItemText primary={child.label} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Drawer>
  );
}

export default function MainLayout({ children }) {
  const { user, logout, isAdmin, isSuperAdmin, isGerente, isSuperUser, isReporting, isDocumentation } = useAuth();
  const { tenantConfig } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isPrivileged = isAdmin || isSuperAdmin;
  const isUserRole = Boolean(user?.roles?.includes('User'));
  // isLowRole: User and SuperUser get identical restrictions (no Pallets, no Despachar, no MasterBL)
  const isLowRole = (isUserRole || isSuperUser) && !isPrivileged && !isGerente;

  const enabledServices = new Set(tenantConfig?.enabledServices ?? []);

  let allNav;

  if (isReporting && !isPrivileged && !isGerente) {
    // Reporting: only Reports menu
    allNav = NAV_ITEMS.filter((item) => item.label === 'Reportes');

  } else if (isDocumentation && !isPrivileged && !isGerente) {
    // Documentation: only Despachar per enabled carrier
    allNav = NAV_ITEMS
      .filter((item) => item.serviceKey && enabledServices.has(item.serviceKey))
      .map((item) => ({ ...item, children: item.children.filter((c) => c.label === 'Despachar') }))
      .filter((item) => item.children.length > 0);

  } else {
    const visibleNav = NAV_ITEMS
      .filter((item) => item.serviceKey === null || enabledServices.has(item.serviceKey))
      .filter((item) => !item.adminOnly || isPrivileged || (item.gerenteOk && isGerente))
      .map((item) => {
        if (!item.children) return item;
        let children = item.children.filter((c) => !c.adminOnly || isPrivileged);
        if (isUserRole && !isPrivileged) children = children.filter((c) => !c.noUser);
        if (isLowRole) children = children.filter((c) => !c.noLowRole);
        return { ...item, children };
      });
    const adminNav = {
      ...ADMIN_NAV,
      children: ADMIN_NAV.children.filter(c => !c.superAdminOnly || isSuperAdmin),
    };
    allNav = isPrivileged ? [adminNav, ...visibleNav] : visibleNav;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top AppBar */}
      <AppBar position="sticky" color="primary" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar variant="dense">
          {isMobile && (
            <IconButton color="inherit" edge="start" sx={{ mr: 1 }} onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ cursor: 'pointer', mr: 2, flexShrink: 0 }}
            onClick={() => navigate('/')}
          >
            NSEnvio
          </Typography>

          {/* Desktop nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', flexGrow: 1, overflowX: 'auto' }}>
              {allNav.map((item) => (
                <NavDropdown key={item.label} item={item} navigate={navigate} location={location} />
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: isMobile ? 1 : 0 }} />

          {/* User greeting */}
          <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            Bienvenido, <strong>{user?.username}</strong>
          </Typography>
          <Tooltip title="Cerrar Sesión">
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={logout}
              size="small"
              sx={{ ml: 1, whiteSpace: 'nowrap' }}
            >
              {!isMobile && 'Cerrar Sesión'}
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigate={navigate}
        location={location}
        allNav={allNav}
      />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: { xs: 1.5, sm: 2, md: 3 }, overflow: 'auto', minHeight: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
