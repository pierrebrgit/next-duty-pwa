import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchProfileRoster } from '../api/api';
import {
  clearProfile,
  getLastSyncTimestamp,
  getSyncMetadata,
  loadProfile,
  saveProfile,
  setLastSyncTimestamp,
} from '../utils/storage';
import { SyncMetadata, UserProfile } from '../types';
import {
  buildSyncMetadata,
  formatSyncDiagnostic,
  formatSyncPeriod,
  formatSyncSummary,
} from '../utils/syncDiagnostics';

const muiTheme = createTheme({ palette: { mode: 'dark' } });

const defaultProfile: UserProfile = {
  uid: 'local-user',
  email: 'local@user.com',
  nickname: '',
  base: 'ORY',
  webcal: '',
  flights: [],
  rotations: [],
  setup: 1,
  position: 'Flight crew'
};

const formatLastSync = (timestamp: string | null) => {
  if (!timestamp) return 'Never synced';
  return new Date(timestamp).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(false);
  const [showWebcal, setShowWebcal] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);

  useEffect(() => {
    const saved = loadProfile();
    if (saved) setProfile(saved);
    setLastSync(getLastSyncTimestamp());
    setSyncMetadata(getSyncMetadata());
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
      const updatedProfile = {
        ...profile,
        flights: roster.flights || [],
        rotations: roster.rotations,
      };
      const metadata = setLastSyncTimestamp(buildSyncMetadata(roster));
      saveProfile(updatedProfile);
      setProfile(updatedProfile);
      setLastSync(metadata?.syncedAt || getLastSyncTimestamp());
      setSyncMetadata(metadata || getSyncMetadata());
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

  const handleCopyDiagnostic = async () => {
    try {
      await navigator.clipboard.writeText(formatSyncDiagnostic(profile, syncMetadata, lastSync));
      toast.success("Diagnostic copied");
    } catch {
      toast.error("Unable to copy diagnostic");
    }
  };

  const handleClearData = () => {
    if (!window.confirm("Clear all local settings and roster data from this device?")) return;
    clearProfile();
    setProfile(defaultProfile);
    setLastSync(null);
    setSyncMetadata(null);
    toast.success("Local data cleared");
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <ToastContainer theme="dark" />
      <CssBaseline />
      <Box sx={{ mx: "auto", p: 3 }} maxWidth="420px">
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => navigate("/")}><ArrowBackIcon /></IconButton>
            <Typography variant="h5">Settings</Typography>
          </Stack>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">Profile</Typography>

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

                <Button variant="outlined" fullWidth onClick={handleSave}>
                  Save config
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">Roster access</Typography>

                <TextField
                  label="Webcal URL"
                  fullWidth
                  type={showWebcal ? 'text' : 'password'}
                  placeholder="webcal://..."
                  value={profile.webcal}
                  onChange={e => setProfile({...profile, webcal: e.target.value})}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setShowWebcal(value => !value)}
                          aria-label={showWebcal ? 'Hide webcal URL' : 'Show webcal URL'}
                        >
                          {showWebcal ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <LoadingButton
                  variant="contained"
                  fullWidth
                  loading={loading}
                  onClick={handleSync}
                >
                  Test and sync roster
                </LoadingButton>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" color="text.secondary">Sync health</Typography>
                <Typography variant="body2">Last sync: {formatLastSync(lastSync)}</Typography>
                <Typography variant="body2">{formatSyncSummary(syncMetadata)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Period: {formatSyncPeriod(syncMetadata)}
                </Typography>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyDiagnostic}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy diag
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handleClearData}
                    sx={{ textTransform: 'none' }}
                  >
                    Clear
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          
          <Typography variant="caption" color="text.secondary" align="center">
            Roster is stored only on this device.
          </Typography>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
