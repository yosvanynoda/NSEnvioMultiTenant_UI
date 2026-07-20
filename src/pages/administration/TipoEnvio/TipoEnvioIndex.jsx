import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Tooltip, Chip, Alert, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import { useAuth } from '../../../contexts/AuthContext';

export default function TipoEnvioIndex() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['tipoEnvioName', 'companyName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'tipoEnvioName', headerName: 'Nombre', flex: 1, minWidth: 200 },
    { field: 'envioActual', headerName: 'Envío Actual', width: 150 },
    { field: 'companyName', headerName: 'Compañía', width: 150 },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: (params) => <Chip label={params.value ? 'Activo' : 'Inactivo'} color={params.value ? 'success' : 'default'} size="small" />,
    },
    {
      field: 'actions', headerName: 'Acciones', width: 80, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => navigate(`/administration/tipoenvio/edit/${params.row.tipoEnvioID}`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Tipos de Envíos"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Tipos de Envíos' }]}
        action={isSuperAdmin ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/administration/tipoenvio/create')}>Nuevo</Button> : null}
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por tipo de envío, compañía..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid rows={filteredRows} columns={columns} loading={isLoading} getRowId={(row) => row.tipoEnvioID} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick sx={dataGridStyles} />
      </Box>
    </Box>
  );
}
