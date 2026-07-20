import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, List, ListItem, ListItemText,
  Divider, CircularProgress, Alert, Tooltip, IconButton,
  TextField, Grid,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';

const createSchema = yup.object({
  nombre: yup.string().required('El nombre es requerido'),
  direccion: yup.string().default(''),
  telefono: yup.string().default(''),
  email: yup.string().email('Email inválido').default(''),
});

function fullName(d) {
  return [d.destinatarioName, d.destinatarioSecondName, d.destinatarioLastName, d.destinatarioSecondLastName]
    .filter(Boolean).join(' ');
}

export default function DestinatarioPicker({ open, onClose, destinatarios = [], onSelect }) {
  const { user } = useAuth();
  const [view, setView] = useState('list');
  const [items, setItems] = useState(destinatarios);
  const [hidingId, setHidingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    setItems(destinatarios);
  }, [destinatarios]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(createSchema),
    defaultValues: { nombre: '', direccion: '', telefono: '', email: '' },
  });

  const handleClose = () => {
    setView('list');
    reset();
    setCreateError('');
    onClose();
  };

  const handleHide = async (d) => {
    if (!d.addressID) return;
    setHidingId(d.addressID);
    try {
      await apiClient.delete(`${ENDPOINTS.DESTINATARIO_ADDRESS}?id=${d.addressID}`, {
        data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
      });
      setItems(prev => prev.filter(x => x.addressID !== d.addressID));
    } catch {
      // silently ignore — row stays visible
    } finally {
      setHidingId(null);
    }
  };

  const onCreateSubmit = async (data) => {
    setCreating(true);
    setCreateError('');
    try {
      const res = await apiClient.post(ENDPOINTS.DESTINATARIO, data);
      const created = res.data?.data || res.data;
      onSelect(created);
      handleClose();
    } catch (err) {
      setCreateError(err.message || 'Error al crear destinatario');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white' }}>
        {view === 'list' ? 'Seleccionar Destinatario' : 'Nuevo Destinatario'}
      </DialogTitle>

      {view === 'list' ? (
        <>
          <DialogContent sx={{ p: 0 }}>
            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No hay destinatarios disponibles.
              </Typography>
            ) : (
              <List disablePadding>
                {items.map((d, i) => (
                  <React.Fragment key={d.addressID ?? d.destinatarioID}>
                    {i > 0 && <Divider />}
                    <ListItem
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {d.addressID && (
                            <Tooltip title="Ocultar esta dirección">
                              <IconButton
                                size="small"
                                color="error"
                                disabled={hidingId === d.addressID}
                                onClick={() => handleHide(d)}
                              >
                                {hidingId === d.addressID
                                  ? <CircularProgress size={14} color="error" />
                                  : <VisibilityOffIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          )}
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            startIcon={<CheckIcon />}
                            onClick={() => { onSelect(d); handleClose(); }}
                          >
                            Seleccionar
                          </Button>
                        </Box>
                      }
                      sx={{ pr: 20 }}
                    >
                      <ListItemText
                        primary={<Typography fontWeight={600}>{fullName(d)}</Typography>}
                        secondary={
                          <Box component="span">
                            {d.cellphone && <Typography variant="caption" display="block">{d.cellphone}</Typography>}
                            {(d.municipioName || d.provinciaName) && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {[d.municipioName, d.provinciaName].filter(Boolean).join(', ')}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            <Button variant="outlined" color="secondary" startIcon={<PersonAddIcon />} onClick={() => setView('create')}>
              Crear Nuevo
            </Button>
            <Button onClick={handleClose} variant="outlined">Cancelar</Button>
          </DialogActions>
        </>
      ) : (
        <form onSubmit={handleSubmit(onCreateSubmit)}>
          <DialogContent sx={{ pt: 2 }}>
            {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller name="nombre" control={control} render={({ field }) => (
                  <TextField {...field} label="Nombre *" fullWidth error={Boolean(errors.nombre)} helperText={errors.nombre?.message} />
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="direccion" control={control} render={({ field }) => (
                  <TextField {...field} label="Dirección" fullWidth multiline rows={2} />
                )} />
              </Grid>
              <Grid item xs={6}>
                <Controller name="telefono" control={control} render={({ field }) => (
                  <TextField {...field} label="Teléfono" fullWidth />
                )} />
              </Grid>
              <Grid item xs={6}>
                <Controller name="email" control={control} render={({ field }) => (
                  <TextField {...field} label="Email" fullWidth error={Boolean(errors.email)} helperText={errors.email?.message} />
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            <Button onClick={() => { setView('list'); reset(); setCreateError(''); }} variant="outlined">
              ← Volver
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={creating}
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}>
              Crear
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}
