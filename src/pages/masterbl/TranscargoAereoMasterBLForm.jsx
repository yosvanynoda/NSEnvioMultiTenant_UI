import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box, Button, TextField, Typography, Paper, Snackbar, Alert,
  CircularProgress, Select, MenuItem, FormControl, InputLabel, Stack,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';

export default function TranscargoAereoMasterBLForm({ editMode = false }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const { register, handleSubmit, reset, getValues, watch } = useForm({
    defaultValues: {
      envio: '', empresaEnvia: '', bookingNumber: '', empresaRecibe: '',
      billOfLading: '', consignee: '', exportReference: '', forwardingAgent: '',
      fmc: '', oceanCarrier: '', buque: '', viaje: '', portLoading: '',
      portUnloading: '', placeDelivery: '', typeOfMove: '', contenedor: '',
      seals: '', refer: '', texto: '', tipoContenedor: '', fecha: '',
      edc: '', numberPk: '', pesoLb: '', pesoKg: '', volumenCbm: '',
      volumenCft: '', placeofReceipt: '',
    },
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['transcargo-aereo-master-bl', id],
    queryFn: async () => {
      const res = await apiClient.get(`${ENDPOINTS.TRANSCARGO_AEREO_MASTER_BL}/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: editMode && Boolean(id),
  });

  useEffect(() => {
    if (existing) {
      reset({
        envio:          existing.envio ?? '',
        empresaEnvia:   existing.empresaEnvia ?? '',
        bookingNumber:  existing.bookingNumber ?? '',
        empresaRecibe:  existing.empresaRecibe ?? '',
        billOfLading:   existing.billOfLading ?? '',
        consignee:      existing.consignee ?? '',
        exportReference: existing.exportReference ?? '',
        forwardingAgent: existing.forwardingAgent ?? '',
        fmc:            existing.fmc ?? '',
        oceanCarrier:   existing.oceanCarrier ?? '',
        buque:          existing.buque ?? '',
        viaje:          existing.viaje ?? '',
        portLoading:    existing.portLoading ?? '',
        portUnloading:  existing.portUnloading ?? '',
        placeDelivery:  existing.placeDelivery ?? '',
        typeOfMove:     existing.typeOfMove ?? '',
        contenedor:     existing.contenedor ?? '',
        seals:          existing.seals ?? '',
        refer:          existing.refer ?? '',
        texto:          existing.texto ?? '',
        tipoContenedor: existing.tipoContenedor ?? '',
        fecha:          existing.fecha ? existing.fecha.substring(0, 10) : '',
        edc:            existing.edc ?? '',
        numberPk:       existing.numberPk ?? '',
        pesoLb:         existing.pesoLb ?? '',
        pesoKg:         existing.pesoKg ?? '',
        volumenCbm:     existing.volumenCbm ?? '',
        volumenCft:     existing.volumenCft ?? '',
        placeofReceipt: existing.placeofReceipt ?? '',
      });
    }
  }, [existing, reset]);

  const { data: templates } = useQuery({
    queryKey: ['masterbl-templates'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.MASTER_BL_TEMPLATE);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    setApplyingTemplate(true);
    try {
      const res = await apiClient.get(`${ENDPOINTS.MASTER_BL_TEMPLATE}/${selectedTemplateId}`);
      const template = res.data?.data ?? res.data;
      if (template?.fields?.length) {
        const updates = {};
        template.fields.forEach((field) => {
          const name = field.fieldName ?? '';
          const formField = name === name.toUpperCase()
            ? name.toLowerCase()
            : name.charAt(0).toLowerCase() + name.slice(1);
          updates[formField] = field.defaultValue ?? '';
        });
        reset({ ...getValues(), ...updates });
      }
    } catch {
      setSnackbar({ open: true, message: 'Error al cargar el template', severity: 'error' });
    } finally {
      setApplyingTemplate(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    const payload = {
      Envio:           data.envio || null,
      EmpresaEnvia:    data.empresaEnvia || null,
      BookingNumber:   data.bookingNumber || null,
      EmpresaRecibe:   data.empresaRecibe || null,
      BillOfLading:    data.billOfLading || null,
      Consignee:       data.consignee || null,
      ExportReference: data.exportReference || null,
      ForwardingAgent: data.forwardingAgent || null,
      FMC:             data.fmc || null,
      OceanCarrier:    data.oceanCarrier || null,
      Buque:           data.buque || null,
      Viaje:           data.viaje || null,
      PortLoading:     data.portLoading || null,
      PortUnloading:   data.portUnloading || null,
      PlaceDelivery:   data.placeDelivery || null,
      TypeOfMove:      data.typeOfMove || null,
      Contenedor:      data.contenedor || null,
      Seals:           data.seals || null,
      Refer:           data.refer || null,
      Texto:           data.texto || null,
      TipoContenedor:  data.tipoContenedor || null,
      Fecha:           data.fecha || null,
      EDC:             data.edc || null,
      NumberPk:        data.numberPk ? parseInt(data.numberPk, 10) : null,
      PesoLb:          data.pesoLb ? parseFloat(data.pesoLb) : null,
      PesoKg:          data.pesoKg ? parseFloat(data.pesoKg) : null,
      VolumenCbm:      data.volumenCbm ? parseFloat(data.volumenCbm) : null,
      VolumenCft:      data.volumenCft ? parseFloat(data.volumenCft) : null,
      PlaceofReceipt:  data.placeofReceipt || null,
    };

    try {
      let savedId;
      if (editMode) {
        await apiClient.put(`${ENDPOINTS.TRANSCARGO_AEREO_MASTER_BL}?id=${id}`, payload);
        savedId = parseInt(id, 10);
      } else {
        const res = await apiClient.post(ENDPOINTS.TRANSCARGO_AEREO_MASTER_BL, payload);
        savedId = res.data?.data ?? res.data;
      }

      setSnackbar({ open: true, message: editMode ? 'Master BL actualizado' : 'Master BL creado correctamente', severity: 'success' });
      setTimeout(() => navigate(`/masterbl/transcargoaereo/${savedId}/print`), 800);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (editMode && loadingExisting) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const fieldSx = { mb: 0 };
  const vals = watch();
  const lp = (name) => ({ shrink: !!vals[name] || undefined });

  return (
    <Box>
      <PageTitle
        title={editMode ? 'Editar Master BL' : 'Nuevo Master BL'}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Master BL', href: '/masterbl/transcargoaereo' },
          { label: editMode ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Aplicar Template</InputLabel>
            <Select
              value={selectedTemplateId}
              label="Aplicar Template"
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <MenuItem value=""><em>Seleccione un template...</em></MenuItem>
              {(templates ?? []).map((t) => (
                <MenuItem key={t.masterBLTemplateID} value={t.masterBLTemplateID}>
                  {t.masterBLTemplateName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            onClick={handleApplyTemplate}
            disabled={!selectedTemplateId || applyingTemplate}
          >
            {applyingTemplate ? 'Aplicando...' : 'Aplicar Template'}
          </Button>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Envío" size="small" {...register('envio')} InputLabelProps={lp('envio')} sx={fieldSx} />
            <TextField label="Fecha" type="date" size="small" InputLabelProps={{ shrink: true }} {...register('fecha')} sx={fieldSx} />
            <TextField label="Bill of Lading #" size="small" {...register('billOfLading')} InputLabelProps={lp('billOfLading')} sx={fieldSx} />
            <TextField label="Booking #" size="small" {...register('bookingNumber')} InputLabelProps={lp('bookingNumber')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Shipper / Exporter (EmpresaEnvia)" size="small" {...register('empresaEnvia')} InputLabelProps={lp('empresaEnvia')} sx={fieldSx} />
            <TextField label="Notify Party (EmpresaRecibe)" size="small" {...register('empresaRecibe')} InputLabelProps={lp('empresaRecibe')} sx={fieldSx} />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField label="Consignee" size="small" fullWidth {...register('consignee')} InputLabelProps={lp('consignee')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Forwarding Agent" size="small" {...register('forwardingAgent')} InputLabelProps={lp('forwardingAgent')} sx={fieldSx} />
            <TextField label="FMC #" size="small" {...register('fmc')} InputLabelProps={lp('fmc')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Ocean Carrier" size="small" {...register('oceanCarrier')} InputLabelProps={lp('oceanCarrier')} sx={fieldSx} />
            <TextField label="Vessel (Buque)" size="small" {...register('buque')} InputLabelProps={lp('buque')} sx={fieldSx} />
            <TextField label="Voyage (Viaje)" size="small" {...register('viaje')} InputLabelProps={lp('viaje')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Port of Loading" size="small" {...register('portLoading')} InputLabelProps={lp('portLoading')} sx={fieldSx} />
            <TextField label="Port of Unloading" size="small" {...register('portUnloading')} InputLabelProps={lp('portUnloading')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Place of Delivery" size="small" {...register('placeDelivery')} InputLabelProps={lp('placeDelivery')} sx={fieldSx} />
            <TextField label="Place of Receipt" size="small" {...register('placeofReceipt')} InputLabelProps={lp('placeofReceipt')} sx={fieldSx} />
            <TextField label="Type of Move" size="small" {...register('typeOfMove')} InputLabelProps={lp('typeOfMove')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Container # (Contenedor)" size="small" {...register('contenedor')} InputLabelProps={lp('contenedor')} sx={fieldSx} />
            <TextField label="Container Type (TipoContenedor)" size="small" {...register('tipoContenedor')} InputLabelProps={lp('tipoContenedor')} sx={fieldSx} />
            <TextField label="Seals" size="small" {...register('seals')} InputLabelProps={lp('seals')} sx={fieldSx} />
            <TextField label="Refer" size="small" {...register('refer')} InputLabelProps={lp('refer')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="# Packages" type="number" size="small" {...register('numberPk')} InputLabelProps={lp('numberPk')} sx={fieldSx} />
            <TextField label="Peso Lb" type="number" inputProps={{ step: 'any' }} size="small" {...register('pesoLb')} InputLabelProps={lp('pesoLb')} sx={fieldSx} />
            <TextField label="Peso Kg" type="number" inputProps={{ step: 'any' }} size="small" {...register('pesoKg')} InputLabelProps={lp('pesoKg')} sx={fieldSx} />
            <TextField label="Volumen CBM" type="number" inputProps={{ step: 'any' }} size="small" {...register('volumenCbm')} InputLabelProps={lp('volumenCbm')} sx={fieldSx} />
            <TextField label="Volumen CFT" type="number" inputProps={{ step: 'any' }} size="small" {...register('volumenCft')} InputLabelProps={lp('volumenCft')} sx={fieldSx} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField label="Export Reference" size="small" {...register('exportReference')} InputLabelProps={lp('exportReference')} sx={fieldSx} />
            <TextField label="EDC" size="small" {...register('edc')} InputLabelProps={lp('edc')} sx={fieldSx} />
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              label="Description / Texto"
              size="small"
              fullWidth
              multiline
              minRows={3}
              {...register('texto')}
              InputLabelProps={lp('texto')}
            />
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/masterbl/transcargoaereo')}>
              Cancelar
            </Button>
          </Stack>
        </Box>
      </Paper>

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
