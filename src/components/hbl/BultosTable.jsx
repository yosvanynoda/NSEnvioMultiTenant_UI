import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const formatCurrency = (val) =>
  typeof val === 'number' ? `$${val.toFixed(2)}` : '$0.00';

export default function BultosTable({ bultos = [], onEdit, onDelete, precioPorPeso = false }) {
  const rowValue = (b) =>
    precioPorPeso && !b.isbyQuantity
      ? (Number(b.peso) || 0) * (Number(b.precioUnitario) || 0)
      : (Number(b.cantidad) || 0) * (Number(b.precioUnitario) || 0);

  const subTotal = bultos.reduce((acc, b) => acc + rowValue(b), 0);
  const totalManipulacion = bultos.reduce(
    (acc, b) => acc + (Number(b.precioManipulacion) || 0),
    0
  );
  const totalValorAduanal = bultos.reduce(
    (acc, b) => acc + (Number(b.valorAduanal) || 0),
    0
  );

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
              <TableCell align="center" sx={{ width: 60 }}>Bulto #</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right" sx={{ width: 80 }}>Cantidad</TableCell>
              <TableCell align="right" sx={{ width: 80 }}>Peso</TableCell>
              <TableCell align="right" sx={{ width: 120 }}>P. Manipulación</TableCell>
              <TableCell align="right" sx={{ width: 110 }}>P. Unitario</TableCell>
              <TableCell align="right" sx={{ width: 110 }}>Subtotal</TableCell>
              <TableCell align="right" sx={{ width: 110 }}>V. Aduanal</TableCell>
              <TableCell align="center" sx={{ width: 90 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bultos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No hay bultos agregados. Use el botón "Agregar Bulto" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              bultos.map((bulto, index) => {
                const rowSubtotal = rowValue(bulto);
                return (
                  <TableRow
                    key={bulto._tempId || bulto.id || index}
                    sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell align="center">
                      <Chip label={index + 1} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {bulto.descripcionProducto || bulto.descripcion || '—'}
                      </Typography>
                      {bulto.categoria && (
                        <Typography variant="caption" color="text.secondary">
                          {bulto.categoria}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{bulto.cantidad}</TableCell>
                    <TableCell align="right">{bulto.peso ?? '—'}</TableCell>
                    <TableCell align="right">{formatCurrency(Number(bulto.precioManipulacion))}</TableCell>
                    <TableCell align="right">{formatCurrency(Number(bulto.precioUnitario))}</TableCell>
                    <TableCell align="right">{formatCurrency(rowSubtotal)}</TableCell>
                    <TableCell align="right">
                      {bulto.valorAduanal ? formatCurrency(Number(bulto.valorAduanal)) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => onEdit && onEdit(bulto, index)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => onDelete && onDelete(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {bultos.length > 0 && (
            <TableBody>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell colSpan={4} />
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    Total Manip:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="secondary.main">
                    {formatCurrency(totalManipulacion)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    SubTotal:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {formatCurrency(subTotal)}
                  </Typography>
                </TableCell>
                <TableCell />
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    V. Aduanal:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="warning.main">
                    {formatCurrency(totalValorAduanal)}
                  </Typography>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          )}
        </Table>
      </TableContainer>

      {bultos.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary">
            {bultos.length} bulto(s) | Peso total:{' '}
            <strong>
              {bultos.reduce((acc, b) => acc + (Number(b.peso) || 0), 0).toFixed(2)} lbs
            </strong>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
