import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchProfileRoster } from '../api/api';
import { saveProfile, loadProfile, setLastSyncTimestamp } from '../utils/storage';
import { UserProfile } from '../types';

const muiTheme = createTheme({ palette: { mode: 'dark' } });

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({
    uid: 'local-user',
    email: 'local@user.com',
    nickname: '',
    base: 'ORY',
    webcal: '',
    rotations: [],
    setup: 1,
    position: 'Flight crew'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = loadProfile();
    if (saved) setProfile(saved);
  }, []);

  const handleSync = async () => {
    if (!profile.webcal || !profile.base) {
      toast.error("Webcal and Base are required");
      return;
    }
    setLoading(true);
    try {
      const roster = await toast.promise(
        fetchProfileRoster(profile.base, profile.webcal),
        {
          pending: 'Fetching roster...',
          success: 'Roster updated!',
          error: {
            render({ data }) {
              return data instanceof Error ? data.message : 'Error fetching roster';
            },
          },
        }
      );
      const updatedProfile = { ...profile, rotations: roster.rotations };
      saveProfile(updatedProfile);
      setLastSyncTimestamp();
      setProfile(updatedProfile);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    saveProfile(profile);
    toast.success("Settings saved locally");
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <ToastContainer theme="dark" />
      <CssBaseline />
      <Box sx={{ mx: "auto", p: 3 }} maxWidth="400px">
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => navigate("/")}><ArrowBackIcon /></IconButton>
            <Typography variant="h5">Settings</Typography>
          </Stack>

          <TextField 
            label="Nickname" 
            fullWidth 
            value={profile.nickname} 
            onChange={e => setProfile({...profile, nickname: e.target.value})} 
          />

          <FormControl fullWidth>
            <InputLabel>Base</InputLabel>
            <Select 
              value={profile.base} 
              label="Base"
              onChange={e => setProfile({...profile, base: e.target.value})}
            >
              <MenuItem value="ORY">ORY (Paris)</MenuItem>
              <MenuItem value="RUN">RUN (Reunion)</MenuItem>
            </Select>
          </FormControl>

          <TextField 
            label="Webcal URL" 
            fullWidth 
            multiline
            rows={4}
            placeholder="webcal://..."
            value={profile.webcal} 
            onChange={e => setProfile({...profile, webcal: e.target.value})} 
          />

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" fullWidth onClick={handleSave}>Save Config</Button>
            <LoadingButton 
              variant="contained" 
              fullWidth 
              loading={loading} 
              onClick={handleSync}
            >
              Sync Roster
            </LoadingButton>
          </Stack>
          
          <Typography variant="caption" color="text.secondary" align="center">
            Roster is stored only on this device.
          </Typography>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
