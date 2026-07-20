import React, { useState } from 'react';
import {
  Box, Button, Chip, IconButton, Tooltip, Switch, Alert, Snackbar,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControlLabel, Grid,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import { useAuth } from '../../../contexts/AuthContext';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';

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

const PLACEHOLDER_HELP = 'Variables disponibles: {numero} = número de envío   •   {status} = nombre del estado';

const EMPTY_FORM = {
  templateName: '',
  subject: '',
  body: '',
  isActive: true,
  hblStatus: '',
};

function TemplateDialog({ open, onClose, onSave, initial, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            templateName: initial.templateName || '',
            subject:      initial.subject      || '',
            body:         initial.body         || '',
            isActive:     initial.isActive     ?? true,
            hblStatus:    initial.hblStatus    ?? '',
          }
        : EMPTY_FORM
      );
      setErrors({});
    }
  }, [open, initial]);

  const setField = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.templateName.trim()) e.templateName = 'El nombre es requerido';
    if (!form.subject.trim())      e.subject      = 'El asunto es requerido';
    if (!form.body.trim())         e.body         = 'El cuerpo es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      hblStatus: form.hblStatus !== '' ? Number(form.hblStatus) : null,
    });
  };

  const isEdit = Boolean(initial);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon color="primary" />
        {isEdit ? 'Editar Plantilla' : 'Nueva Plantilla de Email'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          {PLACEHOLDER_HELP}
        </Alert>
        <Grid container spacing={2}>
          <Grid size={8}>
            <TextField
              label="Nombre de la plantilla *"
              value={form.templateName}
              onChange={setField('templateName')}
              fullWidth size="small"
              error={Boolean(errors.templateName)}
              helperText={errors.templateName || 'Nombre interno para identificar la plantilla'}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Estado HBL (opcional)"
              value={form.hblStatus}
              onChange={setField('hblStatus')}
              fullWidth size="small" select
              helperText="Vincula a un estado de tracking"
            >
              <MenuItem value=""><em>— General —</em></MenuItem>
              {HBL_STATUSES.map(s => (
                <MenuItem key={s.code} value={s.code}>{s.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              label="Asunto *"
              value={form.subject}
              onChange={setField('subject')}
              fullWidth size="small"
              error={Boolean(errors.subject)}
              helperText={errors.subject}
              placeholder="Su envío {numero} ha llegado a destino"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Cuerpo del email *"
              value={form.body}
              onChange={setField('body')}
              fullWidth size="small" multiline rows={8}
              error={Boolean(errors.body)}
              helperText={errors.body || 'Puede incluir HTML básico'}
              placeholder={'Estimado cliente,\n\nSu envío {numero} ha cambiado al estado: {status}.\n\nGracias por confiar en nosotros.'}
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                  color="success"
                />
              }
              label="Activo"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} variant="outlined">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <EmailIcon />}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function EmailTemplateIndex() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.EMAIL_TEMPLATE);
      const d = res.data?.data ?? res.data ?? [];
      return Array.isArray(d) ? d : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.EMAIL_TEMPLATE}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emailTemplates'] });
      setSnackbar({ open: true, message: 'Plantilla eliminada', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const username = user?.username || '';
      if (editing) {
        await apiClient.put(`${ENDPOINTS.EMAIL_TEMPLATE}?id=${editing.emailTemplateID}`, {
          ...form,
          emailTemplateID: editing.emailTemplateID,
          lastUpdatedBy: username,
          lastUpdatedDate: now,
        });
      } else {
        await apiClient.post(ENDPOINTS.EMAIL_TEMPLATE, {
          ...form,
          createdBy: username,
          createdDate: now,
          lastUpdatedBy: username,
          lastUpdatedDate: now,
        });
      }
      qc.invalidateQueries({ queryKey: ['emailTemplates'] });
      setSnackbar({ open: true, message: editing ? 'Plantilla actualizada' : 'Plantilla creada', severity: 'success' });
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row) => { setEditing(row); setDialogOpen(true); };

  const statusLabel = (code) => code != null
    ? (HBL_STATUSES.find(s => s.code === code)?.label ?? `Estado ${code}`)
    : null;

  const columns = [
    {
      field: 'templateName', headerName: 'Nombre', flex: 1, minWidth: 180,
    },
    {
      field: 'subject', headerName: 'Asunto', flex: 1, minWidth: 200,
    },
    {
      field: 'hblStatus', headerName: 'Vinculado a', width: 160,
      renderCell: ({ value }) => value != null
        ? <Chip label={statusLabel(value)} size="small" color="secondary" />
        : <Chip label="General" size="small" variant="outlined" />,
    },
    {
      field: 'isActive', headerName: 'Activo', width: 90,
      renderCell: ({ value }) => (
        <Chip label={value ? 'Sí' : 'No'} color={value ? 'success' : 'default'} size="small" />
      ),
    },
    { field: 'createdBy', headerName: 'Creado por', width: 130 },
    {
      field: 'actions', headerName: 'Acciones', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(row.emailTemplateID)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Plantillas de Email"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Plantillas de Email' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nueva Plantilla
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Las plantillas pueden ser de uso general o vincularse a un estado de tracking específico.
        Variables disponibles en asunto y cuerpo: <strong>{'{numero}'}</strong> y <strong>{'{status}'}</strong>.
      </Alert>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar las plantillas.</Alert>}

      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={templates}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.emailTemplateID}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <TemplateDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        message="¿Eliminar esta plantilla de email?"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
