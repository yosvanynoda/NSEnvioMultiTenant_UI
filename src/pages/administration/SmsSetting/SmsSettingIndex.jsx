import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Switch, FormControlLabel,
  Alert, Snackbar, CircularProgress, Divider, Chip, Select, MenuItem,
  FormControl, InputLabel, IconButton, Tooltip, Stack,
} from '@mui/material';
import SmsIcon from '@mui/icons-material/Sms';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { useAuth } from '../../../contexts/AuthContext';
import PageTitle from '../../../components/common/PageTitle';

const ENDPOINT = 'api/v1/SmsSetting';

const HBL_STATUSES = [
  { code: 1, label: 'Facturado'        },
  { code: 2, label: 'En Almacén'       },
  { code: 3, label: 'En Tránsito'      },
  { code: 4, label: 'Entregado'        },
  { code: 5, label: 'Almacén Miami'    },
  { code: 6, label: 'Puerto USA'       },
  { code: 7, label: 'En Destino Cuba'  },
  { code: 8, label: 'En Aduana Cuba'   },
  { code: 9, label: 'En Repartición'   },
];

const DEFAULT_TEMPLATE = 'Su envio {numero} ha cambiado al estado: {status}';
const HELPER = '{numero} = número de envío   •   {status} = nombre del estado';

function TemplateRow({ item, onSave, onDelete, saving, isDefault }) {
  const [template, setTemplate] = useState(item.messageTemplate || DEFAULT_TEMPLATE);
  const [active, setActive]     = useState(item.isActive ?? true);
  const dirty = template !== item.messageTemplate || active !== item.isActive;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {isDefault
          ? <Chip label="Predeterminado (todos los estados)" color="primary" size="small" />
          : <Chip label={HBL_STATUSES.find(s => s.code === item.hblStatus)?.label ?? `Estado ${item.hblStatus}`} color="secondary" size="small" />
        }
        <Box sx={{ flex: 1 }} />
        <FormControlLabel
          control={<Switch size="small" checked={active} onChange={e => setActive(e.target.checked)} />}
          label="Activo"
          sx={{ m: 0 }}
        />
        {!isDefault && (
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onDelete(item.smsSettingID)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <TextField
        value={template}
        onChange={e => setTemplate(e.target.value)}
        fullWidth size="small" multiline rows={2}
        helperText={HELPER}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Button
          size="small" variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          disabled={saving || !template || !dirty}
          onClick={() => onSave({ ...item, messageTemplate: template, isActive: active })}
        >
          Guardar
        </Button>
      </Box>
    </Paper>
  );
}

export default function SmsSettingIndex() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [addStatus, setAddStatus] = useState('');
  const [savingId, setSavingId] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['smsSetting'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINT);
      return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    },
  });

  const defaultTemplate = templates.find(t => t.hblStatus == null);
  const stateTemplates  = templates.filter(t => t.hblStatus != null);
  const usedStatuses    = new Set(stateTemplates.map(t => t.hblStatus));
  const availableStatuses = HBL_STATUSES.filter(s => !usedStatuses.has(s.code));

  const save = async (dto) => {
    setSavingId(dto.smsSettingID ?? 'new');
    try {
      const now = new Date().toISOString();
      const username = user?.username || '';
      const payload = { ...dto, gatewayDomain: 'all', lastUpdatedBy: username, lastUpdatedDate: now };
      if (dto.smsSettingID) {
        await apiClient.put(`${ENDPOINT}?id=${dto.smsSettingID}`, payload);
      } else {
        await apiClient.post(ENDPOINT, { ...payload, createdBy: username, createdDate: now });
      }
      qc.invalidateQueries({ queryKey: ['smsSetting'] });
      setSnackbar({ open: true, message: 'Plantilla guardada', severity: 'success' });
      setTimeout(() => navigate('/'), 1200);
    } catch {
      setSnackbar({ open: true, message: 'Error al guardar', severity: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINT}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['smsSetting'] });
      setSnackbar({ open: true, message: 'Plantilla eliminada', severity: 'success' });
    },
    onError: () => setSnackbar({ open: true, message: 'Error al eliminar', severity: 'error' }),
  });

  const handleAddState = () => {
    if (!addStatus) return;
    save({
      messageTemplate: DEFAULT_TEMPLATE,
      isActive: true,
      hblStatus: Number(addStatus),
    });
    setAddStatus('');
  };

  if (isLoading) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box>
      <PageTitle title="Configuración SMS" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Configuración SMS' }]} />
      <Box sx={{ maxWidth: 620, mx: 'auto' }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        El SMS se envía simultáneamente a todos los operadores US (AT&T, T-Mobile, Verizon, etc.).
        Si existe una plantilla específica para el estado, se usa esa; si no, se usa la <strong>predeterminada</strong>.
      </Alert>

      {/* Default template */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Plantilla predeterminada
      </Typography>
      <TemplateRow
        key={defaultTemplate?.smsSettingID ?? 'default'}
        item={defaultTemplate ?? { messageTemplate: DEFAULT_TEMPLATE, isActive: true, hblStatus: null }}
        onSave={save}
        onDelete={() => {}}
        saving={savingId === (defaultTemplate?.smsSettingID ?? 'new')}
        isDefault
      />

      <Divider sx={{ my: 3 }} />

      {/* Per-state templates */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Plantillas por estado
      </Typography>
      {stateTemplates.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No hay plantillas específicas por estado. La predeterminada se usará para todos.
        </Typography>
      )}
      {stateTemplates.map(t => (
        <TemplateRow
          key={t.smsSettingID}
          item={t}
          onSave={save}
          onDelete={(id) => deleteMutation.mutate(id)}
          saving={savingId === t.smsSettingID}
          isDefault={false}
        />
      ))}

      {/* Add state template */}
      {availableStatuses.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Agregar plantilla para estado específico</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Estado</InputLabel>
              <Select value={addStatus} label="Estado" onChange={e => setAddStatus(e.target.value)}>
                {availableStatuses.map(s => (
                  <MenuItem key={s.code} value={s.code}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained" startIcon={<AddIcon />}
              disabled={!addStatus || savingId === 'new'}
              onClick={handleAddState}
            >
              Agregar
            </Button>
          </Stack>
        </Paper>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
}
