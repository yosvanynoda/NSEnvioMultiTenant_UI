import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Tab, Tabs, Box, TextField, FormControl, InputLabel, Select,
  MenuItem, FormControlLabel, Switch, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton, Tooltip, Chip, Divider, Typography, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY_INFO = {
  childSucursalID: '',
  tipoEnvioID: '',
  defaultPriceMethod: 'weight',
  defaultPricePerUnit: '',
  isActive: true,
  tieneTramosPeso: false,
  pesoLimite: '',
  pesoOperador: '<',
  precioSiMenor: '',
  precioSiMayor: '',
};

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function AgenciaInvoiceFormulaEditDialog({
  open, formulaID, parentSucursalID, onClose, onSaved,
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // activeFormulaID starts as the prop (edit mode) or null (create mode).
  // After create, it's set to the newly created ID so tabs unlock immediately.
  const [activeFormulaID, setActiveFormulaID] = useState(formulaID ?? null);
  const isEdit = !!activeFormulaID;

  const [tab, setTab] = useState(0);
  const [info, setInfo] = useState(EMPTY_INFO);
  const [infoError, setInfoError] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Product override state
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({
    productoID: '', priceMethod: 'weight', pricePerUnit: '',
    tieneTramosPeso: false, pesoLimite: '', pesoOperador: '<', precioSiMenor: '', precioSiMayor: '',
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Region price state
  const [regions, setRegions] = useState([]);
  const [regionForm, setRegionForm] = useState({ region: '', pricePerHBL: '' });
  const [savingRegion, setSavingRegion] = useState(false);
  const [deletingRegionId, setDeletingRegionId] = useState(null);

  // Reset activeFormulaID whenever the dialog opens for a different record
  useEffect(() => {
    setActiveFormulaID(formulaID ?? null);
    setTab(0);
  }, [formulaID, open]);

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['agenciaInvoiceFormulaDetail', activeFormulaID],
    queryFn: async () => {
      const res = await apiClient.get(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}/${activeFormulaID}`);
      return res.data;
    },
    enabled: open && !!activeFormulaID,
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursalDescendants', parentSucursalID],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL_DESCENDANTS(parentSucursalID));
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open && !!parentSucursalID,
  });

  const { data: tiposEnvio = [] } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['producto'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PRODUCTO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open,
  });

  const { data: provincias = [] } = useQuery({
    queryKey: ['provincia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PROVINCIA);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open,
  });

  // Distinct regions from Provincias
  const regionOptions = [...new Set(
    provincias.map((p) => p.region).filter(Boolean)
  )].sort();

  useEffect(() => {
    if (detail && isEdit) {
      setInfo({
        childSucursalID: detail.childSucursalID,
        tipoEnvioID: detail.tipoEnvioID,
        defaultPriceMethod: detail.defaultPriceMethod,
        defaultPricePerUnit: detail.defaultPricePerUnit,
        isActive: detail.isActive,
        tieneTramosPeso: Boolean(detail.pesoLimite),
        pesoLimite: detail.pesoLimite ?? '',
        pesoOperador: detail.pesoOperador ?? '<',
        precioSiMenor: detail.precioSiMenor ?? '',
        precioSiMayor: detail.precioSiMayor ?? '',
      });
      setProducts(detail.products ?? []);
      setRegions(detail.regions ?? []);
    } else if (!isEdit && open) {
      setInfo(EMPTY_INFO);
      setProducts([]);
      setRegions([]);
      setTab(0);
    }
  }, [detail, isEdit, open]);

  // ── Info save ─────────────────────────────────────────────────────────────

  const handleSaveInfo = async () => {
    const needsBasePrice = !info.tieneTramosPeso && info.defaultPricePerUnit === '';
    if (!info.childSucursalID || !info.tipoEnvioID || needsBasePrice) return;
    if (info.tieneTramosPeso && (!info.pesoLimite || info.precioSiMenor === '' || info.precioSiMayor === '')) return;
    setSavingInfo(true);
    setInfoError('');
    try {
      const payload = {
        parentSucursalID,
        childSucursalID: Number(info.childSucursalID),
        tipoEnvioID: Number(info.tipoEnvioID),
        defaultPriceMethod: info.defaultPriceMethod,
        defaultPricePerUnit: info.tieneTramosPeso ? 0 : Number(info.defaultPricePerUnit),
        isActive: info.isActive,
        pesoLimite: info.tieneTramosPeso ? Number(info.pesoLimite) : null,
        pesoOperador: info.tieneTramosPeso ? info.pesoOperador : null,
        precioSiMenor: info.tieneTramosPeso ? Number(info.precioSiMenor) : null,
        precioSiMayor: info.tieneTramosPeso ? Number(info.precioSiMayor) : null,
        createdBy: user.username,
        lastUpdatedBy: user.username,
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}?id=${activeFormulaID}`, payload);
        queryClient.invalidateQueries({ queryKey: ['agenciaInvoiceFormulaDetail', activeFormulaID] });
        onSaved();
      } else {
        const res = await apiClient.post(ENDPOINTS.AGENCIA_INVOICE_FORMULA, payload);
        const newId = typeof res.data === 'number' ? res.data : (res.data?.data ?? res.data?.id);
        setActiveFormulaID(newId);
        setTab(1);  // jump to Products tab
        onSaved();  // refresh the list in the background
      }
    } catch (err) {
      setInfoError(err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Product overrides ─────────────────────────────────────────────────────

  const handleUpsertProduct = async () => {
    const needsBasePrice = !productForm.tieneTramosPeso && productForm.pricePerUnit === '';
    if (!productForm.productoID || needsBasePrice) return;
    if (productForm.tieneTramosPeso && (!productForm.pesoLimite || productForm.precioSiMenor === '' || productForm.precioSiMayor === '')) return;
    setSavingProduct(true);
    try {
      await apiClient.post(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}/${activeFormulaID}/product`, {
        productoID: Number(productForm.productoID),
        priceMethod: productForm.priceMethod,
        pricePerUnit: productForm.tieneTramosPeso ? 0 : Number(productForm.pricePerUnit),
        pesoLimite: productForm.tieneTramosPeso ? Number(productForm.pesoLimite) : null,
        pesoOperador: productForm.tieneTramosPeso ? productForm.pesoOperador : null,
        precioSiMenor: productForm.tieneTramosPeso ? Number(productForm.precioSiMenor) : null,
        precioSiMayor: productForm.tieneTramosPeso ? Number(productForm.precioSiMayor) : null,
      });
      const res = await apiClient.get(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}/${activeFormulaID}`);
      setProducts(res.data.products ?? []);
      setProductForm({
        productoID: '', priceMethod: 'weight', pricePerUnit: '',
        tieneTramosPeso: false, pesoLimite: '', pesoOperador: '<', precioSiMenor: '', precioSiMayor: '',
      });
    } catch (err) {
      // silently show nothing; parent can show snackbar
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productFormulaID) => {
    setDeletingProductId(productFormulaID);
    try {
      await apiClient.delete(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}/product/${productFormulaID}`);
      setProducts((prev) => prev.filter((p) => p.productFormulaID !== productFormulaID));
    } finally {
      setDeletingProductId(null);
    }
  };

  // ── Region prices ─────────────────────────────────────────────────────────

  const handleUpsertRegion = async () => {
    if (!regionForm.region || regionForm.pricePerHBL === '') return;
    setSavingRegion(true);
    try {
      await apiClient.post(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}/${activeFormulaID}/region`, {
        region: regionForm.region,
        pricePerHBL: Number(regionForm.pricePerHBL),
      });
      const res = await apiClient.get(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}/${activeFormulaID}`);
      setRegions(res.data.regions ?? []);
      setRegionForm({ region: '', pricePerHBL: '' });
    } catch (err) {
      // silent
    } finally {
      setSavingRegion(false);
    }
  };

  const handleDeleteRegion = async (regionFormulaID) => {
    setDeletingRegionId(regionFormulaID);
    try {
      await apiClient.delete(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}/region/${regionFormulaID}`);
      setRegions((prev) => prev.filter((r) => r.regionFormulaID !== regionFormulaID));
    } finally {
      setDeletingRegionId(null);
    }
  };

  const usedProductIds = new Set(products.map((p) => p.productoID));
  const usedRegions = new Set(regions.map((r) => r.region));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Fórmula' : 'Nueva Fórmula'}</DialogTitle>
      <DialogContent>
        {loadingDetail ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Información" />
              <Tab label="Productos" disabled={!activeFormulaID} />
              <Tab label="Regiones" disabled={!activeFormulaID} />
            </Tabs>

            {/* ── Info Tab ── */}
            <TabPanel value={tab} index={0}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth required disabled={isEdit}>
                  <InputLabel>Franquicia Hija</InputLabel>
                  <Select
                    value={info.childSucursalID}
                    label="Franquicia Hija"
                    onChange={(e) => setInfo((f) => ({ ...f, childSucursalID: e.target.value }))}
                  >
                    {sucursales.map((s) => (
                      <MenuItem key={s.sucursalID} value={s.sucursalID}>{s.sucursalName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required disabled={isEdit}>
                  <InputLabel>Tipo Envío</InputLabel>
                  <Select
                    value={info.tipoEnvioID}
                    label="Tipo Envío"
                    onChange={(e) => setInfo((f) => ({ ...f, tipoEnvioID: e.target.value }))}
                  >
                    {tiposEnvio.map((t) => (
                      <MenuItem key={t.tipoEnvioID} value={t.tipoEnvioID}>{t.tipoEnvioName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel>Método por Defecto</InputLabel>
                  <Select
                    value={info.defaultPriceMethod}
                    label="Método por Defecto"
                    onChange={(e) => setInfo((f) => ({ ...f, defaultPriceMethod: e.target.value }))}
                  >
                    <MenuItem value="weight">Por Peso ($/lb)</MenuItem>
                    <MenuItem value="quantity">Por Cantidad ($/unidad)</MenuItem>
                  </Select>
                </FormControl>
                {!info.tieneTramosPeso && (
                  <TextField
                    label={info.defaultPriceMethod === 'weight' ? 'Precio por Libra' : 'Precio por Unidad'}
                    type="number"
                    required
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    value={info.defaultPricePerUnit}
                    onChange={(e) => setInfo((f) => ({ ...f, defaultPricePerUnit: e.target.value }))}
                  />
                )}
                <FormControlLabel
                  control={<Switch checked={info.isActive} onChange={(e) => setInfo((f) => ({ ...f, isActive: e.target.checked }))} />}
                  label="Activo"
                />
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={info.tieneTramosPeso}
                      color="warning"
                      onChange={(e) => setInfo((f) => ({ ...f, tieneTramosPeso: e.target.checked }))}
                    />
                  }
                  label="Precio por tramo de peso"
                />
                {info.tieneTramosPeso && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Peso límite"
                        type="number"
                        required
                        sx={{ flex: 1 }}
                        inputProps={{ min: 0.01, step: 0.01 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">lb</InputAdornment> }}
                        value={info.pesoLimite}
                        onChange={(e) => setInfo((f) => ({ ...f, pesoLimite: e.target.value }))}
                      />
                      <FormControl sx={{ minWidth: 160 }} required>
                        <InputLabel>Operador</InputLabel>
                        <Select
                          value={info.pesoOperador}
                          label="Operador"
                          onChange={(e) => setInfo((f) => ({ ...f, pesoOperador: e.target.value }))}
                        >
                          <MenuItem value="<">{'< (menor que)'}</MenuItem>
                          <MenuItem value="<=">{'<= (menor o igual)'}</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Precio según si el peso cumple la condición.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label={`Precio si peso ${info.pesoOperador || '<'} ${info.pesoLimite || '?'} lb`}
                        type="number"
                        required
                        sx={{ flex: 1 }}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        value={info.precioSiMenor}
                        onChange={(e) => setInfo((f) => ({ ...f, precioSiMenor: e.target.value }))}
                      />
                      <TextField
                        label={`Precio si peso > ${info.pesoLimite || '?'} lb`}
                        type="number"
                        required
                        sx={{ flex: 1 }}
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        value={info.precioSiMayor}
                        onChange={(e) => setInfo((f) => ({ ...f, precioSiMayor: e.target.value }))}
                      />
                    </Box>
                  </Box>
                )}
                {infoError && <Alert severity="error">{infoError}</Alert>}
              </Box>
            </TabPanel>

            {/* ── Products Tab ── */}
            <TabPanel value={tab} index={1}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Producto</InputLabel>
                    <Select
                      value={productForm.productoID}
                      label="Producto"
                      onChange={(e) => setProductForm((f) => ({ ...f, productoID: e.target.value }))}
                    >
                      {productos
                        .filter((p) => !usedProductIds.has(p.productoID))
                        .map((p) => (
                          <MenuItem key={p.productoID} value={p.productoID}>{p.productoName}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ width: 140 }} size="small">
                    <InputLabel>Método</InputLabel>
                    <Select
                      value={productForm.priceMethod}
                      label="Método"
                      onChange={(e) => setProductForm((f) => ({ ...f, priceMethod: e.target.value }))}
                    >
                      <MenuItem value="weight">Peso</MenuItem>
                      <MenuItem value="quantity">Cantidad</MenuItem>
                    </Select>
                  </FormControl>
                  {!productForm.tieneTramosPeso && (
                    <TextField
                      label="Precio"
                      type="number"
                      size="small"
                      sx={{ width: 120 }}
                      inputProps={{ min: 0, step: 0.01 }}
                      value={productForm.pricePerUnit}
                      onChange={(e) => setProductForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                    />
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={productForm.tieneTramosPeso}
                        color="warning"
                        onChange={(e) => setProductForm((f) => ({ ...f, tieneTramosPeso: e.target.checked }))}
                      />
                    }
                    label="Por tramo"
                    sx={{ ml: 0.5 }}
                  />
                </Box>
                {productForm.tieneTramosPeso && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap', pl: 1 }}>
                    <TextField
                      label="Peso límite"
                      type="number"
                      size="small"
                      sx={{ width: 110 }}
                      inputProps={{ min: 0.01, step: 0.01 }}
                      InputProps={{ endAdornment: <InputAdornment position="end">lb</InputAdornment> }}
                      value={productForm.pesoLimite}
                      onChange={(e) => setProductForm((f) => ({ ...f, pesoLimite: e.target.value }))}
                    />
                    <FormControl sx={{ width: 130 }} size="small">
                      <InputLabel>Operador</InputLabel>
                      <Select
                        value={productForm.pesoOperador}
                        label="Operador"
                        onChange={(e) => setProductForm((f) => ({ ...f, pesoOperador: e.target.value }))}
                      >
                        <MenuItem value="<">{'<'}</MenuItem>
                        <MenuItem value="<=">{'<='}</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label={`$ si ${productForm.pesoOperador}${productForm.pesoLimite || '?'}lb`}
                      type="number"
                      size="small"
                      sx={{ width: 130 }}
                      inputProps={{ min: 0, step: 0.01 }}
                      value={productForm.precioSiMenor}
                      onChange={(e) => setProductForm((f) => ({ ...f, precioSiMenor: e.target.value }))}
                    />
                    <TextField
                      label={`$ si >${productForm.pesoLimite || '?'}lb`}
                      type="number"
                      size="small"
                      sx={{ width: 130 }}
                      inputProps={{ min: 0, step: 0.01 }}
                      value={productForm.precioSiMayor}
                      onChange={(e) => setProductForm((f) => ({ ...f, precioSiMayor: e.target.value }))}
                    />
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={savingProduct ? <CircularProgress size={16} /> : <SaveIcon />}
                    onClick={handleUpsertProduct}
                    disabled={!productForm.productoID || savingProduct}
                  >
                    Guardar
                  </Button>
                </Box>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell>Método</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell width={60} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">Sin excepciones por producto</TableCell>
                      </TableRow>
                    ) : products.map((p) => (
                      <TableRow key={p.productFormulaID}>
                        <TableCell>{p.productoName}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip label={p.priceMethod === 'weight' ? 'Peso' : 'Cantidad'} size="small" variant="outlined" />
                            {p.pesoLimite && (
                              <Tooltip title={`${p.pesoOperador || '<'} ${p.pesoLimite} lb: $${Number(p.precioSiMenor).toFixed(2)} / > ${p.pesoLimite} lb: $${Number(p.precioSiMayor).toFixed(2)}`}>
                                <Chip label="Tramo" size="small" color="warning" variant="outlined" />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {p.pesoLimite
                            ? <Typography variant="body2" color="warning.main">{`$${Number(p.precioSiMenor).toFixed(2)} / $${Number(p.precioSiMayor).toFixed(2)}`}</Typography>
                            : `$${Number(p.pricePerUnit).toFixed(2)}`
                          }
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              color="error"
                              disabled={deletingProductId === p.productFormulaID}
                              onClick={() => handleDeleteProduct(p.productFormulaID)}
                            >
                              {deletingProductId === p.productFormulaID
                                ? <CircularProgress size={16} />
                                : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* ── Regions Tab ── */}
            <TabPanel value={tab} index={2}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-end' }}>
                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel>Región</InputLabel>
                  <Select
                    value={regionForm.region}
                    label="Región"
                    onChange={(e) => setRegionForm((f) => ({ ...f, region: e.target.value }))}
                  >
                    {regionOptions
                      .filter((r) => !usedRegions.has(r))
                      .map((r) => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Precio por Bulto"
                  type="number"
                  size="small"
                  sx={{ width: 140 }}
                  inputProps={{ min: 0, step: 0.01 }}
                  value={regionForm.pricePerHBL}
                  onChange={(e) => setRegionForm((f) => ({ ...f, pricePerHBL: e.target.value }))}
                />
                <Button
                  variant="contained"
                  startIcon={savingRegion ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleUpsertRegion}
                  disabled={!regionForm.region || regionForm.pricePerHBL === '' || savingRegion}
                >
                  Guardar
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Región</TableCell>
                      <TableCell align="right">Precio / Bulto</TableCell>
                      <TableCell width={60} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {regions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">Sin precios por región</TableCell>
                      </TableRow>
                    ) : regions.map((r) => (
                      <TableRow key={r.regionFormulaID}>
                        <TableCell>{r.region}</TableCell>
                        <TableCell align="right">${Number(r.pricePerHBL).toFixed(2)}</TableCell>
                        <TableCell>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              color="error"
                              disabled={deletingRegionId === r.regionFormulaID}
                              onClick={() => handleDeleteRegion(r.regionFormulaID)}
                            >
                              {deletingRegionId === r.regionFormulaID
                                ? <CircularProgress size={16} />
                                : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        {tab === 0 && (
          <Button
            variant="contained"
            onClick={handleSaveInfo}
            disabled={
              !info.childSucursalID || !info.tipoEnvioID || savingInfo ||
              (!info.tieneTramosPeso && info.defaultPricePerUnit === '') ||
              (info.tieneTramosPeso && (!info.pesoLimite || info.precioSiMenor === '' || info.precioSiMayor === ''))
            }
            startIcon={savingInfo ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {isEdit ? 'Actualizar' : 'Crear'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
