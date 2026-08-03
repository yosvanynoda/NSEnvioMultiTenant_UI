export const ENDPOINTS = {
  AUTH: {
    LOGIN:           'api/v1/Authenticate/login',
    FORGOT_PASSWORD: 'api/v1/Authenticate/forgot-password',
    RESET_PASSWORD:  'api/v1/Authenticate/reset-password',
  },
  TENANT: {
    CONFIG: 'api/v1/Tenant/config',
  },
  AGENCIA: 'api/v1/Agencia',
  AGENCIA_STOCK: 'api/v1/AgenciaStock',
  SUCURSAL: 'api/v1/Sucursal',
  SUCURSAL_ANCESTORS:  (id) => `api/v1/Sucursal/${id}/ancestors`,
  SUCURSAL_DESCENDANTS: (id) => `api/v1/Sucursal/${id}/descendants`,
  DESTINATARIO: 'api/v1/Destinatario',
  DESTINATARIO_ADDRESS: 'api/v1/DestinatarioAddress',
  REMITENTE: 'api/v1/Remitente',
  PRODUCTO: 'api/v1/Producto',
  PRODUCTO_PRECIO_ENVIO: 'api/v1/ProductoPrecioEnvio',
  PRODUCTO_SUCURSAL: 'api/v1/ProductoSucursal',
  PRODUCTO_CARRIER: 'api/v1/ProductoCarrier',
  PRODUCTO_INVENTORY: 'api/v1/ProductoInventory',
  PRODUCTO_INVENTORY_FOR_HBL: (searchText, agenciaId, tipoEnvioId) => {
    const p = new URLSearchParams();
    if (searchText) p.append('searchText', searchText);
    if (agenciaId)  p.append('agenciaId',  agenciaId);
    if (tipoEnvioId) p.append('tipoEnvioId', tipoEnvioId);
    return `api/v1/ProductoInventory/forHbl?${p.toString()}`;
  },
  PRODUCTO_INVENTORY_PRECIO_ENVIO: 'api/v1/ProductoInventoryPrecioEnvio',
  PROVINCIA: 'api/v1/Provincia',
  MUNICIPIO: 'api/v1/Municipio',
  MUNICIPIO_BY_PROVINCIA: (provinciaId) => `api/v1/Municipio/byProvincia/${provinciaId}`,
  TIPO_ENVIO: 'api/v1/TipoEnvio',
  HBL_SEARCH: (q) => `api/v1/HblSearch?q=${encodeURIComponent(q)}`,
  HBL_TRACKING: (q) => `api/v1/HblTracking?q=${encodeURIComponent(q)}`,
  HBL_CANCELLED: 'api/v1/HblCancel',
  HBL_CANCELLED_REVERT: 'api/v1/HblCancel/revert',
  NAVIERA: 'api/v1/Naviera',
  PROMOTION: 'api/v1/Promotion',
  PROMOTION_SET_ACTIVE: (id, isActive) => `api/v1/Promotion/${id}/active?isActive=${isActive}`,
  PROMOTION_RESOLVE_CARRIER: (tipoEnvioId, agenciaId) => `api/v1/Promotion/resolve/carrier?tipoEnvioId=${tipoEnvioId}${agenciaId != null ? `&agenciaId=${agenciaId}` : ''}`,
  PROMOTION_RESOLVE_PRODUCT: (productoId, agenciaId) => `api/v1/Promotion/resolve/product?productoId=${productoId}${agenciaId != null ? `&agenciaId=${agenciaId}` : ''}`,
  PAYMENT_METHOD: 'api/v1/PaymentMethod',
  GENERAL_SETTING: 'api/v1/GeneralSetting',
  EMAIL_SETTING: 'api/v1/EmailSetting',
  EMAIL_TEMPLATE: 'api/v1/EmailTemplate',
  IMPORT_CONTACT: 'api/v1/ImportContact',
  WEBHOOK_API_KEY: 'api/v1/WebhookApiKey',
  TENANT_ADMIN:    'api/v1/TenantAdmin',
  USER: 'api/v1/User',
  USER_ROLES: 'api/v1/User/roles',
  AEREO_HBL: 'api/v1/AereoHBL',
  AEREO_HBL_LABEL_PDF:     (id) => `api/v1/AereoHBL/${id}/label-pdf`,
  AEREO_HBL_FACTURA_PDF:   (id) => `api/v1/AereoHBL/${id}/factura-pdf`,
  AEREO_HBL_GUIAAEREA_PDF: (id) => `api/v1/AereoHBL/${id}/guiaaerea-pdf`,
  TRANSCARGO_HBL: 'api/v1/TranscargoHBL',
  TRANSCARGO_HBL_LABEL_PDF:       (id) => `api/v1/TranscargoHBL/${id}/label-pdf`,
  TRANSCARGO_HBL_FACTURA_PDF:     (id) => `api/v1/TranscargoHBL/${id}/factura-pdf`,
  TRANSCARGO_HBL_BOLETA_PDF:      (id) => `api/v1/TranscargoHBL/${id}/boleta-pdf`,
  TRANSCARGO_HBL_RESUMEN_PDF:     (id) => `api/v1/TranscargoHBL/${id}/resumen-pdf`,
  TRANSCARGO_HBL_INICIALES_PDF:   (id) => `api/v1/TranscargoHBL/${id}/iniciales-pdf`,
  TRANSCARGO_HBL_NUMEROCAJAS_PDF: (id) => `api/v1/TranscargoHBL/${id}/numerocajas-pdf`,
  PALCO_HBL: 'api/v1/PalcoHBL',
  PALCO_HBL_LABEL_PDF:   (id) => `api/v1/PalcoHBL/${id}/label-pdf`,
  PALCO_HBL_FACTURA_PDF: (id) => `api/v1/PalcoHBL/${id}/factura-pdf`,
  CUBA_PACK_HBL: 'api/v1/CubaPackHBL',
  CUBA_PACK_HBL_LABEL_PDF:   (id) => `api/v1/CubaPackHBL/${id}/label-pdf`,
  CUBA_PACK_HBL_FACTURA_PDF: (id) => `api/v1/CubaPackHBL/${id}/factura-pdf`,
  CUBA_POST_HBL: 'api/v1/CubaPostHBL',
  CUBA_POST_HBL_LABEL_PDF:   (id) => `api/v1/CubaPostHBL/${id}/label-pdf`,
  CUBA_POST_HBL_FACTURA_PDF: (id) => `api/v1/CubaPostHBL/${id}/factura-pdf`,
  TRANSCARGO_AEREO_HBL: 'api/v1/TranscargoAereoHBL',
  TRANSCARGO_AEREO_HBL_LABEL_PDF:     (id) => `api/v1/TranscargoAereoHBL/${id}/label-pdf`,
  TRANSCARGO_AEREO_HBL_FACTURA_PDF:   (id) => `api/v1/TranscargoAereoHBL/${id}/factura-pdf`,
  TRANSCARGO_AEREO_HBL_GUIAAEREA_PDF: (id) => `api/v1/TranscargoAereoHBL/${id}/guiaaerea-pdf`,
  AEREO_CONTENEDOR: 'api/v1/AereoContenedor',
  TRANSCARGO_CONTENEDOR: 'api/v1/TranscargoContenedor',
  PALCO_CONTENEDOR: 'api/v1/PalcoContenedor',
  TRANSCARGO_AEREO_CONTENEDOR: 'api/v1/TranscargoAereoContenedor',
  CUBA_PACK_CONTENEDOR: 'api/v1/CubaPackContenedor',
  CUBA_POST_CONTENEDOR: 'api/v1/CubaPostContenedor',
  AEREO_CONTENEDOR_PDF:      (id, doc) => `api/v1/AereoContenedor/${id}/pdf/${doc}`,
  PALCO_CONTENEDOR_PDF:      (id, doc) => `api/v1/PalcoContenedor/${id}/pdf/${doc}`,
  TRANSCARGO_CONTENEDOR_PDF: (id, doc) => `api/v1/TranscargoContenedor/${id}/pdf/${doc}`,
  AEREO_CONTENEDOR_SCAN: (numero) => `api/v1/AereoContenedor/scan?numero=${encodeURIComponent(numero)}`,
  AEREO_CONTENEDOR_HBLS: (id) => `api/v1/AereoContenedor/${id}/hbls`,
  AEREO_CONTENEDOR_ASSIGN: (id) => `api/v1/AereoContenedor/${id}/assign-hbls`,
  PALCO_CONTENEDOR_SCAN: (numero) => `api/v1/PalcoContenedor/scan?numero=${encodeURIComponent(numero)}`,
  PALCO_CONTENEDOR_HBLS: (id) => `api/v1/PalcoContenedor/${id}/hbls`,
  PALCO_CONTENEDOR_ASSIGN: (id) => `api/v1/PalcoContenedor/${id}/assign-hbls`,
  TRANSCARGO_CONTENEDOR_SCAN: (numero) => `api/v1/TranscargoContenedor/scan?numero=${encodeURIComponent(numero)}`,
  TRANSCARGO_CONTENEDOR_HBLS: (id) => `api/v1/TranscargoContenedor/${id}/hbls`,
  TRANSCARGO_CONTENEDOR_ASSIGN: (id) => `api/v1/TranscargoContenedor/${id}/assign-hbls`,
  TRANSCARGO_AEREO_CONTENEDOR_SCAN: (numero) => `api/v1/TranscargoAereoContenedor/scan?numero=${encodeURIComponent(numero)}`,
  TRANSCARGO_AEREO_CONTENEDOR_HBLS: (id) => `api/v1/TranscargoAereoContenedor/${id}/hbls`,
  TRANSCARGO_AEREO_CONTENEDOR_ASSIGN: (id) => `api/v1/TranscargoAereoContenedor/${id}/assign-hbls`,
  CUBA_PACK_CONTENEDOR_SCAN: (numero) => `api/v1/CubaPackContenedor/scan?numero=${encodeURIComponent(numero)}`,
  CUBA_PACK_CONTENEDOR_HBLS: (id) => `api/v1/CubaPackContenedor/${id}/hbls`,
  CUBA_PACK_CONTENEDOR_ASSIGN: (id) => `api/v1/CubaPackContenedor/${id}/assign-hbls`,
  CUBA_POST_CONTENEDOR_SCAN: (numero) => `api/v1/CubaPostContenedor/scan?numero=${encodeURIComponent(numero)}`,
  CUBA_POST_CONTENEDOR_HBLS: (id) => `api/v1/CubaPostContenedor/${id}/hbls`,
  CUBA_POST_CONTENEDOR_ASSIGN: (id) => `api/v1/CubaPostContenedor/${id}/assign-hbls`,
  ORDER: 'api/v1/Order',
  ORDER_PDF: (id) => `api/v1/Order/${id}/print`,
  PURCHASE: 'api/v1/Purchase',
  PURCHASE_PDF: (id) => `api/v1/Purchase/${id}/print`,
  GENERAL_INVOICE:     'api/v1/GeneralInvoice',
  GENERAL_INVOICE_PDF: (id) => `api/v1/GeneralInvoice/${id}/pdf`,
  QUOTATION: 'api/v1/Quotation',
  PAYMENT: 'api/v1/Payment',
  PRECIO_ENVIO: 'api/v1/PrecioEnvio',
  VALOR_FIJO: 'api/v1/ValorFijo',
  GENERAL_HBL: 'api/v1/GeneralHBL',
  EXCEL_WORK: 'api/v1/ExcelWork',
  EXCEL_WORK_RECOGIDA_ALMACEN: (envio, carrier) => `api/v1/ExcelWork/RecogidaAlmacen?envio=${encodeURIComponent(envio)}&carrier=${carrier}`,
  MANIFIESTO_AEREO:            'api/v1/ExcelWork/ManifiestoAereo',
  MANIFIESTO_TRANSCARGO:       'api/v1/ExcelWork/ManifiestoTranscargo',
  MANIFIESTO_AEREO_TRANSCARGO: 'api/v1/ExcelWork/ManifiestoAereoTranscargo',
  MANIFIESTO_PALCO:            'api/v1/ExcelWork/ManifiestoPalco',
  MANIFIESTO_CUBAPACK:         'api/v1/ExcelWork/ManifiestoCubaPack',
  MANIFIESTO_CUBAPACK_TXT:     'api/v1/ExcelWork/ManifiestoCubaPackTxt',
  MANIFIESTO_CUBAPOST:         'api/v1/ExcelWork/ManifiestoCubaPost',
  RESUMEN_PRODUCTOS_ESPECIALES: (envio, carrier) => `api/v1/ResumenProductosEspeciales?envio=${encodeURIComponent(envio)}&carrier=${carrier}`,
  RESUMEN_PRODUCTOS_ESPECIALES_EXPORT: (envio, carrier) => `api/v1/ResumenProductosEspeciales/export?envio=${encodeURIComponent(envio)}&carrier=${carrier}`,
  PARTNER_RESUMEN: (envio, carrier) => `api/v1/PartnerResumen?envio=${encodeURIComponent(envio)}&carrier=${carrier}`,
  TRANSCARGO_HBL_RECOGIDA_ALMACEN: (envio) => `api/v1/TranscargoHBL/recogida-almacen?envio=${encodeURIComponent(envio)}`,
  STORAGE: 'api/v1/Storage',
  CATEGORIA_ADUANAL: 'api/v1/CategoriaAduanal',
  U_MEDIDA: 'api/v1/UMedida',
  DASHBOARD_RESUMEN: 'api/v1/Dashboard/Resumen',
  DASHBOARD_VENTAS_DIARIAS: (desde, hasta) => `api/v1/Dashboard/VentasDiarias?fechaDesde=${desde}&fechaHasta=${hasta}`,
  DASHBOARD_HBL_POR_PROVINCIA: 'api/v1/Dashboard/HblPorProvincia',
  DASHBOARD_HBL_POR_TIPO: 'api/v1/Dashboard/HblPorTipo',
  DASHBOARD_HBL_POR_ESTADO_PAGO: 'api/v1/Dashboard/HblPorEstadoPago',
  DASHBOARD_RESUMEN_SERVICIOS: 'api/v1/Dashboard/ResumenServicios',
  DASHBOARD_VENTAS_SERVICIOS_DIARIAS: (desde, hasta) => `api/v1/Dashboard/VentasServiciosDiarias?fechaDesde=${desde}&fechaHasta=${hasta}`,
  DASHBOARD_INVENTORY_STATUS: 'api/v1/Dashboard/InventoryStatus',
  DASHBOARD_TOP_PRODUCTOS: 'api/v1/Dashboard/TopProductos',
  DASHBOARD_TOP_CLIENTES_HBL: 'api/v1/Dashboard/TopClientesHbl',
  DASHBOARD_DURACION_ENTREGA: 'api/v1/Dashboard/DuracionEntrega',
  DASHBOARD_OLDEST_HBLS: 'api/v1/Dashboard/OldestHbls',
  TRANSCARGO_MASTER_BL: 'api/v1/TranscargoMasterBL',
  TRANSCARGO_MASTER_BL_PDF: (id) => `api/v1/TranscargoMasterBL/${id}/pdf`,
  PALCO_MASTER_BL: 'api/v1/PalcoMasterBL',
  PALCO_MASTER_BL_PDF: (id) => `api/v1/PalcoMasterBL/${id}/pdf`,
  TRANSCARGO_AEREO_MASTER_BL: 'api/v1/TranscargoAereoMasterBL',
  TRANSCARGO_AEREO_MASTER_BL_PDF: (id) => `api/v1/TranscargoAereoMasterBL/${id}/pdf`,
  AEREO_MASTER_BL: 'api/v1/AereoMasterBL',
  AEREO_MASTER_BL_PDF: (id) => `api/v1/AereoMasterBL/${id}/pdf`,
  CUBAPACK_MASTER_BL: 'api/v1/CubaPackMasterBL',
  CUBAPACK_MASTER_BL_PDF: (id) => `api/v1/CubaPackMasterBL/${id}/pdf`,
  CUBAPOST_MASTER_BL: 'api/v1/CubaPostMasterBL',
  CUBAPOST_MASTER_BL_PDF: (id) => `api/v1/CubaPostMasterBL/${id}/pdf`,
  MASTER_BL_TEMPLATE: 'api/v1/MasterBLTemplate',
  AGENCIA_INVOICE_FORMULA: 'api/v1/AgenciaInvoiceFormula',
  SUCURSAL_INVOICE: 'api/v1/SucursalInvoice',
  SALES_REPORT: 'api/v1/GeneralReport/sales-report',
};

export const HBL_ENDPOINT_MAP = {
  aereo: ENDPOINTS.AEREO_HBL,
  transcargo: ENDPOINTS.TRANSCARGO_HBL,
  palco: ENDPOINTS.PALCO_HBL,
  cubapack: ENDPOINTS.CUBA_PACK_HBL,
  cubapost: ENDPOINTS.CUBA_POST_HBL,
  transcargoaereo: ENDPOINTS.TRANSCARGO_AEREO_HBL,
};

export const HBL_READY_TO_CANCEL = (hblType, id) => `${HBL_ENDPOINT_MAP[hblType]}/${id}/ready-to-cancel`;

export const CONTENEDOR_ENDPOINT_MAP = {
  aereo: ENDPOINTS.AEREO_CONTENEDOR,
  transcargo: ENDPOINTS.TRANSCARGO_CONTENEDOR,
  palco: ENDPOINTS.PALCO_CONTENEDOR,
  transcargoaereo: ENDPOINTS.TRANSCARGO_AEREO_CONTENEDOR,
  cubapack: ENDPOINTS.CUBA_PACK_CONTENEDOR,
  cubapost: ENDPOINTS.CUBA_POST_CONTENEDOR,
};

export const CONTENEDOR_SCAN_MAP = {
  aereo: ENDPOINTS.AEREO_CONTENEDOR_SCAN,
  palco: ENDPOINTS.PALCO_CONTENEDOR_SCAN,
  transcargo: ENDPOINTS.TRANSCARGO_CONTENEDOR_SCAN,
  transcargoaereo: ENDPOINTS.TRANSCARGO_AEREO_CONTENEDOR_SCAN,
  cubapack: ENDPOINTS.CUBA_PACK_CONTENEDOR_SCAN,
  cubapost: ENDPOINTS.CUBA_POST_CONTENEDOR_SCAN,
};

export const CONTENEDOR_HBLS_MAP = {
  aereo: ENDPOINTS.AEREO_CONTENEDOR_HBLS,
  palco: ENDPOINTS.PALCO_CONTENEDOR_HBLS,
  transcargo: ENDPOINTS.TRANSCARGO_CONTENEDOR_HBLS,
  transcargoaereo: ENDPOINTS.TRANSCARGO_AEREO_CONTENEDOR_HBLS,
  cubapack: ENDPOINTS.CUBA_PACK_CONTENEDOR_HBLS,
  cubapost: ENDPOINTS.CUBA_POST_CONTENEDOR_HBLS,
};

export const CONTENEDOR_ASSIGN_MAP = {
  aereo: ENDPOINTS.AEREO_CONTENEDOR_ASSIGN,
  palco: ENDPOINTS.PALCO_CONTENEDOR_ASSIGN,
  transcargo: ENDPOINTS.TRANSCARGO_CONTENEDOR_ASSIGN,
  transcargoaereo: ENDPOINTS.TRANSCARGO_AEREO_CONTENEDOR_ASSIGN,
  cubapack: ENDPOINTS.CUBA_PACK_CONTENEDOR_ASSIGN,
  cubapost: ENDPOINTS.CUBA_POST_CONTENEDOR_ASSIGN,
};

export const CONTENEDOR_REMOVE_MAP = {
  aereo:           (id) => `api/v1/AereoContenedor/${id}/remove-hbls`,
  palco:           (id) => `api/v1/PalcoContenedor/${id}/remove-hbls`,
  transcargo:      (id) => `api/v1/TranscargoContenedor/${id}/remove-hbls`,
  transcargoaereo: (id) => `api/v1/TranscargoAereoContenedor/${id}/remove-hbls`,
  cubapack:        (id) => `api/v1/CubaPackContenedor/${id}/remove-hbls`,
  cubapost:        (id) => `api/v1/CubaPostContenedor/${id}/remove-hbls`,
};

export const CONTENEDOR_SAVE_ERRORS_MAP = {
  aereo:           (id) => `api/v1/AereoContenedor/${id}/scan-errors`,
  palco:           (id) => `api/v1/PalcoContenedor/${id}/scan-errors`,
  transcargo:      (id) => `api/v1/TranscargoContenedor/${id}/scan-errors`,
  transcargoaereo: (id) => `api/v1/TranscargoAereoContenedor/${id}/scan-errors`,
  cubapack:        (id) => `api/v1/CubaPackContenedor/${id}/scan-errors`,
  cubapost:        (id) => `api/v1/CubaPostContenedor/${id}/scan-errors`,
};

export const CONTENEDOR_ASSIGN_BY_ENVIO_MAP = {
  aereo:           'api/v1/AereoContenedor/assign-hbls-by-envio',
  palco:           'api/v1/PalcoContenedor/assign-hbls-by-envio',
  transcargo:      'api/v1/TranscargoContenedor/assign-hbls-by-envio',
  transcargoaereo: 'api/v1/TranscargoAereoContenedor/assign-hbls-by-envio',
  cubapack:        'api/v1/CubaPackContenedor/assign-hbls-by-envio',
  cubapost:        'api/v1/CubaPostContenedor/assign-hbls-by-envio',
};

export const HBL_PALLET_MAP = {
  aereo:           'api/v1/AereoPallet',
  transcargo:      'api/v1/TranscargoPallet',
  palco:           'api/v1/PalcoPallet',
  cubapack:        'api/v1/CubaPackPallet',
  cubapost:        'api/v1/CubaPostPallet',
  transcargoaereo: 'api/v1/TranscargoAereoPallet',
};

export const PALLET_LABEL_MAP = {
  aereo:           (id) => `api/v1/AereoPallet/${id}/label-pdf`,
  transcargo:      (id) => `api/v1/TranscargoPallet/${id}/label-pdf`,
  palco:           (id) => `api/v1/PalcoPallet/${id}/label-pdf`,
  cubapack:        (id) => `api/v1/CubaPackPallet/${id}/label-pdf`,
  cubapost:        (id) => `api/v1/CubaPostPallet/${id}/label-pdf`,
  transcargoaereo: (id) => `api/v1/TranscargoAereoPallet/${id}/label-pdf`,
};

export const HBL_PALLET_BY_NUMBER_MAP = {
  aereo:           (n) => `api/v1/AereoPallet/byNumber/${n}`,
  transcargo:      (n) => `api/v1/TranscargoPallet/byNumber/${n}`,
  palco:           (n) => `api/v1/PalcoPallet/byNumber/${n}`,
  cubapack:        (n) => `api/v1/CubaPackPallet/byNumber/${n}`,
  cubapost:        (n) => `api/v1/CubaPostPallet/byNumber/${n}`,
  transcargoaereo: (n) => `api/v1/TranscargoAereoPallet/byNumber/${n}`,
};

// Doc types supported by each carrier's bulk-print (and single-print) endpoint.
// Mirrors the _docTypeMap in each HBL controller.
export const HBL_DOC_TYPES = {
  aereo:           ['label', 'factura', 'guiaaerea'],
  transcargo:      ['label', 'factura', 'boleta', 'resumen', 'iniciales', 'numerocajas'],
  transcargoaereo: ['label', 'factura', 'guiaaerea'],
  palco:           ['label', 'factura'],
  cubapack:        ['label', 'factura'],
  cubapost:        ['label', 'factura'],
};

export const HBL_BULK_PRINT_MAP = {
  aereo:           'api/v1/AereoHBL/bulk-print',
  transcargo:      'api/v1/TranscargoHBL/bulk-print',
  palco:           'api/v1/PalcoHBL/bulk-print',
  cubapack:        'api/v1/CubaPackHBL/bulk-print',
  cubapost:        'api/v1/CubaPostHBL/bulk-print',
  transcargoaereo: 'api/v1/TranscargoAereoHBL/bulk-print',
};

export const HBL_BULK_PALLET_MAP = {
  aereo:           'api/v1/AereoHBL/bulk-pallet',
  transcargo:      'api/v1/TranscargoHBL/bulk-pallet',
  palco:           'api/v1/PalcoHBL/bulk-pallet',
  cubapack:        'api/v1/CubaPackHBL/bulk-pallet',
  cubapost:        'api/v1/CubaPostHBL/bulk-pallet',
  transcargoaereo: 'api/v1/TranscargoAereoHBL/bulk-pallet',
};

export const HBL_BULK_ENVIO_MAP = {
  aereo:           'api/v1/AereoHBL/bulk-envio',
  transcargo:      'api/v1/TranscargoHBL/bulk-envio',
  palco:           'api/v1/PalcoHBL/bulk-envio',
  cubapack:        'api/v1/CubaPackHBL/bulk-envio',
  cubapost:        'api/v1/CubaPostHBL/bulk-envio',
  transcargoaereo: 'api/v1/TranscargoAereoHBL/bulk-envio',
};

export const HBL_BULK_DELETE_MAP = {
  aereo:           'api/v1/AereoHBL/bulk-delete',
  transcargo:      'api/v1/TranscargoHBL/bulk-delete',
  palco:           'api/v1/PalcoHBL/bulk-delete',
  cubapack:        'api/v1/CubaPackHBL/bulk-delete',
  cubapost:        'api/v1/CubaPostHBL/bulk-delete',
  transcargoaereo: 'api/v1/TranscargoAereoHBL/bulk-delete',
};

export const CONTENEDOR_ASSIGN_PALLET_MAP = {
  aereo:           (id) => `api/v1/AereoContenedor/${id}/assign-pallet`,
  palco:           (id) => `api/v1/PalcoContenedor/${id}/assign-pallet`,
  transcargo:      (id) => `api/v1/TranscargoContenedor/${id}/assign-pallet`,
  transcargoaereo: (id) => `api/v1/TranscargoAereoContenedor/${id}/assign-pallet`,
  cubapack:        (id) => `api/v1/CubaPackContenedor/${id}/assign-pallet`,
  cubapost:        (id) => `api/v1/CubaPostContenedor/${id}/assign-pallet`,
};

export const CONTENEDOR_PDF_MAP = {
  aereo:      ENDPOINTS.AEREO_CONTENEDOR_PDF,
  palco:      ENDPOINTS.PALCO_CONTENEDOR_PDF,
  transcargo: ENDPOINTS.TRANSCARGO_CONTENEDOR_PDF,
};

export const HBL_PALLET_HBLS_MAP = {
  aereo:           (id) => `api/v1/AereoPallet/${id}/hbls`,
  transcargo:      (id) => `api/v1/TranscargoPallet/${id}/hbls`,
  palco:           (id) => `api/v1/PalcoPallet/${id}/hbls`,
  cubapack:        (id) => `api/v1/CubaPackPallet/${id}/hbls`,
  cubapost:        (id) => `api/v1/CubaPostPallet/${id}/hbls`,
  transcargoaereo: (id) => `api/v1/TranscargoAereoPallet/${id}/hbls`,
};
