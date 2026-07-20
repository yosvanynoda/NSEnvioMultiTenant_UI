import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Paper, Snackbar, Alert,
  IconButton, Select, MenuItem, FormControl, InputLabel, Stack,
  CircularProgress, Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';

const MASTERBL_REPORT_FIELDS = [
  { name: 'EmpresaEnvia',    label: 'Shipper/Exporter (EmpresaEnvia)' },
  { name: 'BookingNumber',   label: 'Booking # (BookingNumber)' },
  { name: 'EmpresaRecibe',   label: 'Notify Party (EmpresaRecibe)' },
  { name: 'BillOfLading',    label: 'Bill of Lading # (BillOfLading)' },
  { name: 'Consignee',       label: 'Consignee' },
  { name: 'ExportReference', label: 'Export Reference (ExportReference)' },
  { name: 'ForwardingAgent', label: 'Forwarding Agent (ForwardingAgent)' },
  { name: 'FMC',             label: 'FMC #' },
  { name: 'OceanCarrier',    label: 'Ocean Carrier (OceanCarrier)' },
  { name: 'Buque',           label: 'Vessel (Buque)' },
  { name: 'Viaje',           label: 'Voyage (Viaje)' },
  { name: 'PortLoading',     label: 'Port of Loading (PortLoading)' },
  { name: 'PortUnloading',   label: 'Port of Unloading (PortUnloading)' },
  { name: 'PlaceDelivery',   label: 'Place of Delivery (PlaceDelivery)' },
  { name: 'PlaceofReceipt',  label: 'Place of Receipt (PlaceofReceipt)' },
  { name: 'TypeOfMove',      label: 'Type of Move (TypeOfMove)' },
  { name: 'Contenedor',      label: 'Container # (Contenedor)' },
  { name: 'TipoContenedor',  label: 'Container Type (TipoContenedor)' },
  { name: 'Seals',           label: 'Seals' },
  { name: 'Refer',           label: 'Refer' },
  { name: 'Texto',           label: 'Description/Texto' },
  { name: 'EDC',             label: 'EDC' },
];

export default function MasterBLTemplateForm({ editMode = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [masterBLTemplateName, setMasterBLTemplateName] = useState('');
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  // Load existing template when editing
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['masterbl-template-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`${ENDPOINTS.MASTER_BL_TEMPLATE}/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: editMode && Boolean(id),
  });

  useEffect(() => {
    if (existing) {
      setMasterBLTemplateName(existing.masterBLTemplateName ?? '');
      setFields(
        (existing.fields ?? existing.Fields ?? []).map((f) => ({
          fieldName: f.fieldName ?? f.FieldName ?? '',
          defaultValue: f.defaultValue ?? f.DefaultValue ?? '',
        }))
      );
    }
  }, [existing]);

  const handleAddField = () => {
    setFields((prev) => [...prev, { fieldName: '', defaultValue: '' }]);
  };

  const handleRemoveField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldNameChange = (index, value) => {
    setFields((prev) => prev.map((f, i) => i === index ? { ...f, fieldName: value } : f));
  };

  const handleDefaultValueChange = (index, value) => {
    setFields((prev) => prev.map((f, i) => i === index ? { ...f, defaultValue: value } : f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!masterBLTemplateName.trim()) {
      setSnackbar({ open: true, message: 'El nombre del template es requerido', severity: 'error' });
      return;
    }

    setSaving(true);
    const payload = {
      MasterBLTemplateName: masterBLTemplateName.trim(),
      Fields: fields
        .filter((f) => f.fieldName)
        .map((f) => ({ FieldName: f.fieldName, DefaultValue: f.defaultValue || null })),
    };

    try {
      if (editMode) {
        await apiClient.put(`${ENDPOINTS.MASTER_BL_TEMPLATE}?id=${id}`, payload);
        queryClient.invalidateQueries({ queryKey: ['masterbl-template-detail', id] });
        setSnackbar({ open: true, message: 'Template actualizado correctamente', severity: 'success' });
      } else {
        await apiClient.post(ENDPOINTS.MASTER_BL_TEMPLATE, payload);
        setSnackbar({ open: true, message: 'Template creado correctamente', severity: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['masterbl-templates'] });
      setTimeout(() => navigate('/masterbl/template'), 1200);
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

  return (
    <Box>
      <PageTitle
        title={editMode ? 'Editar Template de Master BL' : 'Nuevo Template de Master BL'}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Master BL' },
          { label: 'Templates', href: '/masterbl/template' },
          { label: editMode ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* Template name */}
          <TextField
            label="Nombre del Template"
            value={masterBLTemplateName}
            onChange={(e) => setMasterBLTemplateName(e.target.value)}
            required
            fullWidth
            size="small"
            sx={{ mb: 3 }}
          />

          {/* Field defaults section */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Valores por Defecto de Campos
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddField}
            >
              Agregar Campo
            </Button>
          </Box>

          {fields.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No hay campos configurados. Haga clic en "Agregar Campo" para añadir valores por defecto.
            </Typography>
          )}

          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {fields.map((field, index) => (
              <Box
                key={index}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' },
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <FormControl size="small" fullWidth>
                  <InputLabel>Campo</InputLabel>
                  <Select
                    value={field.fieldName}
                    label="Campo"
                    onChange={(e) => handleFieldNameChange(index, e.target.value)}
                  >
                    <MenuItem value=""><em>Seleccione un campo...</em></MenuItem>
                    {MASTERBL_REPORT_FIELDS.map((f) => (
                      <MenuItem key={f.name} value={f.name}>{f.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Valor por Defecto"
                  size="small"
                  fullWidth
                  value={field.defaultValue}
                  onChange={(e) => handleDefaultValueChange(index, e.target.value)}
                />

                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleRemoveField(index)}
                  title="Eliminar campo"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack direction="row" spacing={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/masterbl/template')}>
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
