import React from 'react';
import { Box, Paper, Typography, TextField, Grid, InputAdornment, Chip } from '@mui/material';

const PAYMENT_FIELDS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'credito', label: 'Crédito' },
  { key: 'debito', label: 'Débito' },
  { key: 'transferencia', label: 'Transfer.' },
  { key: 'zeller', label: 'Zeller' },
];

const FIELD_SX = {
  '& .MuiInputLabel-root': { fontSize: '0.7rem' },
  '& .MuiInputBase-input': { fontSize: '0.8rem', py: '4px' },
  '& .MuiInputAdornment-root .MuiTypography-root': { fontSize: '0.75rem' },
};

export default function PaymentSection({ payments, onChange, total = 0, paymentStatus = 1 }) {
  const handleChange = (key) => (e) => {
    const val = parseFloat(e.target.value) || 0;
    onChange({ ...payments, [key]: val });
  };

  const totalPaid = PAYMENT_FIELDS.reduce((acc, f) => acc + (Number(payments?.[f.key]) || 0), 0);
  const isPagado = paymentStatus === 3;
  const displayPaid = isPagado ? total : totalPaid;
  const balance = total - totalPaid;
  const isBalanced = isPagado || Math.abs(balance) < 0.01;

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" fontWeight={700} color="primary">
          Forma de Pago
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip
            label={`Pagado: $${displayPaid.toFixed(2)}`}
            color={isBalanced ? 'success' : 'warning'}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
          {!isBalanced && (
            <Chip
              label={`Dif: $${Math.abs(balance).toFixed(2)}`}
              color={balance > 0 ? 'error' : 'info'}
              size="small"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          )}
        </Box>
      </Box>
      <Grid container spacing={1}>
        {PAYMENT_FIELDS.map((field) => (
          <Grid size={2} key={field.key}>
            <TextField
              label={field.label}
              type="number"
              value={payments?.[field.key] ?? 0}
              onChange={handleChange(field.key)}
              fullWidth
              size="small"
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
              sx={FIELD_SX}
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
