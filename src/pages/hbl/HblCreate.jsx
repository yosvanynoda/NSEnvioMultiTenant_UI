import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Alert,
  Snackbar,
  CircularProgress,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { HBL_ENDPOINT_MAP, ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import RemitenteSection from '../../components/hbl/RemitenteSection';
import DestinatarioSection from '../../components/hbl/DestinatarioSection';
import DestinatarioPicker from '../../components/hbl/DestinatarioPicker';
import TotalesSection from '../../components/hbl/TotalesSection';
import PaymentSection from '../../components/hbl/PaymentSection';
import BultosTable from '../../components/hbl/BultosTable';
import BultoModal from '../../components/hbl/BultoModal';

const CATEGORIAS = [
  { value: 'Duraderos', label: 'Producto' },
];

const HBL_LABELS = {
  aereo: 'Aéreo',
  transcargo: 'Transcargo',
  transcargoAereo: 'Transcargo Aéreo',
  palco: 'Palco',
  cubapack: 'CubaPack',
  cubapost: 'CubaPost',
};

const schema = yup.object({
  agenciaId: yup.number().nullable(),
  fecha: yup.string().default(() => dayjs().format('YYYY-MM-DD')),
  envioNumero: yup.string().default(''),
  nota: yup.string().default(''),
  observacion: yup.string().default(''),
  tipoHbl: yup.string().oneOf(['Envio', 'Ena', 'Menaje']).default('Envio'),
  esJuego: yup.boolean().default(false),
  recogidaAlmacen: yup.boolean().default(false),
  // edit-mode only: preserve generated values on update
  numero: yup.string().default(''),
  numberFormat: yup.string().default(''),
  prefijoBulto: yup.string().default(''),
});

const ventaItemSchema = yup.object({
  productoInventarioId:  yup.number().required().typeError('Requerido'),
  descripcion:           yup.string().required('Requerido'),
  cantidad:              yup.number().min(1).required('Requerido'),
  precioUnitario:        yup.number().min(0).required('Requerido'),
  bultoWeight:           yup.number().min(0).default(0),
  // read-only tracking fields (not validated, set programmatically)
  productoID:            yup.number().nullable().default(null),
  requiereBultoSeparado: yup.boolean().default(false),
  incluyeEnvio:          yup.boolean().default(false),
  isEnDestino:           yup.boolean().default(false),
  tipoProducto:          yup.number().nullable().default(null),
  valorAduanal:          yup.number().default(0),
});

function VentaItemModal({ open, onClose, onSave, editItem, productos, tipoEnvioId, envioActual }) {
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(ventaItemSchema),
    defaultValues: {
      productoInventarioId: '', descripcion: '', cantidad: 1, precioUnitario: 0,
      bultoWeight: 0,
      productoID: null, requiereBultoSeparado: false, incluyeEnvio: false,
      isEnDestino: false, tipoProducto: null, valorAduanal: 0,
    },
  });

  const [productoSearch, setProductoSearch] = useState('');
  const [productoResults, setProductoResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);

  useEffect(() => {
    if (open) {
      setProductoSearch('');
      setProductoResults(null);
      setSearching(false);
      setSelectedProducto(editItem?.productoInventarioId
        ? {
            id: editItem.productoInventarioId,
            name: editItem.descripcion || '',
            requiereBultoSeparado: editItem.requiereBultoSeparado ?? false,
            incluyeEnvio: editItem.incluyeEnvio ?? false,
          }
        : null);
      reset(editItem
        ? {
            productoInventarioId:  editItem.productoInventarioId  || '',
            descripcion:           editItem.descripcion           || '',
            cantidad:              editItem.cantidad              || 1,
            precioUnitario:        editItem.precioUnitario        || 0,
            bultoWeight:           editItem.bultoWeight           ?? 0,
            productoID:            editItem.productoID            ?? null,
            requiereBultoSeparado: editItem.requiereBultoSeparado ?? false,
            incluyeEnvio:          editItem.incluyeEnvio          ?? false,
            isEnDestino:           editItem.isEnDestino           ?? false,
            tipoProducto:          editItem.tipoProducto          ?? null,
            valorAduanal:          editItem.valorAduanal          ?? 0,
          }
        : {
            productoInventarioId: '', descripcion: '', cantidad: 1, precioUnitario: 0,
            bultoWeight: 0,
            productoID: null, requiereBultoSeparado: false, incluyeEnvio: false,
            isEnDestino: false, tipoProducto: null, valorAduanal: 0,
          });
    }
  }, [open, editItem, reset]);

  const runSearch = async () => {
    const q = productoSearch.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await apiClient.get(`${ENDPOINTS.PRODUCTO_INVENTORY}/searchProductoInventory/${encodeURIComponent(q)}`);
      setProductoResults(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setProductoResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectProducto = async (p) => {
    // Use forHbl preloaded list first for aduanal fields; always fetch prices for accuracy
    const full = productos.find(x => x.productoInventoryID === p.productoInventoryID);
    setValue('productoInventarioId', p.productoInventoryID);
    setValue('descripcion',           full?.productoInventoryName ?? p.productoInventoryName ?? '');
    setValue('productoID',            full?.productoID            ?? p.productoID ?? null);
    setValue('requiereBultoSeparado', full?.requiereBultoSeparado ?? p.requiereBultoSeparado ?? false);
    setValue('incluyeEnvio',          full?.incluyeEnvio          ?? p.incluyeEnvio          ?? false);
    setValue('isEnDestino',           full?.isEnDestino           ?? p.isEnDestino           ?? false);
    setValue('tipoProducto',          full?.tipoProducto          ?? 1);
    setValue('valorAduanal',          Number(full?.valorAduanal   ?? 0));
    setValue('bultoWeight',           0);
    setSelectedProducto({
      id: p.productoInventoryID,
      name: full?.productoInventoryName ?? p.productoInventoryName ?? '',
      requiereBultoSeparado: full?.requiereBultoSeparado ?? p.requiereBultoSeparado ?? false,
      incluyeEnvio: full?.incluyeEnvio ?? p.incluyeEnvio ?? false,
    });
    setProductoSearch('');
    setProductoResults(null);
    // Resolve sale price for this tipoEnvio
    if (tipoEnvioId) {
      try {
        const res = await apiClient.get(`${ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO}/byInventory/${p.productoInventoryID}`);
        const precios = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const match = precios.find(x => x.tipoEnvioID === tipoEnvioId && x.isActive !== false);
        setValue('precioUnitario', Number(match?.salePrice ?? 0));
      } catch {
        setValue('precioUnitario', 0);
      }
    } else {
      setValue('precioUnitario', Number(full?.salePrice ?? 0));
    }
  };

  const clearProducto = () => {
    setValue('productoInventarioId', '');
    setValue('descripcion', '');
    setValue('precioUnitario', 0);
    setValue('productoID', null);
    setValue('requiereBultoSeparado', false);
    setValue('isEnDestino', false);
    setValue('tipoProducto', null);
    setValue('valorAduanal', 0);
    setSelectedProducto(null);
    setProductoSearch('');
    setProductoResults(null);
  };

  const onSubmit = (data) => {
    onSave({ ...data, _tempId: editItem?._tempId || Date.now().toString() });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>{editItem ? 'Editar Item' : 'Agregar Item de Inventario'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography variant="caption" color={errors.productoInventarioId ? 'error' : 'text.secondary'} sx={{ mb: 0.5, display: 'block' }}>
                Producto de Inventario *
              </Typography>
              {selectedProducto ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={selectedProducto.name} onDelete={clearProducto} color="primary" variant="outlined" />
                </Box>
              ) : (
                <TextField
                  value={productoSearch}
                  onChange={e => { setProductoSearch(e.target.value); setProductoResults(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                  placeholder="Escriba y presione Enter para buscar..."
                  fullWidth size="small"
                  error={Boolean(errors.productoInventarioId)}
                  helperText={errors.productoInventarioId?.message}
                  slotProps={{ input: { endAdornment: (
                    <InputAdornment position="end">
                      {searching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" color="action" />}
                    </InputAdornment>
                  ) } }}
                />
              )}
              {productoResults !== null && !selectedProducto && (
                <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 180, overflow: 'auto' }}>
                  {productoResults.length === 0
                    ? <Typography variant="body2" sx={{ p: 1.5, color: 'text.secondary' }}>Sin resultados</Typography>
                    : productoResults.map(p => (
                      <MenuItem key={p.productoInventoryID} dense onClick={() => selectProducto(p)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <span>{p.productoInventoryName}</span>
                          {p.requiereBultoSeparado
                            ? <Chip label="Bulto propio" size="small" color="warning" sx={{ ml: 'auto' }} />
                            : <Chip label="Incluido" size="small" sx={{ ml: 'auto' }} />}
                        </Box>
                      </MenuItem>
                    ))
                  }
                </Paper>
              )}
              {/* hidden field to register productoInventarioId with RHF */}
              <Controller name="productoInventarioId" control={control} render={() => null} />
            </Grid>
            <Grid size={12}>
              <Controller name="descripcion" control={control} render={({ field }) => (
                <TextField {...field} label="Descripción *" fullWidth
                  error={Boolean(errors.descripcion)} helperText={errors.descripcion?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="cantidad" control={control} render={({ field }) => (
                <TextField {...field} label="Cantidad *" type="number" fullWidth
                  slotProps={{ htmlInput: { min: 1 } }}
                  error={Boolean(errors.cantidad)} helperText={errors.cantidad?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="precioUnitario" control={control} render={({ field }) => (
                <TextField {...field} label="Precio Unitario *" type="number" fullWidth
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
                  error={Boolean(errors.precioUnitario)} helperText={errors.precioUnitario?.message} />
              )} />
            </Grid>
            {selectedProducto?.requiereBultoSeparado && (
              <Grid size={12}>
                <Controller name="bultoWeight" control={control} render={({ field }) => (
                  <TextField {...field} label="Peso del Bulto (lbs) *" type="number" fullWidth
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">lbs</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
                    helperText={
                      selectedProducto.incluyeEnvio
                        ? 'El envío está incluido en el precio — el peso no genera cargo adicional.'
                        : `Cargo por peso: ${field.value > 0 && envioActual ? `$${(Number(field.value) * Number(envioActual)).toFixed(2)}` : '—'}  (${envioActual ?? '?'} $/lb)`
                    }
                    error={Boolean(errors.bultoWeight)} />
                )} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">Cancelar</Button>
          <Button type="submit" variant="contained">{editItem ? 'Actualizar' : 'Agregar'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function calculateTotals(bultos, overrides = {}, precioPorPeso = false) {
  const subTotal = bultos.reduce((acc, b) => {
    const rate = Number(b.precioUnitario) || 0;
    // In por-peso mode, precio-fijo products use cantidad×rate; others use peso×rate
    if (precioPorPeso && !b.isbyQuantity) {
      return acc + (Number(b.peso) || 0) * rate;
    }
    return acc + (Number(b.cantidad) || 0) * rate;
  }, 0);

  // precioManipulacion is a flat fee per bulto entry (not × cantidad)
  const manipulacionBultos = bultos.reduce(
    (acc, b) => acc + (Number(b.precioManipulacion) || 0),
    0
  );

  const distribucion = Number(overrides.distribucion) || 0;
  const precio = Number(overrides.precio) || 0;
  const manipulacion = manipulacionBultos;
  const descuento = Number(overrides.descuento) || 0;
  const total = subTotal + distribucion + manipulacion - descuento;
  return { subTotal, distribucion, precio, manipulacion, descuento, total };
}

export default function HblCreate({ hblType = 'aereo', editMode = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { tenantConfig } = useTenant();
  const queryClient = useQueryClient();
  const precioPorPeso = tenantConfig?.settings?.precioPorPeso === 'true';
  const endpoint = HBL_ENDPOINT_MAP[hblType];
  const label = HBL_LABELS[hblType] || hblType;

  // ── Agencias ──
  const { data: agencias = [] } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });
  const agenciaName = agencias.find((a) => a.agenciaID === user?.agenciaId)?.agenciaName || '';

  // ── Tipos de Envío (for envioActual label) ──
  const { data: tiposEnvio = [] } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  // ── General settings (for valor aduanal limits) ──
  const { data: generalSetting } = useQuery({
    queryKey: ['general-setting'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.GENERAL_SETTING);
      const d = res.data?.data || res.data;
      return (Array.isArray(d) ? d[0] : d) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── All products filtered by the user's franquicia (pre-loaded once, grouped by tipoProducto) ──
  // hblType also scopes which products keep their ShowInShortcut button on this carrier's
  // page (see ProductoCarrier) -- the product itself stays in the list either way.
  const { data: allProductos = [] } = useQuery({
    queryKey: ['producto-all', user?.sucursalId ?? null, hblType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.sucursalId) params.set('sucursalId', user.sucursalId);
      if (hblType) params.set('hblType', hblType);
      const qs = params.toString();
      const res = await apiClient.get(`${ENDPOINTS.PRODUCTO}${qs ? `?${qs}` : ''}`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const productosByTipo = useMemo(() => {
    const map = {};
    for (const p of allProductos) {
      const tipo = p.tipoProducto;
      if (tipo != null) {
        if (!map[tipo]) map[tipo] = [];
        map[tipo].push(p);
      }
    }
    return map;
  }, [allProductos]);

  const duraderoGenerico = useMemo(
    () => allProductos.find((p) => /gen[eé]rico/i.test(p.productoName || '')) || null,
    [allProductos]
  );

  const shortcutProductos = useMemo(
    () => allProductos.filter((p) => p.showInShortcut),
    [allProductos]
  );

  // Match current hblType to a TipoEnvio record to show envioActual and get its ID
  // norm strips accents so 'Aéreo' matches a DB record stored as 'Aereo'
  const matchedTipoEnvio = useMemo(() => {
    if (!tiposEnvio.length) return null;
    const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const lbl = norm(label);
    const exact = tiposEnvio.find((te) => norm(te.tipoEnvioName) === lbl);
    if (exact) return exact;
    return tiposEnvio.find((te) => {
      const name = norm(te.tipoEnvioName);
      return name.includes(lbl) || lbl.includes(name);
    }) || null;
  }, [tiposEnvio, label]);

  const envioActual = matchedTipoEnvio?.envioActual || null;
  const tipoEnvioId = matchedTipoEnvio?.tipoEnvioID || null;

  // Active carrier promotion overrides the header display, the inventory auto-bulto
  // price, and the VentaItemModal live preview — everywhere the carrier rate is used.
  const [promoEnvioActual, setPromoEnvioActual] = useState(null);
  const [promoEnvioName, setPromoEnvioName] = useState('');

  useEffect(() => {
    setPromoEnvioActual(null);
    setPromoEnvioName('');
    if (!tipoEnvioId) return;
    let cancelled = false;
    apiClient
      .get(ENDPOINTS.PROMOTION_RESOLVE_CARRIER(tipoEnvioId, user?.agenciaId || null))
      .then((res) => {
        if (cancelled) return;
        const promo = res.data?.data ?? res.data;
        if (promo && Number(promo.specialPrice) > 0) {
          setPromoEnvioActual(Number(promo.specialPrice));
          setPromoEnvioName(promo.promotionName || '');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tipoEnvioId, user?.agenciaId]);

  const effectiveEnvioActual = promoEnvioActual != null ? promoEnvioActual : envioActual;

  // ── Inventory products for Venta de Inventario ──
  const { data: inventarioProductos = [] } = useQuery({
    queryKey: ['producto-inventory-hbl', tipoEnvioId, user?.agenciaId],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PRODUCTO_INVENTORY_FOR_HBL(null, user?.agenciaId, tipoEnvioId));
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [remitente, setRemitente] = useState(null);
  const [destinatario, setDestinatario] = useState(null);
  const [destinatarioAddress, setDestinatarioAddress] = useState(null);
  const [stagingPhone, setStagingPhone] = useState(null);
  const [editAddressId, setEditAddressId] = useState(null);
  const [destinatarioPicker, setDestinatarioPicker] = useState({ open: false, options: [] });
  const [autoOpenDestinatarioCreate, setAutoOpenDestinatarioCreate] = useState(false);
  const [bultos, setBultos] = useState([]);
  const [totales, setTotales] = useState({ subTotal: 0, distribucion: 0, precio: 0, manipulacion: 0, descuento: 0, total: 0 });
  const [payments, setPayments] = useState({ efectivo: 0, cheque: 0, credito: 0, debito: 0, transferencia: 0, zeller: 0 });
  const [paymentStatus, setPaymentStatus] = useState(1);
  const [bultoModalOpen, setBultoModalOpen] = useState(false);
  const [editingBulto, setEditingBulto] = useState(null);
  const [editingBultoIndex, setEditingBultoIndex] = useState(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [shortcutProducto, setShortcutProducto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(editMode);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState({});
  const [confirmNoPay, setConfirmNoPay] = useState(false);
  const skipPaymentCheck = useRef(false);

  // ── Venta de Inventario ──
  const [ventaEnabled, setVentaEnabled] = useState(false);
  const [ventaItems, setVentaItems] = useState([]);
  const [ventaModalOpen, setVentaModalOpen] = useState(false);
  const [editVentaItem, setEditVentaItem] = useState(null);
  const [editVentaIndex, setEditVentaIndex] = useState(null);
  const ventaTotal = ventaItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0);

  const handleSaveVentaItem = (itemData) => {
    const isNew = editVentaIndex === null;
    if (!isNew) {
      setVentaItems(prev => prev.map((it, i) => i === editVentaIndex ? itemData : it));
    } else {
      setVentaItems(prev => [...prev, itemData]);
    }

    // Auto-add / update a bulto for items that require their own HBL line
    if (itemData.requiereBultoSeparado && itemData.productoID) {
      // incluyeEnvio = true  → shipping included in inventory price → bulto has no extra charge
      // incluyeEnvio = false → shipping charged by weight → bulto precioUnitario = envioActual ($/lb)
      // (or the active carrier promotion price, when one applies)
      const bultoWeight = Number(itemData.bultoWeight) || 0;
      const bultoPrecio = itemData.incluyeEnvio ? 0 : Number(effectiveEnvioActual) || 0;
      const newBulto = {
        categoria:            'Duraderos',
        productoId:           String(itemData.productoID),
        productoInventarioId: itemData.productoInventarioId,
        descripcionProducto:  itemData.descripcion,
        cantidad:             1,
        peso:                 bultoWeight,
        precioUnitario:       bultoPrecio,
        precioManipulacion:   0,
        valorAduanal:         Number(itemData.valorAduanal) || 0,
        tipoProducto:         itemData.tipoProducto ?? 1,
        isbyQuantity:         false,
        limiteComercial:      0,
        _tempId:              itemData._tempId || Date.now().toString(),
        _fromInventario:      true,
      };
      if (!isNew) {
        // Replace the existing auto-bulto that was created from this venta item
        setBultos(prev => {
          const idx = prev.findIndex(b => b._tempId === itemData._tempId && b._fromInventario);
          if (idx !== -1) return prev.map((b, i) => i === idx ? newBulto : b);
          return [...prev, newBulto];
        });
      } else {
        setBultos(prev => [...prev, newBulto]);
      }
    }

    setEditVentaItem(null);
    setEditVentaIndex(null);
  };

  const { control, handleSubmit, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      agenciaId: null,
      fecha: dayjs().format('YYYY-MM-DD'),
      envioNumero: '',
      nota: '',
      observacion: '',
      tipoHbl: 'Envio',
      esJuego: false,
      recogidaAlmacen: false,
      numero: '',
      numberFormat: '',
      prefijoBulto: '',
    },
  });

  const envioNumero = watch('envioNumero');
  const tipoHbl = watch('tipoHbl');
  const esJuego = watch('esJuego');

  // HBL number creation logic
  // forceUnir: Ena, Menaje, or Envio+Juego → only one HBL number for all bultos
  const forceUnir = tipoHbl !== 'Envio' || Boolean(esJuego);
  const [unirEnUnHbl, setUnirEnUnHbl] = useState(false);
  const effectiveUnir = forceUnir || unirEnUnHbl;
  const hblsToCreate = effectiveUnir ? 1 : bultos.length;

  useEffect(() => {
    if (editMode && id) {
      setLoadingEdit(true);
      apiClient.get(`${endpoint}/${id}`)
        .then(async (res) => {
          const d = res.data?.data || res.data;

          reset({
            agenciaId: d.agenciaID ?? d.agenciaId ?? null,
            fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            envioNumero: d.envioNumero || d.envio || '',
            nota: d.nota || '',
            observacion: d.observacion || d.observation || '',
            tipoHbl: { 1: 'Envio', 2: 'Ena', 3: 'Menaje' }[d.hBLType ?? d.hblType ?? d.tipoHbl] || 'Envio',
            esJuego: d.esJuego ?? d.juego ?? false,
            recogidaAlmacen: d.recogidaAlmacen ?? false,
            numero: d.numero || '',
            numberFormat: d.numberFormat || '',
            prefijoBulto: d.prefijoBulto || '',
          });

          // Fetch full remitente and destinatario records in parallel to get all fields
          const remitenteID = d.remitenteID;
          const destinatarioID = d.destinatarioID;
          const [remRes, destRes] = await Promise.allSettled([
            remitenteID ? apiClient.get(`${ENDPOINTS.REMITENTE}/${remitenteID}`) : Promise.resolve(null),
            destinatarioID ? apiClient.get(`${ENDPOINTS.DESTINATARIO}/${destinatarioID}`) : Promise.resolve(null),
          ]);

          const remitenteFull = remRes.status === 'fulfilled' && remRes.value
            ? (remRes.value.data?.data || remRes.value.data)
            : null;
          const destinatarioFull = destRes.status === 'fulfilled' && destRes.value
            ? (destRes.value.data?.data || destRes.value.data)
            : null;

          setRemitente(remitenteFull || (remitenteID ? {
            remitenteID,
            remitenteName: d.remitenteName || '',
          } : null));

          setDestinatario(destinatarioFull || (destinatarioID ? {
            destinatarioID,
            destinatarioName: d.destinatarioName || '',
          } : null));

          setEditAddressId(d.destinatarioAddressID ?? d.destinatarioAddressId ?? null);

          // API bulto uses `precio` and `description`; UI uses `precioUnitario` and `descripcionProducto`
          setBultos((d.bultos || d.detalle || []).map(b => ({
            ...b,
            precioUnitario: b.precioUnitario ?? b.precio ?? 0,
            descripcionProducto: b.descripcionProducto || b.descripcion || b.description || '',
          })));

          // API returns payments as array [{hBLPaymentName, hBLPaymentAmount}]
          if (d.payments?.length) {
            const pm = {};
            d.payments.forEach(p => {
              const name = (p.hBLPaymentName || p.hblPaymentName || '').toLowerCase();
              if (name) pm[name] = p.hBLPaymentAmount ?? p.hblPaymentAmount ?? 0;
            });
            setPayments(prev => ({ ...prev, ...pm }));
          } else if (d.pagos) {
            setPayments(d.pagos);
          }

          if (d.paymentStatus) setPaymentStatus(d.paymentStatus);
          setTotales(prev => ({
            ...prev,
            distribucion: d.deliveryServicesFee ?? d.distribucion ?? prev.distribucion,
            precio: d.shippingInsurance ?? d.precio ?? prev.precio,
            descuento: d.discount ?? d.descuento ?? prev.descuento,
          }));
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar el HBL', severity: 'error' }))
        .finally(() => setLoadingEdit(false));
    }
  }, [editMode, id, endpoint, reset]);

  useEffect(() => {
    setTotales((prev) => calculateTotals(bultos, prev, precioPorPeso));
  }, [bultos, precioPorPeso]);

  useEffect(() => {
    const paid = Object.values(payments).reduce((acc, v) => acc + (Number(v) || 0), 0);
    if (paid <= 0) setPaymentStatus(1);
    else if (paid >= totales.total - 0.01) setPaymentStatus(3);
    else setPaymentStatus(2);
  }, [totales.total, payments]);

  // Pre-populate Precio from DB when creating a new HBL
  useEffect(() => {
    if (editMode || !tipoEnvioId || !user?.agenciaId) return;
    apiClient
      .get(`${ENDPOINTS.PRECIO_ENVIO}/PrecioxAgencia/${user.agenciaId}/${tipoEnvioId}`)
      .then((res) => {
        const valor = Number(res.data?.data ?? res.data ?? 0) || 0;
        if (valor > 0) {
          setTotales((prev) => ({ ...prev, precio: valor }));
        }
      })
      .catch(() => {});
  }, [editMode, tipoEnvioId, user?.agenciaId]);

  const totalValorAduanal = useMemo(
    () => bultos.reduce((acc, b) => acc + (Number(b.valorAduanal) || 0), 0),
    [bultos]
  );

  const valorAduanalBannerInfo = useMemo(() => {
    if (tipoHbl === 'Menaje') return null;
    const max = tipoHbl === 'Ena'
      ? Number(generalSetting?.valorAduanalMaxEna) || 0
      : Number(generalSetting?.valorAduanalMax) || 0;
    if (max <= 0) return null;
    const pct = totalValorAduanal / max;
    let color, label;
    if (pct > 1) { color = 'error.main'; label = 'Excede el límite'; }
    else if (pct >= 0.8) { color = 'warning.main'; label = 'Cerca del límite'; }
    else { color = 'success.main'; label = 'Dentro del límite'; }
    return { color, label, max };
  }, [tipoHbl, totalValorAduanal, generalSetting]);

  const limiteComercialWarnings = useMemo(() => {
    const groups = {};
    for (const b of bultos) {
      if (b.categoria !== 'Duraderos') continue;
      const pid = String(b.productoId ?? b.productoID ?? '');
      if (!pid) continue;
      const lc = Number(b.limiteComercial) || 0;
      if (lc <= 0) continue;
      if (!groups[pid]) groups[pid] = { nombre: b.descripcionProducto || pid, total: 0, limite: lc };
      groups[pid].total += Number(b.cantidad) || 0;
    }
    return Object.values(groups).filter((g) => g.total > g.limite);
  }, [bultos]);

  const handleTotalesChange = (newTotales) => {
    setTotales(calculateTotals(bultos, newTotales, precioPorPeso));
  };

  const handlePaymentsChange = (newPayments) => {
    setPayments(newPayments);
  };

  const handleAddBulto = (categoria) => {
    setSelectedCategoria(categoria);
    setShortcutProducto(null);
    setEditingBulto(null);
    setEditingBultoIndex(null);
    setBultoModalOpen(true);
    setAddMenuAnchor(null);
  };

  const handleAddShortcut = (producto) => {
    const n = (s) => s?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ?? '';
    const name = n(producto?.productoName);
    let cat = 'Duraderos';
    if (name === 'miscelaneas')                cat = 'Miscelaneas';
    else if (name.includes('medicament'))      cat = 'Medicamentos';
    else if (name.includes('equipo'))         cat = 'EquiposMedicos';
    else if (name === 'medicinas alimentos y aseo') cat = 'MedicinasAlimentosAseo';
    setSelectedCategoria(cat);
    setShortcutProducto(producto);
    setEditingBulto(null);
    setEditingBultoIndex(null);
    setBultoModalOpen(true);
    setAddMenuAnchor(null);
  };

  const handleEditBulto = (bulto, index) => {
    setEditingBulto({ ...bulto, categoria: bulto.categoria || selectedCategoria });
    setEditingBultoIndex(index);
    setBultoModalOpen(true);
  };

  const handleSaveBulto = (bultoData) => {
    if (editingBultoIndex !== null) {
      setBultos((prev) => prev.map((b, i) => (i === editingBultoIndex ? bultoData : b)));
    } else {
      setBultos((prev) => [...prev, { ...bultoData, _tempId: Date.now().toString() }]);
    }
  };

  const handleDeleteBulto = (index) => {
    setBultos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemitenteChange = async (rem) => {
    setRemitente(rem);
    setDestinatario(null);
    setDestinatarioAddress(null);
    if (!rem) return;
    try {
      const res = await apiClient.get(`${ENDPOINTS.DESTINATARIO}/ByRemitente/${rem.remitenteID}`);
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      if (list.length === 1) {
        setDestinatario(list[0]);
      } else if (list.length > 1) {
        setDestinatarioPicker({ open: true, options: list });
      } else {
        setAutoOpenDestinatarioCreate(true);
      }
    } catch {
      setAutoOpenDestinatarioCreate(true);
    }
  };

  const onSubmit = async (formData) => {
    const newErrors = {};
    if (!remitente) newErrors.remitente = 'Seleccione el remitente';
    if (!destinatario) newErrors.destinatario = 'Seleccione el destinatario';
    if (bultos.length === 0) newErrors.bultos = 'Agregue al menos un bulto';
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }
    setFormErrors({});

    // Warn if no payment entered (only for new saves when total > 0)
    if (paymentStatus === 1 && totales.total > 0 && !skipPaymentCheck.current) {
      setConfirmNoPay(true);
      return;
    }
    skipPaymentCheck.current = false;

    setSaving(true);

    const TIPO_HBL_MAP = { Envio: 1, Ena: 2, Menaje: 3 };
    const payload = {
      agenciaId: user?.agenciaId,
      tipoEnvioId,
      fecha: formData.fecha,
      envio: formData.envioNumero,
      nota: formData.nota,
      observation: formData.observacion,
      hblType: TIPO_HBL_MAP[formData.tipoHbl] ?? 1,
      juego: formData.esJuego ?? false,
      recogidaAlmacen: formData.recogidaAlmacen ?? false,
      createdBy: user?.username || '',
      unirBultos: effectiveUnir,
      remitenteId: remitente.remitenteID,
      destinatarioId: destinatario.destinatarioID,
      destinatarioAddressId: destinatarioAddress?.addressID || null,
      numero: formData.numero || '',
      numberFormat: formData.numberFormat || '',
      prefijoBulto: formData.prefijoBulto || '',
      bultos: bultos.map((b, i) => ({
        hblBultoId: b.hBLBultoID ?? b.hblBultoID ?? b.hblBultoId ?? 0,
        productoId: b.productoID ?? b.productoId ?? 0,
        productoInventarioId: b.productoInventarioId || 0,
        bultoNumero: i + 1,
        description: b.descripcionProducto || b.descripcion || b.description || '',
        cantidad: Number(b.cantidad),
        peso: Number(b.peso) || 0,
        precioManipulacion: Number(b.precioManipulacion) || 0,
        precio: Number(b.precioUnitario) || 0,
        valorAduanal: Number(b.valorAduanal) || 0,
        tipoProducto: b.tipoProducto ?? 0,
        lastUpdatedBy: user?.username || '',
      })),
      subTotal: totales.subTotal,
      deliveryServicesFee: totales.distribucion,
      shippingInsurance: totales.precio,
      handlingFee: totales.manipulacion,
      discount: totales.descuento,
      total: totales.total,
      paymentStatus,
      payments: Object.entries(payments)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([name, amount]) => ({ hBLPaymentName: name, hBLPaymentAmount: Number(amount) })),
    };

    try {
      let hblId = editMode ? id : null;
      let hblNumber = editMode ? (formData.numero || '') : '';

      if (editMode && id) {
        await apiClient.put(`${endpoint}?id=${id}`, payload);
      } else {
        const res = await apiClient.post(endpoint, payload);
        hblId = typeof res.data === 'number' ? res.data : (res.data?.data ?? res.data?.id ?? res.data?.hblid ?? res.data?.HBLID);
        // Fetch HBL to get numero for the Order
        if (hblId && ventaEnabled && ventaItems.length > 0) {
          try {
            const hblRes = await apiClient.get(`${endpoint}/${hblId}`);
            hblNumber = (hblRes.data?.data || hblRes.data)?.numero || '';
          } catch { /* ignore */ }
        }
      }

      // Auto-create inventory Order if venta is enabled
      let orderId = null;
      if (ventaEnabled && ventaItems.length > 0) {
        const now = new Date().toISOString();
        const orderPayload = {
          orderNumber:     hblNumber || formData.envioNumero || 'AUTO',
          orderDate:       formData.fecha,
          paymentStatus:   1, // Pendiente
          remitenteID:     remitente?.remitenteID || 0,
          hblNumber:       hblNumber,
          agenciaID:       user?.agenciaId || 0,
          isActive:        true,
          createdBy:       user?.username || '',
          createdDate:     now,
          lastUpdatedBy:   user?.username || '',
          lastUpdatedDate: now,
          details: ventaItems.map(it => ({
            orderDetailID:       0,
            quantity:            Number(it.cantidad),
            salePrice:           Number(it.precioUnitario),
            productoInventoryID: it.productoInventarioId || null,
          })),
        };
        try {
          const orderRes = await apiClient.post(ENDPOINTS.ORDER, orderPayload);
          orderId = typeof orderRes.data === 'number' ? orderRes.data : (orderRes.data?.data ?? orderRes.data?.id ?? orderRes.data?.orderId ?? orderRes.data?.orderID);
        } catch { /* ignore order error — HBL was saved, don't block navigation */ }
      }

      queryClient.invalidateQueries({ queryKey: ['hbl', hblType] });
      setSnackbar({ open: true, message: editMode ? 'HBL actualizado correctamente' : 'HBL creado correctamente', severity: 'success' });
      setTimeout(() => {
        if (hblId) {
          navigate(`/hbl/${hblType}/${hblId}/print`, { state: { orderId } });
        } else {
          navigate(`/hbl/${hblType}`);
        }
      }, 800);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar el HBL', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* ── Header bar ── */}
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={label} color="primary" sx={{ fontWeight: 700, fontSize: '0.85rem' }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, textAlign: 'center' }}>
              {agenciaName || '—'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {effectiveEnvioActual && (
                <Tooltip title={promoEnvioActual != null ? promoEnvioName : ''}>
                  <Typography variant="body2" color={promoEnvioActual != null ? 'success.main' : 'text.secondary'}>
                    Envío Actual: <strong>{effectiveEnvioActual}</strong>{promoEnvioActual != null && ' 🏷'}
                  </Typography>
                </Tooltip>
              )}
              <Typography variant="body2" color="text.secondary">
                {dayjs().format('MM/DD/YYYY')}
              </Typography>
              {envioNumero && (
                <Typography variant="body2">
                  Envío: <strong>{envioNumero}</strong>
                </Typography>
              )}
              <Typography variant="body1" fontWeight={700} color={paymentStatus === 3 ? 'success.main' : 'primary'}>
                {paymentStatus === 3
                  ? `Pagado: $${totales.total.toFixed(2)} — Total a Pagar: $0.00`
                  : `Total a Pagar: $${totales.total.toFixed(2)}`}
              </Typography>
              {editMode && (
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  startIcon={<PrintIcon />}
                  onClick={() => navigate(`/hbl/${hblType}/${id}/print`)}
                  disabled={saving}
                >
                  Imprimir PDF
                </Button>
              )}
              <Controller
                name="recogidaAlmacen"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={Boolean(field.value)} size="small" color="warning" />}
                    label="Recogida Almacén"
                    sx={{ mr: 0 }}
                  />
                )}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(`/hbl/${hblType}`)}
                disabled={saving}
              >
                Regresar
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* ── Valor Aduanal Banner ── */}
        {valorAduanalBannerInfo && totalValorAduanal > 0 && (
          <Box
            sx={{
              mb: 2,
              px: 2,
              py: 0.75,
              bgcolor: valorAduanalBannerInfo.color,
              color: 'white',
              borderRadius: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" fontWeight={700}>
              Valor Aduanal — {valorAduanalBannerInfo.label} (Máx: ${valorAduanalBannerInfo.max.toLocaleString()})
            </Typography>
            <Typography variant="body2" fontWeight={900}>
              ${totalValorAduanal.toFixed(2)}
            </Typography>
          </Box>
        )}

        {/* ── Límite Comercial Banners ── */}
        {limiteComercialWarnings.map((w) => (
          <Box
            key={w.nombre}
            sx={{
              mb: 2,
              px: 2,
              py: 0.75,
              bgcolor: 'warning.main',
              color: 'white',
              borderRadius: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" fontWeight={700}>
              Peligro decomiso — {w.nombre}
            </Typography>
            <Typography variant="body2" fontWeight={900}>
              Total: {w.total} / Límite: {w.limite}
            </Typography>
          </Box>
        ))}

        {/* ── Remitente & Destinatario ── */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RemitenteSection
              value={remitente}
              onChange={handleRemitenteChange}
              onUpdate={setRemitente}
              error={formErrors.remitente}
              onStagingSelected={(phone) => { setStagingPhone(phone); setDestinatario(null); setDestinatarioAddress(null); }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <DestinatarioSection
              value={destinatario}
              onChange={setDestinatario}
              onUpdate={setDestinatario}
              selectedAddress={destinatarioAddress}
              onAddressChange={setDestinatarioAddress}
              error={formErrors.destinatario}
              initialAddressId={editAddressId}
              openCreate={autoOpenDestinatarioCreate}
              onCreateOpened={() => setAutoOpenDestinatarioCreate(false)}
              stagingPhone={stagingPhone}
              onStagingCleared={() => setStagingPhone(null)}
            />
          </Grid>
        </Grid>

        {/* ── Nota & Observación ── */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="nota"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nota (no imprime en la factura)"
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="observacion"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Observación"
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* ── Totales + Pago side by side ── */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <TotalesSection totales={totales} onChange={handleTotalesChange} valorAduanal={totalValorAduanal} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <PaymentSection payments={payments} onChange={handlePaymentsChange} total={totales.total} paymentStatus={paymentStatus} />
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" fontWeight={700} color="primary">Estado de Pago:</Typography>
              <ToggleButtonGroup
                value={paymentStatus}
                exclusive
                onChange={(_, val) => { if (val !== null) setPaymentStatus(val); }}
                size="small"
              >
                <ToggleButton value={1} color="error" sx={{ fontSize: '0.65rem', py: 0.3, px: 1 }}>Pendiente</ToggleButton>
                <ToggleButton value={2} color="warning" sx={{ fontSize: '0.65rem', py: 0.3, px: 1 }}>Parcial</ToggleButton>
                <ToggleButton value={3} color="success" sx={{ fontSize: '0.65rem', py: 0.3, px: 1 }}>Pagado</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>

        {/* ── Bultos ── */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, overflowX: 'auto' }}>
          {/* Controls row: tipo HBL + Juego left, Agregar Bulto right */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Controller
                name="tipoHbl"
                control={control}
                render={({ field }) => (
                  <FormControl component="fieldset">
                    <RadioGroup {...field} row>
                      <FormControlLabel value="Envio" control={<Radio size="small" />} label="Envío" />
                      <FormControlLabel value="Ena" control={<Radio size="small" />} label="Ena" />
                      <FormControlLabel value="Menaje" control={<Radio size="small" />} label="Menaje" />
                    </RadioGroup>
                  </FormControl>
                )}
              />
              {tipoHbl === 'Envio' && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  <Controller
                    name="esJuego"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={Boolean(field.value)} size="small" />}
                        label="Juego"
                      />
                    )}
                  />
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {bultos.length > 0 && (
                <Chip label={`${bultos.length} bulto(s)`} size="small" color="primary" />
              )}
              <Tooltip
                title={
                  forceUnir
                    ? tipoHbl !== 'Envio'
                      ? `${tipoHbl} siempre genera un único número de HBL`
                      : 'Juego siempre genera un único número de HBL'
                    : unirEnUnHbl
                    ? 'Click para asignar un número de HBL por bulto'
                    : 'Click para unir todos los bultos en un único número de HBL'
                }
              >
                <span>
                  <Button
                    size="small"
                    variant={effectiveUnir ? 'contained' : 'outlined'}
                    color="secondary"
                    startIcon={effectiveUnir ? <CallMergeIcon /> : <CallSplitIcon />}
                    disabled={forceUnir}
                    onClick={() => setUnirEnUnHbl((prev) => !prev)}
                    sx={{ minWidth: 110 }}
                  >
                    {hblsToCreate} HBL{hblsToCreate !== 1 ? 's' : ''}
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                size="small"
              >
                Agregar Bulto
              </Button>
            </Box>
          </Box>

          {formErrors.bultos && (
            <Alert severity="error" sx={{ mb: 2 }}>{formErrors.bultos}</Alert>
          )}

          <BultosTable bultos={bultos} onEdit={handleEditBulto} onDelete={handleDeleteBulto} precioPorPeso={precioPorPeso} />
        </Paper>

        {/* ── Venta de Inventario ── */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: ventaEnabled ? 2 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary">Venta de Inventario</Typography>
              {ventaEnabled && ventaItems.length > 0 && <Chip label={ventaItems.length} size="small" color="primary" />}
            </Box>
            <FormControlLabel
              control={<Switch checked={ventaEnabled} onChange={e => setVentaEnabled(e.target.checked)} size="small" />}
              label="Activar"
              sx={{ mr: 0 }}
            />
          </Box>
          {ventaEnabled && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button variant="contained" startIcon={<AddIcon />} size="small"
                  onClick={() => { setEditVentaItem(null); setEditVentaIndex(null); setVentaModalOpen(true); }}>
                  Agregar Item
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
                      <TableCell>#</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="center">Tipo</TableCell>
                      <TableCell align="right">Cant.</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventaItems.length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2, color: 'text.secondary' }}>No hay items. Agregue uno.</TableCell></TableRow>
                    ) : (
                      ventaItems.map((item, i) => (
                        <TableRow key={item._tempId || i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{item.descripcion}</TableCell>
                          <TableCell align="center">
                            {item.requiereBultoSeparado
                              ? <Chip label="Bulto propio" size="small" color="warning" />
                              : <Chip label="Incluido" size="small" color="default" />}
                          </TableCell>
                          <TableCell align="right">{item.cantidad}</TableCell>
                          <TableCell align="right">${Number(item.precioUnitario).toFixed(2)}</TableCell>
                          <TableCell align="right">${(Number(item.cantidad) * Number(item.precioUnitario)).toFixed(2)}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => { setEditVentaItem(item); setEditVentaIndex(i); setVentaModalOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setVentaItems(prev => prev.filter((_, idx) => idx !== i))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {ventaItems.length > 0 && (
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>TOTAL VENTA:</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main', fontSize: '1rem' }}>${ventaTotal.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>

        {/* ── Guardar ── */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 4 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            disabled={saving}
            size="large"
          >
            {saving ? 'Guardando...' : editMode ? 'Actualizar HBL' : 'Guardar'}
          </Button>
        </Box>
      </form>

      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
      >
        {CATEGORIAS.map((cat) => (
          <MenuItem key={cat.value} onClick={() => handleAddBulto(cat.value)}>
            {cat.label}
          </MenuItem>
        ))}
        {shortcutProductos.length > 0 && <Divider />}
        {shortcutProductos.map((prod) => (
          <MenuItem key={prod.productoID} onClick={() => handleAddShortcut(prod)}>
            {prod.productoName}
          </MenuItem>
        ))}
      </Menu>

      <BultoModal
        open={bultoModalOpen}
        onClose={() => { setBultoModalOpen(false); setShortcutProducto(null); }}
        onSave={handleSaveBulto}
        editBulto={editingBulto}
        editingBultoIndex={editingBultoIndex}
        existingBultos={bultos}
        initialCategoria={selectedCategoria}
        initialShortcutProducto={shortcutProducto}
        agenciaId={user?.agenciaId}
        tipoEnvioId={tipoEnvioId}
        sucursalId={user?.sucursalId ?? null}
        productosByTipo={productosByTipo}
        duraderoGenerico={duraderoGenerico}
        isAdmin={isAdmin}
        precioPorPeso={precioPorPeso}
      />

      <DestinatarioPicker
        open={destinatarioPicker.open}
        destinatarios={destinatarioPicker.options}
        onSelect={(d) => {
          setDestinatario(d);
          setDestinatarioAddress(null);
          setEditAddressId(d.addressID ?? null);
          setDestinatarioPicker({ open: false, options: [] });
        }}
        onClose={() => setDestinatarioPicker({ open: false, options: [] })}
      />

      <VentaItemModal
        open={ventaModalOpen}
        onClose={() => setVentaModalOpen(false)}
        onSave={handleSaveVentaItem}
        editItem={editVentaItem}
        productos={inventarioProductos}
        tipoEnvioId={tipoEnvioId}
        envioActual={effectiveEnvioActual}
      />

      {/* ── No-payment confirmation dialog ── */}
      <Dialog open={confirmNoPay} onClose={() => setConfirmNoPay(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚠️ HBL sin pago registrado
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Este HBL no tiene ningún pago registrado y quedará con estado <strong>Pendiente</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ¿Desea guardarlo de todas formas o prefiere agregar un pago antes de continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmNoPay(false)}
            color="primary"
            variant="outlined"
          >
            Agregar pago
          </Button>
          <Button
            onClick={() => {
              setConfirmNoPay(false);
              skipPaymentCheck.current = true;
              handleSubmit(onSubmit)();
            }}
            color="warning"
            variant="contained"
          >
            Guardar sin pago
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
