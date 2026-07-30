import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Divider } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HblTrackingCard from '../../components/hbl/HblTrackingCard';

export default function PublicTracking() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        backgroundImage: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #003c8f 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 720, width: '100%', borderRadius: 3, boxShadow: 12 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                bgcolor: 'primary.main',
                borderRadius: '50%',
                p: 2,
                mb: 2,
              }}
            >
              <LocalShippingIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              Rastrear mi Envío
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consulte el estado de sus envíos en cualquier momento
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <HblTrackingCard initialQuery={initialQuery} />

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              © {new Date().getFullYear()} NSEnvio — Todos los derechos reservados
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
