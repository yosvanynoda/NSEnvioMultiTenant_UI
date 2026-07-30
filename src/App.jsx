import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Button, Typography } from '@mui/material';
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';
import SuperAdminRoute from './components/common/SuperAdminRoute';
import UserMgmtRoute from './components/common/UserMgmtRoute';
import NonUserRoute from './components/common/NonUserRoute';
import MainLayout from './components/layout/MainLayout';

class LazyErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
          <Typography color="error">Error al cargar la página.</Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>Recargar</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const PageLoader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Pages
const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const Home = React.lazy(() => import('./pages/Home'));
const PublicTracking = React.lazy(() => import('./pages/hbl/PublicTracking'));

// HBL
const HblIndex = React.lazy(() => import('./pages/hbl/HblIndex'));
const HblCreate = React.lazy(() => import('./pages/hbl/HblCreate'));
const HblEdit = React.lazy(() => import('./pages/hbl/HblEdit'));
const HblGlobalSearch = React.lazy(() => import('./pages/hbl/HblGlobalSearch'));
const HblPrintPage = React.lazy(() => import('./pages/hbl/HblPrintPage'));

// Administration
const AgenciaIndex = React.lazy(() => import('./pages/administration/Agencia/AgenciaIndex'));
const AgenciaForm = React.lazy(() => import('./pages/administration/Agencia/AgenciaForm'));
const ProductoIndex = React.lazy(() => import('./pages/administration/Producto/ProductoIndex'));
const ProductoForm = React.lazy(() => import('./pages/administration/Producto/ProductoForm'));
const ProductoInventoryIndex = React.lazy(() => import('./pages/administration/ProductoInventory/ProductoInventoryIndex'));
const ProductoInventoryForm = React.lazy(() => import('./pages/administration/ProductoInventory/ProductoInventoryForm'));
const UsuarioIndex = React.lazy(() => import('./pages/administration/Usuario/UsuarioIndex'));
const UsuarioForm = React.lazy(() => import('./pages/administration/Usuario/UsuarioForm'));
const ProvinciaIndex = React.lazy(() => import('./pages/administration/Provincia/ProvinciaIndex'));
const StorageIndex   = React.lazy(() => import('./pages/administration/Storage/StorageIndex'));
const ProvinciaForm = React.lazy(() => import('./pages/administration/Provincia/ProvinciaForm'));
const NavieraIndex = React.lazy(() => import('./pages/administration/Naviera/NavieraIndex'));
const NavieraForm = React.lazy(() => import('./pages/administration/Naviera/NavieraForm'));
const PromotionIndex = React.lazy(() => import('./pages/administration/Promotion/PromotionIndex'));
const PromotionForm = React.lazy(() => import('./pages/administration/Promotion/PromotionForm'));
const MunicipioIndex = React.lazy(() => import('./pages/administration/Municipio/MunicipioIndex'));
const MunicipioForm = React.lazy(() => import('./pages/administration/Municipio/MunicipioForm'));
const TipoEnvioIndex = React.lazy(() => import('./pages/administration/TipoEnvio/TipoEnvioIndex'));
const TipoEnvioForm = React.lazy(() => import('./pages/administration/TipoEnvio/TipoEnvioForm'));
const SucursalIndex = React.lazy(() => import('./pages/administration/Sucursal/SucursalIndex'));
const SucursalForm = React.lazy(() => import('./pages/administration/Sucursal/SucursalForm'));
const AgenciaStockIndex = React.lazy(() => import('./pages/administration/AgenciaStock/AgenciaStockIndex'));
const AgenciaStockForm = React.lazy(() => import('./pages/administration/AgenciaStock/AgenciaStockForm'));
const GeneralSettingIndex = React.lazy(() => import('./pages/administration/GeneralSetting/GeneralSettingIndex'));
const EmailSettingIndex = React.lazy(() => import('./pages/administration/EmailSetting/EmailSettingIndex'));
const SmsSettingIndex    = React.lazy(() => import('./pages/administration/SmsSetting/SmsSettingIndex'));
const EmailTemplateIndex  = React.lazy(() => import('./pages/administration/EmailTemplate/EmailTemplateIndex'));
const ImportContactIndex  = React.lazy(() => import('./pages/administration/ImportContact/ImportContactIndex'));
const WebhookApiKeyIndex  = React.lazy(() => import('./pages/administration/WebhookApiKey/WebhookApiKeyIndex'));
const TenantAdminIndex    = React.lazy(() => import('./pages/administration/TenantAdmin/TenantAdminIndex'));

// Sucursal
const PrecioEnvioIndex = React.lazy(() => import('./pages/sucursal/PrecioEnvio/PrecioEnvioIndex'));
const PrecioEnvioForm = React.lazy(() => import('./pages/sucursal/PrecioEnvio/PrecioEnvioForm'));
const ValorFijoIndex = React.lazy(() => import('./pages/sucursal/ValorFijo/ValorFijoIndex'));
const ProductoInventarioPrecioIndex = React.lazy(() => import('./pages/sucursal/ProductoInventarioPrecio/ProductoInventarioPrecioIndex'));
const ProductoPreciosIndex = React.lazy(() => import('./pages/sucursal/ProductoPrecios/ProductoPreciosIndex'));

// Inventory
const PurchaseIndex = React.lazy(() => import('./pages/inventory/Purchase/PurchaseIndex'));
const PurchaseCreate = React.lazy(() => import('./pages/inventory/Purchase/PurchaseCreate'));
const PurchasePrintPage = React.lazy(() => import('./pages/inventory/Purchase/PurchasePrintPage'));
const OrderIndex = React.lazy(() => import('./pages/inventory/Order/OrderIndex'));
const OrderCreate = React.lazy(() => import('./pages/inventory/Order/OrderCreate'));
const OrderPrintPage = React.lazy(() => import('./pages/inventory/Order/OrderPrintPage'));

// Service Invoice
const ServiceInvoiceIndex = React.lazy(() => import('./pages/serviceInvoice/ServiceInvoiceIndex'));
const ServiceInvoiceCreate = React.lazy(() => import('./pages/serviceInvoice/ServiceInvoiceCreate'));
const ServiceInvoicePrintPage = React.lazy(() => import('./pages/serviceInvoice/ServiceInvoicePrintPage'));
const QuotationIndex = React.lazy(() => import('./pages/quotation/QuotationIndex'));
const QuotationCreate = React.lazy(() => import('./pages/quotation/QuotationCreate'));
const QuotationPrintPage = React.lazy(() => import('./pages/quotation/QuotationPrintPage'));

// Reports
const ReporteVenta = React.lazy(() => import('./pages/reports/ReporteVenta'));
const ResumenTranscargo = React.lazy(() => import('./pages/reports/ResumenTranscargo'));
const Dashboard = React.lazy(() => import('./pages/reports/Dashboard'));
const PartnerResumen = React.lazy(() => import('./pages/reports/PartnerResumen'));
const RecogidaAlmacen = React.lazy(() => import('./pages/reports/RecogidaAlmacen'));
const ResumenProductosEspeciales = React.lazy(() => import('./pages/reports/ResumenProductosEspeciales'));

// Despachar
const ContenedorIndex = React.lazy(() => import('./pages/despachar/ContenedorIndex'));
const ContenedorCreate = React.lazy(() => import('./pages/despachar/ContenedorCreate'));

// Pallets
const PalletIndex = React.lazy(() => import('./pages/pallet/PalletIndex'));

// Agencia Invoice
const AgenciaInvoiceFormulaIndex = React.lazy(() => import('./pages/agenciaInvoice/AgenciaInvoiceFormulaIndex'));
const SucursalInvoiceIndex = React.lazy(() => import('./pages/agenciaInvoice/SucursalInvoiceIndex'));
const SucursalInvoiceCreate = React.lazy(() => import('./pages/agenciaInvoice/SucursalInvoiceCreate'));
const SucursalInvoiceDetail = React.lazy(() => import('./pages/agenciaInvoice/SucursalInvoiceDetail'));

// MasterBL
const TranscargoMasterBLIndex = React.lazy(() => import('./pages/masterbl/TranscargoMasterBLIndex'));
const TranscargoMasterBLForm = React.lazy(() => import('./pages/masterbl/TranscargoMasterBLForm'));
const PalcoMasterBLIndex = React.lazy(() => import('./pages/masterbl/PalcoMasterBLIndex'));
const PalcoMasterBLForm = React.lazy(() => import('./pages/masterbl/PalcoMasterBLForm'));
const TranscargoAereoMasterBLIndex = React.lazy(() => import('./pages/masterbl/TranscargoAereoMasterBLIndex'));
const TranscargoAereoMasterBLForm = React.lazy(() => import('./pages/masterbl/TranscargoAereoMasterBLForm'));
const AereoMasterBLIndex = React.lazy(() => import('./pages/masterbl/AereoMasterBLIndex'));
const AereoMasterBLForm = React.lazy(() => import('./pages/masterbl/AereoMasterBLForm'));
const CubaPackMasterBLIndex = React.lazy(() => import('./pages/masterbl/CubaPackMasterBLIndex'));
const CubaPackMasterBLForm = React.lazy(() => import('./pages/masterbl/CubaPackMasterBLForm'));
const CubaPostMasterBLIndex = React.lazy(() => import('./pages/masterbl/CubaPostMasterBLIndex'));
const CubaPostMasterBLForm = React.lazy(() => import('./pages/masterbl/CubaPostMasterBLForm'));
const MasterBLTemplateIndex = React.lazy(() => import('./pages/masterbl/MasterBLTemplateIndex'));
const MasterBLPrintPage = React.lazy(() => import('./pages/masterbl/MasterBLPrintPage'));
const MasterBLTemplateForm = React.lazy(() => import('./pages/masterbl/MasterBLTemplateForm'));

function ProtectedLayout({ children }) {
  return (
    <PrivateRoute>
      <MainLayout>{children}</MainLayout>
    </PrivateRoute>
  );
}

function Forbidden() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2 style={{ color: '#d32f2f' }}>Acceso Denegado</h2>
      <p>No tiene permisos para acceder a esta página.</p>
    </div>
  );
}

export default function App() {
  return (
    <LazyErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/rastreo" element={<PublicTracking />} />
        <Route path="/forbidden" element={<ProtectedLayout><Forbidden /></ProtectedLayout>} />

        {/* Home */}
        <Route path="/" element={<ProtectedLayout><Home /></ProtectedLayout>} />

        {/* HBL - Global Search */}
        <Route path="/hbl/search" element={<ProtectedLayout><HblGlobalSearch /></ProtectedLayout>} />

        {/* HBL - Aéreo */}
        <Route path="/hbl/aereo" element={<ProtectedLayout><HblIndex hblType="aereo" /></ProtectedLayout>} />
        <Route path="/hbl/aereo/create" element={<ProtectedLayout><HblCreate hblType="aereo" /></ProtectedLayout>} />
        <Route path="/hbl/aereo/edit/:id" element={<ProtectedLayout><HblEdit hblType="aereo" /></ProtectedLayout>} />
        {/* HBL - Transcargo */}
        <Route path="/hbl/transcargo" element={<ProtectedLayout><HblIndex hblType="transcargo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargo/create" element={<ProtectedLayout><HblCreate hblType="transcargo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargo/edit/:id" element={<ProtectedLayout><HblEdit hblType="transcargo" /></ProtectedLayout>} />

        {/* HBL - Palco */}
        <Route path="/hbl/palco" element={<ProtectedLayout><HblIndex hblType="palco" /></ProtectedLayout>} />
        <Route path="/hbl/palco/create" element={<ProtectedLayout><HblCreate hblType="palco" /></ProtectedLayout>} />
        <Route path="/hbl/palco/edit/:id" element={<ProtectedLayout><HblEdit hblType="palco" /></ProtectedLayout>} />
        {/* HBL - Transcargo Aéreo */}
        <Route path="/hbl/transcargoaereo" element={<ProtectedLayout><HblIndex hblType="transcargoaereo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/create" element={<ProtectedLayout><HblCreate hblType="transcargoaereo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/edit/:id" element={<ProtectedLayout><HblEdit hblType="transcargoaereo" /></ProtectedLayout>} />
        {/* HBL - CubaPack */}
        <Route path="/hbl/cubapack" element={<ProtectedLayout><HblIndex hblType="cubapack" /></ProtectedLayout>} />
        <Route path="/hbl/cubapack/create" element={<ProtectedLayout><HblCreate hblType="cubapack" /></ProtectedLayout>} />
        <Route path="/hbl/cubapack/edit/:id" element={<ProtectedLayout><HblEdit hblType="cubapack" /></ProtectedLayout>} />
        {/* HBL - CubaPost */}
        <Route path="/hbl/cubapost" element={<ProtectedLayout><HblIndex hblType="cubapost" /></ProtectedLayout>} />
        <Route path="/hbl/cubapost/create" element={<ProtectedLayout><HblCreate hblType="cubapost" /></ProtectedLayout>} />
        <Route path="/hbl/cubapost/edit/:id" element={<ProtectedLayout><HblEdit hblType="cubapost" /></ProtectedLayout>} />

        {/* HBL Print — single route covers all carrier types */}
        <Route path="/hbl/:hblType/:id/print" element={<ProtectedLayout><HblPrintPage /></ProtectedLayout>} />

        {/* Despachar - Aéreo */}
        <Route path="/hbl/aereo/contenedor" element={<ProtectedLayout><ContenedorIndex hblType="aereo" /></ProtectedLayout>} />
        <Route path="/hbl/aereo/contenedor/create" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="aereo" /></AdminRoute></ProtectedLayout>} />
        <Route path="/hbl/aereo/contenedor/edit/:id" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="aereo" editMode={true} /></AdminRoute></ProtectedLayout>} />
        {/* Despachar - Palco */}
        <Route path="/hbl/palco/contenedor" element={<ProtectedLayout><ContenedorIndex hblType="palco" /></ProtectedLayout>} />
        <Route path="/hbl/palco/contenedor/create" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="palco" /></AdminRoute></ProtectedLayout>} />
        <Route path="/hbl/palco/contenedor/edit/:id" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="palco" editMode={true} /></AdminRoute></ProtectedLayout>} />
        {/* Despachar - Transcargo */}
        <Route path="/hbl/transcargo/contenedor" element={<ProtectedLayout><ContenedorIndex hblType="transcargo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargo/contenedor/create" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="transcargo" /></AdminRoute></ProtectedLayout>} />
        <Route path="/hbl/transcargo/contenedor/edit/:id" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="transcargo" editMode={true} /></AdminRoute></ProtectedLayout>} />
        {/* Despachar - Transcargo Aéreo */}
        <Route path="/hbl/transcargoaereo/contenedor" element={<ProtectedLayout><ContenedorIndex hblType="transcargoaereo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/contenedor/create" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="transcargoaereo" /></AdminRoute></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/contenedor/edit/:id" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="transcargoaereo" editMode={true} /></AdminRoute></ProtectedLayout>} />
        {/* Despachar - CubaPack */}
        <Route path="/hbl/cubapack/contenedor" element={<ProtectedLayout><ContenedorIndex hblType="cubapack" /></ProtectedLayout>} />
        <Route path="/hbl/cubapack/contenedor/create" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="cubapack" /></AdminRoute></ProtectedLayout>} />
        <Route path="/hbl/cubapack/contenedor/edit/:id" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="cubapack" editMode={true} /></AdminRoute></ProtectedLayout>} />
        {/* Despachar - CubaPost */}
        <Route path="/hbl/cubapost/contenedor" element={<ProtectedLayout><ContenedorIndex hblType="cubapost" /></ProtectedLayout>} />
        <Route path="/hbl/cubapost/contenedor/create" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="cubapost" /></AdminRoute></ProtectedLayout>} />
        <Route path="/hbl/cubapost/contenedor/edit/:id" element={<ProtectedLayout><AdminRoute><ContenedorCreate hblType="cubapost" editMode={true} /></AdminRoute></ProtectedLayout>} />

        {/* Pallets */}
        <Route path="/hbl/aereo/pallet" element={<ProtectedLayout><PalletIndex hblType="aereo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargo/pallet" element={<ProtectedLayout><PalletIndex hblType="transcargo" /></ProtectedLayout>} />
        <Route path="/hbl/palco/pallet" element={<ProtectedLayout><PalletIndex hblType="palco" /></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/pallet" element={<ProtectedLayout><PalletIndex hblType="transcargoaereo" /></ProtectedLayout>} />
        <Route path="/hbl/cubapack/pallet" element={<ProtectedLayout><PalletIndex hblType="cubapack" /></ProtectedLayout>} />
        <Route path="/hbl/cubapost/pallet" element={<ProtectedLayout><PalletIndex hblType="cubapost" /></ProtectedLayout>} />

        {/* Sucursal Invoices */}
        <Route path="/hbl/aereo/sucursal-invoice" element={<ProtectedLayout><SucursalInvoiceIndex hblType="aereo" /></ProtectedLayout>} />
        <Route path="/hbl/aereo/sucursal-invoice/create" element={<ProtectedLayout><SucursalInvoiceCreate hblType="aereo" /></ProtectedLayout>} />
        <Route path="/hbl/aereo/sucursal-invoice/:id" element={<ProtectedLayout><SucursalInvoiceDetail hblType="aereo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargo/sucursal-invoice" element={<ProtectedLayout><SucursalInvoiceIndex hblType="transcargo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargo/sucursal-invoice/create" element={<ProtectedLayout><SucursalInvoiceCreate hblType="transcargo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargo/sucursal-invoice/:id" element={<ProtectedLayout><SucursalInvoiceDetail hblType="transcargo" /></ProtectedLayout>} />
        <Route path="/hbl/palco/sucursal-invoice" element={<ProtectedLayout><SucursalInvoiceIndex hblType="palco" /></ProtectedLayout>} />
        <Route path="/hbl/palco/sucursal-invoice/create" element={<ProtectedLayout><SucursalInvoiceCreate hblType="palco" /></ProtectedLayout>} />
        <Route path="/hbl/palco/sucursal-invoice/:id" element={<ProtectedLayout><SucursalInvoiceDetail hblType="palco" /></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/sucursal-invoice" element={<ProtectedLayout><SucursalInvoiceIndex hblType="transcargoaereo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/sucursal-invoice/create" element={<ProtectedLayout><SucursalInvoiceCreate hblType="transcargoaereo" /></ProtectedLayout>} />
        <Route path="/hbl/transcargoaereo/sucursal-invoice/:id" element={<ProtectedLayout><SucursalInvoiceDetail hblType="transcargoaereo" /></ProtectedLayout>} />
        <Route path="/hbl/cubapack/sucursal-invoice" element={<ProtectedLayout><SucursalInvoiceIndex hblType="cubapack" /></ProtectedLayout>} />
        <Route path="/hbl/cubapack/sucursal-invoice/create" element={<ProtectedLayout><SucursalInvoiceCreate hblType="cubapack" /></ProtectedLayout>} />
        <Route path="/hbl/cubapack/sucursal-invoice/:id" element={<ProtectedLayout><SucursalInvoiceDetail hblType="cubapack" /></ProtectedLayout>} />
        <Route path="/hbl/cubapost/sucursal-invoice" element={<ProtectedLayout><SucursalInvoiceIndex hblType="cubapost" /></ProtectedLayout>} />
        <Route path="/hbl/cubapost/sucursal-invoice/create" element={<ProtectedLayout><SucursalInvoiceCreate hblType="cubapost" /></ProtectedLayout>} />
        <Route path="/hbl/cubapost/sucursal-invoice/:id" element={<ProtectedLayout><SucursalInvoiceDetail hblType="cubapost" /></ProtectedLayout>} />

        {/* Master BL — shared print page */}
        <Route path="/masterbl/:hblType/:id/print" element={<ProtectedLayout><MasterBLPrintPage /></ProtectedLayout>} />

        {/* Master BL - Transcargo */}
        <Route path="/masterbl/transcargo" element={<ProtectedLayout><TranscargoMasterBLIndex /></ProtectedLayout>} />
        <Route path="/masterbl/transcargo/create" element={<ProtectedLayout><TranscargoMasterBLForm /></ProtectedLayout>} />
        <Route path="/masterbl/transcargo/edit/:id" element={<ProtectedLayout><TranscargoMasterBLForm editMode={true} /></ProtectedLayout>} />

        {/* Master BL - Palco */}
        <Route path="/masterbl/palco" element={<ProtectedLayout><PalcoMasterBLIndex /></ProtectedLayout>} />
        <Route path="/masterbl/palco/create" element={<ProtectedLayout><PalcoMasterBLForm /></ProtectedLayout>} />
        <Route path="/masterbl/palco/edit/:id" element={<ProtectedLayout><PalcoMasterBLForm editMode={true} /></ProtectedLayout>} />

        {/* Master BL - Transcargo Aéreo */}
        <Route path="/masterbl/transcargoaereo" element={<ProtectedLayout><TranscargoAereoMasterBLIndex /></ProtectedLayout>} />
        <Route path="/masterbl/transcargoaereo/create" element={<ProtectedLayout><TranscargoAereoMasterBLForm /></ProtectedLayout>} />
        <Route path="/masterbl/transcargoaereo/edit/:id" element={<ProtectedLayout><TranscargoAereoMasterBLForm editMode={true} /></ProtectedLayout>} />

        {/* Master BL - Aéreo */}
        <Route path="/masterbl/aereo" element={<ProtectedLayout><AereoMasterBLIndex /></ProtectedLayout>} />
        <Route path="/masterbl/aereo/create" element={<ProtectedLayout><AereoMasterBLForm /></ProtectedLayout>} />
        <Route path="/masterbl/aereo/edit/:id" element={<ProtectedLayout><AereoMasterBLForm editMode={true} /></ProtectedLayout>} />

        {/* Master BL - CubaPack */}
        <Route path="/masterbl/cubapack" element={<ProtectedLayout><CubaPackMasterBLIndex /></ProtectedLayout>} />
        <Route path="/masterbl/cubapack/create" element={<ProtectedLayout><CubaPackMasterBLForm /></ProtectedLayout>} />
        <Route path="/masterbl/cubapack/edit/:id" element={<ProtectedLayout><CubaPackMasterBLForm editMode={true} /></ProtectedLayout>} />

        {/* Master BL - CubaPost */}
        <Route path="/masterbl/cubapost" element={<ProtectedLayout><CubaPostMasterBLIndex /></ProtectedLayout>} />
        <Route path="/masterbl/cubapost/create" element={<ProtectedLayout><CubaPostMasterBLForm /></ProtectedLayout>} />
        <Route path="/masterbl/cubapost/edit/:id" element={<ProtectedLayout><CubaPostMasterBLForm editMode={true} /></ProtectedLayout>} />

        {/* Master BL Templates */}
        <Route path="/masterbl/template" element={<ProtectedLayout><MasterBLTemplateIndex /></ProtectedLayout>} />
        <Route path="/masterbl/template/create" element={<ProtectedLayout><MasterBLTemplateForm /></ProtectedLayout>} />
        <Route path="/masterbl/template/edit/:id" element={<ProtectedLayout><MasterBLTemplateForm editMode={true} /></ProtectedLayout>} />

        {/* Administration */}
        <Route path="/administration/agencia" element={<ProtectedLayout><AgenciaIndex /></ProtectedLayout>} />
        <Route path="/administration/agencia/create" element={<ProtectedLayout><AdminRoute><AgenciaForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/agencia/edit/:id" element={<ProtectedLayout><AdminRoute><AgenciaForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/producto" element={<ProtectedLayout><AdminRoute><ProductoIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/producto/create" element={<ProtectedLayout><AdminRoute><ProductoForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/producto/edit/:id" element={<ProtectedLayout><AdminRoute><ProductoForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/productoinventory" element={<ProtectedLayout><AdminRoute><ProductoInventoryIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/productoinventory/create" element={<ProtectedLayout><AdminRoute><ProductoInventoryForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/productoinventory/edit/:id" element={<ProtectedLayout><AdminRoute><ProductoInventoryForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/usuario" element={<ProtectedLayout><UsuarioIndex /></ProtectedLayout>} />
        <Route path="/administration/usuario/create" element={<ProtectedLayout><UserMgmtRoute><UsuarioForm /></UserMgmtRoute></ProtectedLayout>} />
        <Route path="/administration/usuario/edit/:id" element={<ProtectedLayout><UserMgmtRoute><UsuarioForm /></UserMgmtRoute></ProtectedLayout>} />

        <Route path="/administration/storage" element={<ProtectedLayout><AdminRoute><StorageIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/provincia" element={<ProtectedLayout><AdminRoute><ProvinciaIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/provincia/create" element={<ProtectedLayout><AdminRoute><ProvinciaForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/provincia/edit/:id" element={<ProtectedLayout><AdminRoute><ProvinciaForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/naviera" element={<ProtectedLayout><AdminRoute><NavieraIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/naviera/create" element={<ProtectedLayout><AdminRoute><NavieraForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/naviera/edit/:id" element={<ProtectedLayout><AdminRoute><NavieraForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/promotion" element={<ProtectedLayout><AdminRoute><PromotionIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/promotion/create" element={<ProtectedLayout><AdminRoute><PromotionForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/promotion/edit/:id" element={<ProtectedLayout><AdminRoute><PromotionForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/municipio" element={<ProtectedLayout><AdminRoute><MunicipioIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/municipio/create" element={<ProtectedLayout><AdminRoute><MunicipioForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/municipio/edit/:id" element={<ProtectedLayout><AdminRoute><MunicipioForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/tipoenvio" element={<ProtectedLayout><AdminRoute><TipoEnvioIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/tipoenvio/create" element={<ProtectedLayout><SuperAdminRoute><TipoEnvioForm /></SuperAdminRoute></ProtectedLayout>} />
        <Route path="/administration/tipoenvio/edit/:id" element={<ProtectedLayout><AdminRoute><TipoEnvioForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/sucursal" element={<ProtectedLayout><AdminRoute><SucursalIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/sucursal/create" element={<ProtectedLayout><AdminRoute><SucursalForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/sucursal/edit/:id" element={<ProtectedLayout><AdminRoute><SucursalForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/agenciastock" element={<ProtectedLayout><AdminRoute><AgenciaStockIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/agenciastock/create" element={<ProtectedLayout><AdminRoute><AgenciaStockForm /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/agenciastock/edit/:id" element={<ProtectedLayout><AdminRoute><AgenciaStockForm /></AdminRoute></ProtectedLayout>} />

        <Route path="/administration/generalsetting" element={<ProtectedLayout><AdminRoute><GeneralSettingIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/emailsetting" element={<ProtectedLayout><AdminRoute><EmailSettingIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/smssetting"     element={<ProtectedLayout><AdminRoute><SmsSettingIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/emailtemplate"  element={<ProtectedLayout><AdminRoute><EmailTemplateIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/administration/importcontact"  element={<ProtectedLayout><SuperAdminRoute><ImportContactIndex /></SuperAdminRoute></ProtectedLayout>} />
        <Route path="/administration/webhookkeys"    element={<ProtectedLayout><SuperAdminRoute><WebhookApiKeyIndex /></SuperAdminRoute></ProtectedLayout>} />
        <Route path="/administration/tenants"        element={<ProtectedLayout><SuperAdminRoute><TenantAdminIndex /></SuperAdminRoute></ProtectedLayout>} />

        {/* Sucursal */}
        <Route path="/sucursal/precioenvio" element={<ProtectedLayout><PrecioEnvioIndex /></ProtectedLayout>} />
        <Route path="/sucursal/precioenvio/create" element={<ProtectedLayout><PrecioEnvioForm /></ProtectedLayout>} />
        <Route path="/sucursal/precioenvio/edit/:id" element={<ProtectedLayout><PrecioEnvioForm /></ProtectedLayout>} />
        <Route path="/sucursal/productoprecios" element={<ProtectedLayout><ProductoPreciosIndex /></ProtectedLayout>} />
        <Route path="/sucursal/valorfijo" element={<ProtectedLayout><ValorFijoIndex /></ProtectedLayout>} />
        <Route path="/sucursal/productoinventarioprecio" element={<ProtectedLayout><ProductoInventarioPrecioIndex /></ProtectedLayout>} />
        <Route path="/sucursal/agencia-invoice-formula" element={<ProtectedLayout><AgenciaInvoiceFormulaIndex /></ProtectedLayout>} />

        {/* Inventory */}
        <Route path="/inventory/purchase" element={<ProtectedLayout><NonUserRoute><PurchaseIndex /></NonUserRoute></ProtectedLayout>} />
        <Route path="/inventory/purchase/create" element={<ProtectedLayout><NonUserRoute><PurchaseCreate /></NonUserRoute></ProtectedLayout>} />
        <Route path="/inventory/purchase/edit/:id" element={<ProtectedLayout><NonUserRoute><PurchaseCreate /></NonUserRoute></ProtectedLayout>} />
        <Route path="/inventory/purchase/:id/print" element={<ProtectedLayout><NonUserRoute><PurchasePrintPage /></NonUserRoute></ProtectedLayout>} />
        <Route path="/inventory/order" element={<ProtectedLayout><OrderIndex /></ProtectedLayout>} />
        <Route path="/inventory/order/create" element={<ProtectedLayout><OrderCreate /></ProtectedLayout>} />
        <Route path="/inventory/order/edit/:id" element={<ProtectedLayout><OrderCreate /></ProtectedLayout>} />
        <Route path="/inventory/order/:id/print" element={<ProtectedLayout><OrderPrintPage /></ProtectedLayout>} />

        {/* Service Invoice */}
        <Route path="/serviceinvoice" element={<ProtectedLayout><ServiceInvoiceIndex /></ProtectedLayout>} />
        <Route path="/serviceinvoice/create" element={<ProtectedLayout><ServiceInvoiceCreate /></ProtectedLayout>} />
        <Route path="/serviceinvoice/edit/:id" element={<ProtectedLayout><ServiceInvoiceCreate /></ProtectedLayout>} />
        <Route path="/serviceinvoice/:id/print" element={<ProtectedLayout><ServiceInvoicePrintPage /></ProtectedLayout>} />
        <Route path="/quotation" element={<ProtectedLayout><AdminRoute><QuotationIndex /></AdminRoute></ProtectedLayout>} />
        <Route path="/quotation/create" element={<ProtectedLayout><AdminRoute><QuotationCreate /></AdminRoute></ProtectedLayout>} />
        <Route path="/quotation/edit/:id" element={<ProtectedLayout><AdminRoute><QuotationCreate /></AdminRoute></ProtectedLayout>} />
        <Route path="/quotation/:id/print" element={<ProtectedLayout><AdminRoute><QuotationPrintPage /></AdminRoute></ProtectedLayout>} />

        {/* Reports */}
        <Route path="/reports/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/reports/reporteventa" element={<ProtectedLayout><ReporteVenta /></ProtectedLayout>} />
        <Route path="/reports/resumentranscargo" element={<ProtectedLayout><ResumenTranscargo /></ProtectedLayout>} />
        <Route path="/reports/partner-resumen" element={<ProtectedLayout><PartnerResumen /></ProtectedLayout>} />
        <Route path="/reports/recogida-almacen" element={<ProtectedLayout><RecogidaAlmacen /></ProtectedLayout>} />
        <Route path="/reports/resumen-productos-especiales" element={<ProtectedLayout><ResumenProductosEspeciales /></ProtectedLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </LazyErrorBoundary>
  );
}
