import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Alert, Typography, Grid, Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';

const HBL_TYPE_LABELS = {
  aereo: 'Aéreo',
  transcargo: 'Transcargo',
  palco: 'Palco',
  cubapack: 'CubaPack',
  cubapost: 'CubaPost',
  transcargoaereo: 'Transcargo Aéreo',
};

function InfoField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value ?? '—'}</Typography>
    </Box>
  );
}

export default function SucursalInvoiceDetail({ hblType }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const label = HBL_TYPE_LABELS[hblType] ?? hblType;

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['sucursalInvoiceDetail', id],
    queryFn: async () => {
      const res = await apiClient.get(`${ENDPOINTS.SUCURSAL_INVOICE}/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const lineColumns = [
    { field: 'hblNumero', headerName: 'HBL', width: 150 },
    { field: 'remitenteName', headerName: 'Remitente', flex: 1, minWidth: 130 },
    { field: 'destinatarioName', headerName: 'Destinatario', flex: 1, minWidth: 130 },
    { field: 'region', headerName: 'Región', width: 120 },
    { field: 'bultoDescription', headerName: 'Bulto', flex: 1, minWidth: 100 },
    {
      field: 'priceMethod', headerName: 'Método', width: 100,
      renderCell: (p) => (
        <Chip
          label={p.value === 'weight' ? 'Peso' : 'Cant.'}
          size="small"
          variant="outlined"
          color={p.value === 'weight' ? 'primary' : 'secondary'}
        />
      ),
    },
    {
      field: 'pricePerUnit', headerName: '$/Unidad', width: 90,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'peso', headerName: 'Peso', width: 80,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `${Number(v).toFixed(2)} lb` : '—',
    },
    {
      field: 'cantidad', headerName: 'Cant.', width: 70,
      align: 'right', headerAlign: 'right',
    },
    {
      field: 'baseAmount', headerName: 'Base', width: 90,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'locationAmount', headerName: 'Región', width: 90,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'totalLine', headerName: 'Total', width: 100,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
  ];

  if (isLoading) return <CircularProgress sx={{ m: 4 }} />;
  if (isError || !invoice) return <Alert severity="error" sx={{ m: 2 }}>Error al cargar la factura.</Alert>;

  return (
    <Box>
      <PageTitle
        title={invoice.invoiceNumber}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: label },
          { label: 'Facturas Agencia', href: `/hbl/${hblType}/sucursal-invoice` },
          { label: invoice.invoiceNumber },
        ]}
        action={
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/hbl/${hblType}/sucursal-invoice`)}
          >
            Volver
          </Button>
        }
      />

      {/* Header card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InfoField label="N° Factura" value={invoice.invoiceNumber} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InfoField label="Franquicia Origen" value={invoice.parentSucursalName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InfoField label="Franquicia Destino" value={invoice.childSucursalName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InfoField label="Tipo Envío" value={invoice.tipoEnvioName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InfoField
                label="Fecha"
                value={invoice.fecha ? new Date(invoice.fecha).toLocaleDateString('en-US') : '—'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InfoField label="Creado por" value={invoice.createdBy} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Estado</Typography>
                <Box>
                  <Chip
                    label={invoice.isActive ? 'Activo' : 'Inactivo'}
                    color={invoice.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total</Typography>
                <Typography variant="h6" color="primary" fontWeight={700}>
                  ${Number(invoice.totalAmount).toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lines grid */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Líneas — {invoice.lines?.length ?? 0} registros
        </Typography>
        <Typography variant="h6" color="primary">
          Total: ${Number(invoice.totalAmount).toFixed(2)}
        </Typography>
      </Box>
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={invoice.lines ?? []}
          columns={lineColumns}
          getRowId={(row) => row.invoiceDetailID}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>
    </Box>
  );
}
