/**
 * Shared MUI DataGrid v8 sx styles used across all index pages.
 * In v7+ the MuiDataGrid-columnHeaders wrapper was removed;
 * styling must target MuiDataGrid-columnHeader (per-cell) instead.
 */

/**
 * Use this on the Box that wraps a DataGrid to make it fill
 * the remaining page height:
 *   <Box sx={dataGridContainerSx}><DataGrid .../></Box>
 */
export const dataGridContainerSx = {
  flex: 1,
  minHeight: { xs: 320, sm: 400 },
  height: { xs: 'calc(100vh - 200px)', sm: 'calc(100vh - 230px)' },
  bgcolor: 'white',
  borderRadius: 2,
  overflow: 'hidden',
};

export const dataGridStyles = {
  bgcolor: 'white',
  borderRadius: 2,
  '& .MuiDataGrid-columnHeader': {
    backgroundColor: 'primary.main',
    color: 'white',
    // all icon buttons inside the header: transparent bg, white icon
    '& .MuiIconButton-root': {
      color: 'white',
      backgroundColor: 'transparent',
      '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
    },
    '& .MuiTouchRipple-root': { color: 'rgba(255,255,255,0.3)' },
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 700,
    color: 'white',
  },
  '& .MuiDataGrid-sortIcon': { color: 'white' },
  '& .MuiDataGrid-menuIconButton': { color: 'white', backgroundColor: 'transparent' },
  '& .MuiDataGrid-iconSeparator': { color: 'rgba(255,255,255,0.5)' },
  // row hover
  '& .MuiDataGrid-row:hover': { backgroundColor: 'action.hover' },
};
