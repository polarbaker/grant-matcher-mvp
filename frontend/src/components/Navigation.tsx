import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

const Navigation: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Grant Matcher
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
