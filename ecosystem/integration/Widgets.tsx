"use client";

import React, { useState } from 'react';
import { Box, TextField, IconButton, Paper, Typography, alpha, LinearProgress, Grid, Avatar } from '@mui/material';
import { Send as SendIcon, Description as NoteIcon, Shield as ShieldIcon, Timer as TimerIcon } from '@mui/icons-material';

const QuickNote = () => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#00F5FF', 0.1), color: '#00F5FF' }}><NoteIcon sx={{ fontSize: 20 }} /></Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Quick Note</Typography>
        </Box>
        <TextField fullWidth placeholder="New note..." variant="standard" InputProps={{ disableUnderline: true, sx: { color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8125rem' } }} />
    </Paper>
);

const MiniChat = () => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#7c3aed', fontSize: '0.75rem', fontWeight: 800 }}>AR</Avatar>
            <Box><Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Alex Rivera</Typography><Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>Online</Typography></Box>
        </Box>
        <TextField fullWidth placeholder="Reply..." variant="standard" InputProps={{ disableUnderline: true, sx: { color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8125rem', bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', px: 1 } }} />
    </Paper>
);

const VaultStatus = () => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B' }}><ShieldIcon sx={{ fontSize: 20 }} /></Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Vault Status</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800 }}>ENCRYPTED</Typography>
    </Paper>
);

export const EcosystemWidgets = () => {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 900, letterSpacing: '0.2em', mb: 2, display: 'block' }}>Ecosystem Status</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}><QuickNote /></Grid>
                <Grid item xs={12} md={6}><MiniChat /></Grid>
                <Grid item xs={12} md={6}><VaultStatus /></Grid>
            </Grid>
        </Box>
    );
};
