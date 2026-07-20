import React from 'react';
import { Box, Paper, Typography, TextField, Grid, InputAdornment } from '@mui/material';

const FIELD_SX = {
  '& .MuiInputLabel-root': { fontSize: '0.7rem' },
  '& .MuiInputBase-input': { fontSize: '0.8rem', py: '4px' },
  '& .MuiInputAdornment-root .MuiTypography-root': { fontSize: '0.75rem' },
};

export default function TotalesSection({ totales, onChange, valorAduanal = 0 }) {
  const { subTotal = 0, distribucion = 0, precio = 0, manipulacion = 0, descuento = 0, total = 0 } = totales || {};

  const handleChange = (field) => (e) => {
    const val = parseFloat(e.target.value) || 0;
    onChange({ ...totales, [field]: val });
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="caption" fontWeight={700} color="primary" display="block" mb={1}>
        Totales
      </Typography>
      <Grid container spacing={1} columns={14}>
        <Grid size={2}>
          <TextField
            label="SubTotal"
            value={subTotal.toFixed(2)}
            fullWidth
            size="small"
            slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            sx={{ ...FIELD_SX, '& .MuiInputBase-input': { ...FIELD_SX['& .MuiInputBase-input'], bgcolor: 'grey.100' } }}
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="Distribución"
            type="number"
            value={distribucion}
            onChange={handleChange('distribucion')}
            fullWidth
            size="small"
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
            sx={FIELD_SX}
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="Precio Ref."
            value={Number(precio).toFixed(2)}
            fullWidth
            size="small"
            slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            sx={{ ...FIELD_SX, '& .MuiInputBase-input': { ...FIELD_SX['& .MuiInputBase-input'], bgcolor: 'grey.100' } }}
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="Manipulación"
            value={Number(manipulacion).toFixed(2)}
            fullWidth
            size="small"
            slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            sx={{ ...FIELD_SX, '& .MuiInputBase-input': { ...FIELD_SX['& .MuiInputBase-input'], bgcolor: 'grey.100' } }}
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="Descuento"
            type="number"
            value={descuento}
            onChange={handleChange('descuento')}
            fullWidth
            size="small"
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
            sx={FIELD_SX}
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="Valor Aduanal"
            value={Number(valorAduanal).toFixed(2)}
            fullWidth
            size="small"
            slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            sx={{ ...FIELD_SX, '& .MuiInputBase-input': { ...FIELD_SX['& .MuiInputBase-input'], bgcolor: 'grey.100' } }}
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="TOTAL"
            value={total.toFixed(2)}
            fullWidth
            size="small"
            slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            sx={{ ...FIELD_SX, '& .MuiInputBase-input': { ...FIELD_SX['& .MuiInputBase-input'], fontWeight: 700 } }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
