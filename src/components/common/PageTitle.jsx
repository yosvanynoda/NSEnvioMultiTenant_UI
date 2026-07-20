import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export default function PageTitle({ title, breadcrumbs = [], action }) {
  return (
    <Box sx={{ mb: { xs: 2, sm: 3 } }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 0.5, display: { xs: 'none', sm: 'flex' } }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            if (isLast || !crumb.href) {
              return (
                <Typography key={index} color="text.primary" variant="body2">
                  {crumb.label}
                </Typography>
              );
            }
            return (
              <MuiLink
                key={index}
                component={Link}
                to={crumb.href}
                underline="hover"
                color="inherit"
                variant="body2"
              >
                {crumb.label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography
          variant="h5"
          component="h1"
          color="primary"
          fontWeight={700}
          sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}
        >
          {title}
        </Typography>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
    </Box>
  );
}
