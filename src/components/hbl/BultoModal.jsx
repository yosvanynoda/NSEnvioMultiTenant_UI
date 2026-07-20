import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Typography,
  Box,
  InputAdornment,
  Chip,
  Tooltip,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BoltIcon from '@mui/icons-material/Bolt';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';

const CATEGORIAS = [
  { value: 'Miscelaneas', label: 'Misceláneas' },
  { value: 'Medicamentos', label: 'Medicamentos' },
  { value: 'EquiposMedicos', label: 'Equipos Médicos' },
  { value: 'MedicinasAlimentosAseo', label: 'Medicinas Alimentos y Aseo' },
  { value: 'Duraderos', label: 'Producto' },
  { value: 'DuraderoGenerico', label: 'Duradero Genérico' },
];

// Simple mode: no description field, no manual product picker
const SIMPLE_MODE_CATEGORIES = ['Miscelaneas', 'Medicamentos', 'EquiposMedicos', 'MedicinasAlimentosAseo'];

const norm = (s) => s?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ?? '';

/** Infers the bulto category from a product's name so shortcut chips save the right type. */
function inferCategoria(producto) {
  const n = norm(producto?.productoName);
  if (n === 'miscelaneas')                return 'Miscelaneas';
  if (n.includes('medicament'))           return 'Medicamentos';
  if (n.includes('equipo'))              return 'EquiposMedicos';
  if (n === 'medicinas alimentos y aseo') return 'MedicinasAlimentosAseo';
  return 'Duraderos';
}

const defaultValues = {
  categoria: '',
  productoInventarioId: '',
  productoId: '',
  descripcionProducto: '',
  cantidad: '',
  peso: '',
  precioUnitario: '',
  precioManipulacion: '',
  valorAduanal: '',
  tipoProducto: null,
};

// Compact styling for numeric fields
const numSx = {
  '& .MuiInputLabel-root': { fontSize: '0.68rem' },
  '& .MuiOutlinedInput-input': { fontSize: '0.78rem' },
  '& .MuiInputAdornment-root p': { fontSize: '0.68rem' },
};

/**
 * Returns the suggested valor aduanal based on the product's rate and pricing mode.
 * Returns '' when no calculation is possible.
 */
function calcValorAduanal(producto, peso, cantidad) {
  if (!producto) return '';
  const rate = Number(producto.valorAduanal) || 0;
  if (!rate) return '';
  return producto.valorAduanalPorPeso
    ? rate * (Number(peso) || 0)
    : rate * (Number(cantidad) || 0);
}

/**
 * Returns the effective unit price given a resolved price row and current peso.
 * When pesoLimite is set, selects precioSiMenor or precioSiMayor based on the operator.
 */
function computeEffectivePrecio(resolved, peso) {
  if (!resolved) return null;
  if (!resolved.pesoLimite) return Number(resolved.precio) > 0 ? Number(resolved.precio) : null;
  const p = Number(peso) || 0;
  const limit = Number(resolved.pesoLimite) || 0;
  const isUnder = resolved.pesoOperador === '<=' ? p <= limit : p < limit;
  return isUnder ? Number(resolved.precioSiMenor) : Number(resolved.precioSiMayor);
}

/** Pre-fills precio, manipulación, and valorAduanal from a product object.
 *  Always seeds valorAduanal with the rate from the DB so the field is never blank;
 *  handleChange will recalculate it once the user enters peso/cantidad. */
function pricesFromProduct(producto) {
  if (!producto) return {};
  const result = {};
  if (Number(producto.precio) > 0) result.precioUnitario = Number(producto.precio);
  if (Number(producto.precioManipulacion) > 0) result.precioManipulacion = Number(producto.precioManipulacion);
  if (Number(producto.valorAduanal) > 0) result.valorAduanal = Number(producto.valorAduanal);
  return result;
}

export default function BultoModal({
  open,
  onClose,
  onSave,
  editBulto = null,
  editingBultoIndex = null,
  existingBultos = [],
  initialCategoria = '',
  initialShortcutProducto = null,
  agenciaId = null,
  tipoEnvioId = null,
  sucursalId = null,
  productosByTipo = {},
  duraderoGenerico = null,
  isAdmin = false,
  precioPorPeso = false,
}) {
  const [values, setValues] = useState(defaultValues);
  const [selectedDuradero, setSelectedDuradero] = useState(null);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resolvedPrecio, setResolvedPrecio] = useState(null);
  const [isShortcutMode, setIsShortcutMode] = useState(false);
  const [isPromoPrice, setIsPromoPrice] = useState(false);
  const [promoName, setPromoName] = useState('');

  const isEdit = Boolean(editBulto);
  const isDuraderos = values.categoria === 'Duraderos';

  // Products marked as shortcuts — derived from all products in productosByTipo
  const shortcutProductos = Object.values(productosByTipo).flat().filter(p => p.showInShortcut);

  const resolvePrice = useCallback((productoId) => {
    if (!tipoEnvioId || !productoId) return;
    setIsPromoPrice(false);
    setPromoName('');

    // Check for an active promotion first — a flat override price that bypasses
    // the normal weight-tier-aware resolve when present.
    apiClient
      .get(ENDPOINTS.PROMOTION_RESOLVE_PRODUCT(productoId, agenciaId || null))
      .then((promoRes) => {
        const promo = promoRes.data?.data ?? promoRes.data;
        if (promo && Number(promo.specialPrice) > 0) {
          setResolvedPrecio(null);
          setIsPromoPrice(true);
          setPromoName(promo.promotionName || '');
          setValues((prev) => ({ ...prev, precioUnitario: Number(promo.specialPrice) }));
          return;
        }

        const sucursalParam = sucursalId ? `&sucursalId=${sucursalId}` : '';
        return apiClient
          .get(`${ENDPOINTS.PRODUCTO_PRECIO_ENVIO}/resolve?productoId=${productoId}&agenciaId=${agenciaId || 0}&tipoEnvioId=${tipoEnvioId}${sucursalParam}`)
          .then((res) => {
            const r = res.data?.data ?? res.data;
            if (r) {
              setResolvedPrecio(r);
              setValues((prev) => {
                const effectivePrice = computeEffectivePrecio(r, prev.peso);
                return {
                  ...prev,
                  ...(effectivePrice !== null && effectivePrice > 0 ? { precioUnitario: effectivePrice } : {}),
                  ...(Number(r.precioManipulacion) > 0 ? { precioManipulacion: Number(r.precioManipulacion) } : {}),
                };
              });
            }
          });
      })
      .catch(() => setResolvedPrecio(null));
  }, [agenciaId, tipoEnvioId, sucursalId]);

  const resolveInventoryPrice = useCallback((inventoryId) => {
    if (!tipoEnvioId || !inventoryId) return;
    const scopeParams = [
      agenciaId  ? `&agenciaId=${agenciaId}`   : '',
      sucursalId ? `&sucursalId=${sucursalId}` : '',
    ].join('');
    apiClient
      .get(`${ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO}/resolve?inventoryId=${inventoryId}&tipoEnvioId=${tipoEnvioId}${scopeParams}`)
      .then((res) => {
        const r = res.data?.data ?? res.data;
        if (r && Number(r.salePrice) > 0) {
          setValues((prev) => ({ ...prev, precioUnitario: Number(r.salePrice) }));
        }
      })
      .catch(() => {});
  }, [tipoEnvioId, agenciaId, sucursalId]);

  // Recompute price when peso changes and weight-tier pricing is active
  useEffect(() => {
    if (!resolvedPrecio?.pesoLimite) return;
    const effectivePrice = computeEffectivePrecio(resolvedPrecio, values.peso);
    if (effectivePrice !== null) {
      setValues((prev) => ({ ...prev, precioUnitario: effectivePrice }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.peso, resolvedPrecio]);

  const applyShortcut = (producto) => {
    setSelectedDuradero(null);
    setSelectedProducto(producto);
    setResolvedPrecio(null);
    setValues(prev => ({
      ...prev,
      categoria: inferCategoria(producto),
      productoId: String(producto.productoID || ''),
      descripcionProducto: producto.productoName || '',
      tipoProducto: producto.tipoProducto ?? 1,
      precioUnitario: '',
      precioManipulacion: '',
      ...pricesFromProduct(producto),
    }));
    resolvePrice(producto.productoID);
  };
  const isDuraderoGenerico = values.categoria === 'DuraderoGenerico';
  const isSimpleMode = SIMPLE_MODE_CATEGORIES.includes(values.categoria);

  useEffect(() => {
    if (open) {
      if (editBulto) {
        setIsShortcutMode(false);
        setValues({
          categoria: editBulto.categoria || '',
          productoInventarioId: editBulto.productoInventarioId || '',
          productoId: editBulto.productoId || '',
          descripcionProducto: editBulto.descripcionProducto || editBulto.descripcion || '',
          cantidad: editBulto.cantidad ?? '',
          peso: editBulto.peso ?? '',
          precioUnitario: editBulto.precioUnitario ?? '',
          precioManipulacion: editBulto.precioManipulacion ?? '',
          valorAduanal: editBulto.valorAduanal ?? '',
          tipoProducto: editBulto.tipoProducto ?? null,
        });

        if (editBulto.categoria === 'Duraderos' && editBulto.productoId) {
          const matchedProd = Object.values(productosByTipo).flat().find(
            (p) => String(p.productoID) === String(editBulto.productoId)
          );
          setSelectedDuradero(matchedProd || null);
          setSelectedProducto(matchedProd || null);
        } else {
          setSelectedDuradero(null);
          const allProds = Object.values(productosByTipo).flat();
          let matchedProd = allProds.find((p) => String(p.productoID) === String(editBulto.productoId));
          if (!matchedProd && editBulto.categoria === 'DuraderoGenerico') matchedProd = duraderoGenerico;
          setSelectedProducto(matchedProd || null);
        }
        if (editBulto.productoInventarioId) {
          resolveInventoryPrice(editBulto.productoInventarioId);
        }
      } else if (initialShortcutProducto) {
        // Opened from menu shortcut \u2014 product pre-selected, no autocomplete search
        setIsShortcutMode(true);
        const newVals = {
          ...defaultValues,
          categoria: inferCategoria(initialShortcutProducto),
          productoId: String(initialShortcutProducto.productoID || ''),
          descripcionProducto: initialShortcutProducto.productoName || '',
          tipoProducto: initialShortcutProducto.tipoProducto ?? 1,
          cantidad: 1,
          ...pricesFromProduct(initialShortcutProducto),
        };
        setValues(newVals);
        setSelectedDuradero(null);
        setSelectedProducto(initialShortcutProducto);

        resolvePrice(initialShortcutProducto.productoID);
      } else {
        setIsShortcutMode(false);
        const newVals = { ...defaultValues, categoria: initialCategoria || '' };
        let selectedProd = null;

        const normalize = (s) =>
          s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';

        if (initialCategoria === 'DuraderoGenerico' && duraderoGenerico) {
          newVals.productoId = String(duraderoGenerico.productoID || '');
          newVals.descripcionProducto = duraderoGenerico.productoName || '';
          newVals.tipoProducto = duraderoGenerico.tipoProducto ?? 1;
          selectedProd = duraderoGenerico;
        } else if (initialCategoria === 'Miscelaneas') {
          const found = Object.values(productosByTipo).flat().find(
            (p) => normalize(p.productoName) === 'miscelaneas'
          );
          if (found) {
            newVals.productoId = String(found.productoID);
            newVals.tipoProducto = found.tipoProducto;
            newVals.descripcionProducto = found.productoName || '';
            selectedProd = found;
          }
        } else if (initialCategoria === 'MedicinasAlimentosAseo') {
          const found = Object.values(productosByTipo).flat().find(
            (p) => normalize(p.productoName) === 'medicinas alimentos y aseo'
          );
          if (found) {
            newVals.productoId = String(found.productoID);
            newVals.tipoProducto = found.tipoProducto;
            newVals.descripcionProducto = found.productoName || '';
            selectedProd = found;
          }
        } else if (initialCategoria === 'Medicamentos' || initialCategoria === 'EquiposMedicos') {
          const allProds = Object.values(productosByTipo).flat();
          const keyword = initialCategoria === 'Medicamentos' ? 'medicamento' : 'equipo';
          const found = allProds.find((p) => normalize(p.productoName).includes(keyword))
            || allProds.find((p) => (productosByTipo[3] || []).includes(p));
          if (found) {
            newVals.productoId = String(found.productoID);
            newVals.tipoProducto = found.tipoProducto;
            newVals.descripcionProducto = found.productoName || '';
            selectedProd = found;
          }
        }

        // Pre-populate prices from the pre-selected product
        if (selectedProd) Object.assign(newVals, pricesFromProduct(selectedProd));
        setValues(newVals);
        setSelectedDuradero(null);
        setSelectedProducto(selectedProd);


        // Resolve specific price for pre-selected product based on agencia + tipoEnvio;
        // fall back to an active carrier promotion, then to generic PrecioXEnvios,
        // only when no product-level pricing exists
        if (selectedProd?.productoID && tipoEnvioId) {
          resolvePrice(selectedProd.productoID);
        } else if (tipoEnvioId) {
          apiClient
            .get(ENDPOINTS.PROMOTION_RESOLVE_CARRIER(tipoEnvioId, agenciaId || null))
            .then((promoRes) => {
              const promo = promoRes.data?.data ?? promoRes.data;
              if (promo && Number(promo.specialPrice) > 0) {
                setIsPromoPrice(true);
                setPromoName(promo.promotionName || '');
                setValues((prev) => ({ ...prev, precioUnitario: Number(promo.specialPrice) }));
                return;
              }
              if (!agenciaId) return;
              return apiClient
                .get(`${ENDPOINTS.PRECIO_ENVIO}/PrecioxAgencia/${agenciaId}/${tipoEnvioId}`)
                .then((res) => {
                  const valor = Number(res.data?.data ?? res.data ?? 0) || 0;
                  if (valor > 0) {
                    setValues((prev) => ({ ...prev, precioUnitario: valor }));
                  }
                });
            })
            .catch(() => {});
        }
      }
      setError('');
      setResolvedPrecio(null);
      setIsPromoPrice(false);
      setPromoName('');
    }
  }, [open, editBulto, initialCategoria, initialShortcutProducto, duraderoGenerico, productosByTipo, agenciaId, tipoEnvioId, resolvePrice]);

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setValues((prev) => {
      const updated = { ...prev, [field]: val };


      // Auto-suggest valor aduanal when peso or cantidad changes
      if ((field === 'peso' || field === 'cantidad') && selectedProducto) {
        const newPeso = field === 'peso' ? val : prev.peso;
        const newCantidad = field === 'cantidad' ? val : prev.cantidad;
        const suggested = calcValorAduanal(selectedProducto, newPeso, newCantidad);
        if (suggested !== '') updated.valorAduanal = suggested;
      }

      return updated;
    });
  };

  const validate = () => {
    if (!isSimpleMode && !values.descripcionProducto.trim()) return 'La descripción es requerida.';
    if (!values.cantidad || Number(values.cantidad) <= 0) return 'La cantidad debe ser mayor a 0.';
    if (values.peso !== '' && Number(values.peso) < 0) return 'El peso no puede ser negativo.';
    if (values.precioUnitario !== '' && Number(values.precioUnitario) < 0) return 'El precio unitario no puede ser negativo.';
    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const isbyQuantity = values.productoInventarioId ? true : esPrecioFijo;

      const bultoData = {
        ...values,
        cantidad: Number(values.cantidad),
        peso: values.peso !== '' ? Number(values.peso) : null,
        precioUnitario: values.precioUnitario !== '' ? Number(values.precioUnitario) : 0,
        precioManipulacion: values.precioManipulacion !== '' ? Number(values.precioManipulacion) : 0,
        valorAduanal: values.valorAduanal !== '' ? Number(values.valorAduanal) : 0,
        tipoProducto: values.tipoProducto ?? null,
        productoId: values.productoId || null,
        isbyQuantity,
        limiteComercial: values.categoria === 'Duraderos' ? (Number(selectedProducto?.limiteComercial) || 0) : 0,
        _tempId: editBulto?._tempId || Date.now().toString(),
      };
      onSave(bultoData);
      onClose();
    } catch {
      setError('Error al guardar el bulto.');
    } finally {
      setSubmitting(false);
    }
  };

  const esPrecioFijo = resolvedPrecio?.esPrecioFijo ?? selectedProducto?.esPrecioFijo ?? false;
  const usesPeso = precioPorPeso && !esPrecioFijo;
  const subtotal = usesPeso
    ? (Number(values.peso) || 0) * (Number(values.precioUnitario) || 0)
    : (Number(values.cantidad) || 0) * (Number(values.precioUnitario) || 0);
  const duraderoOptions = useMemo(() => {
    const seen = new Set();
    return Object.values(productosByTipo).flat().filter(p => {
      if (seen.has(p.productoID)) return false;
      seen.add(p.productoID);
      return true;
    });
  }, [productosByTipo]);
  const categoriaLabel = CATEGORIAS.find((c) => c.value === values.categoria)?.label || values.categoria;

  // Fixed pixel widths for each field so everything fits in one row
  const W = {
    caja: 200, desc: 260, cant: 95, peso: 120, unit: 115, manip: 115, aduana: 120,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false}>
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white', py: 1.5 }}
      >
        {isEdit ? <EditIcon fontSize="small" /> : <AddIcon fontSize="small" />}
        <Typography variant="body1" fontWeight={600} component="span">
          {isEdit ? 'Editar Bulto' : 'Agregar Bulto'}
          {categoriaLabel && (
            <Typography component="span" variant="body2" sx={{ ml: 1, opacity: 0.85 }}>
              — {categoriaLabel}
            </Typography>
          )}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: '24px !important', pb: 2, px: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Shortcut products */}
        {shortcutProductos.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
              <BoltIcon fontSize="small" color="warning" />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                ACCESOS RÁPIDOS
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {shortcutProductos.map(p => (
                <Tooltip key={p.productoID} title={`Precio: $${Number(p.precio || 0).toFixed(2)} · Val. Aduanal: $${Number(p.valorAduanal || 0).toFixed(2)}`} arrow>
                  <Chip
                    label={p.productoName}
                    size="small"
                    clickable
                    color={values.productoId === String(p.productoID) ? 'primary' : 'default'}
                    variant={values.productoId === String(p.productoID) ? 'filled' : 'outlined'}
                    onClick={() => applyShortcut(p)}
                    sx={{ fontWeight: values.productoId === String(p.productoID) ? 700 : 400 }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}

        {/* Duraderos: product search above the row (hidden in shortcut mode — product already chosen) */}
        {isDuraderos && !isShortcutMode && (!isEdit || isAdmin) && (
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              options={duraderoOptions}
              getOptionLabel={(o) => o.productoName || ''}
              value={selectedDuradero}
              onChange={(_, newValue) => {
                setSelectedDuradero(newValue);
                setSelectedProducto(newValue || null);
                setResolvedPrecio(null);
                setValues((prev) => ({
                  ...prev,
                  productoId: newValue ? String(newValue.productoID) : '',
                  ...(isEdit ? {} : {
                    descripcionProducto: newValue?.productoName || prev.descripcionProducto,
                    tipoProducto: newValue?.tipoProducto ?? 1,
                    ...pricesFromProduct(newValue),
                  }),
                }));
                if (newValue?.productoID) resolvePrice(newValue.productoID);
              }}
              isOptionEqualToValue={(o, v) => o.productoID === v.productoID}
              size="small"
              renderInput={(params) => (
                <TextField {...params} label="Buscar Producto *" placeholder="Buscar duradero..." />
              )}
            />
          </Box>
        )}

        {/* Single row: all fields side by side */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>

          {/* Description — Duraderos / DuraderoGenerico */}
          {(isDuraderos || isDuraderoGenerico) && (
            <TextField
              label="Descripción *"
              value={values.descripcionProducto}
              onChange={handleChange('descripcionProducto')}
              size="small"
              required
              sx={{ width: W.desc, ...numSx }}
            />
          )}

          {/* Cantidad */}
          <TextField
            label="Cant."
            type="number"
            value={values.cantidad}
            onChange={handleChange('cantidad')}
            size="small"
            required
            inputProps={{ min: 1, step: 1 }}
            sx={{ width: W.cant, ...numSx }}
          />

          {/* Peso */}
          <TextField
            label="Peso"
            type="number"
            value={values.peso}
            onChange={handleChange('peso')}
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ endAdornment: <InputAdornment position="end">lbs</InputAdornment> }}
            sx={{ width: W.peso, ...numSx }}
          />

          {/* Precio unitario */}
          <TextField
            label={isPromoPrice ? 'P. Unit. 🏷' : 'P. Unit.'}
            type="number"
            value={values.precioUnitario}
            onChange={(e) => { setIsPromoPrice(false); setPromoName(''); handleChange('precioUnitario')(e); }}
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            sx={{ width: W.unit, ...numSx }}
            helperText={isPromoPrice ? (
              <Tooltip title={promoName}><span>Promoción</span></Tooltip>
            ) : undefined}
            FormHelperTextProps={{ sx: { color: 'success.main', fontWeight: 700, fontSize: '0.6rem', m: 0, whiteSpace: 'nowrap' } }}
          />

          {/* Manipulación */}
          <TextField
            label="Manip."
            type="number"
            value={values.precioManipulacion}
            onChange={handleChange('precioManipulacion')}
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            sx={{ width: W.manip, ...numSx }}
          />

          {/* Valor aduanal */}
          <TextField
            label="V. Aduanal"
            type="number"
            value={values.valorAduanal}
            onChange={handleChange('valorAduanal')}
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            sx={{ width: W.aduana, ...numSx }}
          />
        </Box>

        {/* Limite comercial */}
        {selectedProducto && Number(selectedProducto.limiteComercial) > 0 &&
          values.categoria === 'Duraderos' && (() => {
            const limite = Number(selectedProducto.limiteComercial);
            const otherBultosQty = existingBultos.reduce((sum, b, idx) => {
              if (idx === editingBultoIndex) return sum;
              if (String(b.productoId ?? b.productoID) !== String(selectedProducto.productoID)) return sum;
              return sum + (Number(b.cantidad) || 0);
            }, 0);
            const currentQty = Number(values.cantidad) || 0;
            const totalQty = otherBultosQty + currentQty;
            const exceeded = totalQty > limite;
            return (
              <Alert severity={exceeded ? 'warning' : 'info'} sx={{ mt: 1 }}>
                {exceeded
                  ? `Peligro decomiso — Total en este envío (${totalQty}) supera el límite comercial (${limite})`
                  : `Límite comercial: ${limite}${otherBultosQty > 0 ? ` — Ya tiene ${otherBultosQty} en otros bultos de este envío` : ''}`}
              </Alert>
            );
          })()
        }

        {/* Subtotal preview */}
        {subtotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Subtotal:</Typography>
            <Typography variant="body2" color="primary.main" fontWeight={700}>
              ${subtotal.toFixed(2)}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 1.5 }}>
        <Button onClick={onClose} disabled={submitting} variant="outlined" size="small">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          size="small"
          disabled={submitting}
          startIcon={
            submitting ? (
              <CircularProgress size={14} color="inherit" />
            ) : isEdit ? (
              <EditIcon fontSize="small" />
            ) : (
              <AddIcon fontSize="small" />
            )
          }
        >
          {isEdit ? 'Actualizar' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
