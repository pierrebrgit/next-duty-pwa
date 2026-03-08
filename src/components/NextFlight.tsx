import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import TimelineDot from '@mui/lab/TimelineDot';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Flight, Rotation, UserProfile } from '../types';
import { loadProfile, saveProfile, getLastSyncTimestamp, setLastSyncTimestamp } from '../utils/storage';
import { fetchProfileRoster } from '../api/api';

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const AntSwitch = styled(Switch)(({ theme }) => ({
  width: 28, height: 16, padding: 0, display: 'flex',
  '&:active': { '& .MuiSwitch-thumb': { width: 15 }, '& .MuiSwitch-switchBase.Mui-checked': { transform: 'translateX(9px)' } },
  '& .MuiSwitch-switchBase': { padding: 2, '&.Mui-checked': { transform: 'translateX(12px)', color: '#fff', '& + .MuiSwitch-track': { opacity: 1, backgroundColor: theme.palette.mode === 'dark' ? '#aab4be' : '#aab4be' } } },
  '& .MuiSwitch-thumb': { boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)', width: 12, height: 12, borderRadius: 6, transition: theme.transitions.create(['width'], { duration: 200 }) },
  '& .MuiSwitch-track': { borderRadius: 16 / 2, opacity: 1, backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)', boxSizing: 'border-box' },
}));

const airportZone = (airport: string) => {
  const zones: Record<string, string> = {
    ORY: "Europe/Paris", TLS: "Europe/Paris",
    LAX: "America/Los_Angeles", SFO: "America/Los_Angeles",
    EWR: "America/New_York", RUN: "Indian/Reunion",
    PPT: "Pacific/Tahiti", MIA: "America/New_York", CUN: "America/Cancun"
  };
  return zones[airport] || "Europe/Paris";
};

const dayAndMonth = (date: Date, airport: string, isUTC: boolean) => {
  const zone = isUTC ? "UTC" : airportZone(airport);
  return date.toLocaleString('en-US', { day: 'numeric', month: 'short', timeZone: zone });
};

const hoursZoned = (date: Date, airport: string, isUTC: boolean) => {
  const zone = isUTC ? "UTC" : airportZone(airport);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone }) + (isUTC ? "Z" : "L");
};

const countdown = (start: string | Date, end: string | Date) => {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  const now = new Date().getTime();
  const distance = startDate - now;

  if (distance < 0) {
    return (endDate - now >= 0) ? "in progress" : "completed";
  }
  const d = Math.floor(distance / (1000 * 60 * 60 * 24));
  const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  return `in ${d ? d+'d ' : ''}${h ? h+'h ' : ''}${m ? m+'m' : ''}`;
};

const getSyncStatus = (timestamp: string | null) => {
    if (!timestamp) return { text: 'Never synced', color: 'error.main' };
    const lastSync = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    const timeStr = lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = lastSync.toLocaleDateString([], { day: 'numeric', month: 'short' });
    
    if (diffHours < 24) return { text: `Synced ${dateStr} ${timeStr}`, color: 'text.secondary' };
    return { text: `Outdated sync (${dateStr})`, color: 'warning.main' };
};

export default function NextFlight() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUTC, setIsUTC] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadLocalData = () => {
    const data = loadProfile();
    if (data) {
      setProfile(data);
      const today = new Date();
      const flights = (data.rotations as Rotation[])?.map(r => r.flights).flat()
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      setAllFlights(flights || []);
      const nextIndex = flights.findIndex(f => new Date(f.endDate) > today);
      setCurrentIndex(nextIndex !== -1 ? nextIndex : (flights.length > 0 ? flights.length - 1 : 0));
    }
    setLastSync(getLastSyncTimestamp());
  };

  useEffect(() => {
    loadLocalData();
    setLoading(false);
  }, []);

  const handleQuickSync = async () => {
    if (!profile?.webcal || !profile?.base) return;
    setSyncing(true);
    try {
      const roster = await toast.promise(
        fetchProfileRoster(profile.base, profile.webcal),
        { pending: 'Syncing...', success: 'Roster updated!', error: 'Sync failed' }
      );
      const updatedProfile = { ...profile, rotations: roster.rotations };
      saveProfile(updatedProfile);
      setLastSyncTimestamp();
      loadLocalData();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;

  if (!profile || !profile.webcal) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>Welcome to Next Duty</Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>Please configure your roster to begin.</Typography>
        <IconButton color="primary" onClick={() => navigate("/settings")} size="large"><SettingsIcon fontSize="large" /></IconButton>
      </Box>
    );
  }

  if (allFlights.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 4, textAlign: 'center' }}>
        <Typography variant="h6">No flights found</Typography>
        <IconButton color="primary" onClick={() => navigate("/settings")} sx={{ mt: 2 }}><SettingsIcon /></IconButton>
      </Box>
    );
  }

  const flight = allFlights[currentIndex];
  const startDate = new Date(flight.startDate);
  const depTime = new Date(startDate.getTime() + 90 * 60 * 1000);
  const reportTime = new Date(startDate);
  const arrivalTime = new Date(flight.endDate);
  
  const durationMs = arrivalTime.getTime() - depTime.getTime();
  const durH = Math.floor(durationMs / (1000 * 60 * 60));
  const durM = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationStr = `${durH}h${durM ? ' ' + durM + 'm' : ''}`;

  let pickupTime = null;
  const isAway = flight.origin !== "ORY" && flight.origin !== profile.base;
  
  if (isAway) {
    const offsets: Record<string, number> = { LAX: -180, EWR: -150, MIA: -135, SFO: -150, PPT: -135, RUN: -180, CUN: -150 };
    pickupTime = new Date(depTime.getTime() + (offsets[flight.origin] || 0) * 60 * 1000);
  }

  const syncStatus = getSyncStatus(lastSync);

  return (
    <ThemeProvider theme={muiTheme}>
      <ToastContainer theme="dark" position="bottom-center" autoClose={2000} hideProgressBar />
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-start',
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default',
        pt: 4, // 32px from top
        px: 3  // 24px side margins
      }}>
        <Stack spacing={2} sx={{ width: '100%', maxWidth: '400px' }}>
          
          <Stack direction="row" justifyContent="center" alignItems="center" sx={{ position: 'relative', width: '100%', mb: 1 }}>
            <IconButton 
                onClick={handleQuickSync} 
                disabled={syncing}
                size="small" 
                sx={{ position: 'absolute', left: 0 }}
            >
                {syncing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            </IconButton>
            
            <Typography variant="h6" align="center" sx={{ fontSize: '1.1rem', fontWeight: 500 }}>{profile.nickname}'s duty</Typography>
            
            <IconButton 
                onClick={() => navigate("/settings")} 
                size="small" 
                sx={{ position: 'absolute', right: 0 }}
            >
                <SettingsIcon />
            </IconButton>
          </Stack>

          <Card variant="outlined" sx={{ borderRadius: 4, minHeight: '440px' }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 3 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, height: '80px' }}>
                <IconButton disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}><NavigateBeforeIcon /></IconButton>
                <Stack alignItems="center">
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1, mt: 1, fontSize: '0.7rem', letterSpacing: 1.5 }}>BF{flight.flightNumber}</Typography>
                    <Typography variant="h5" align="center" sx={{ fontWeight: 'bold' }}>{flight.origin} &#x2192; {flight.destination}</Typography>
                </Stack>
                <IconButton disabled={currentIndex === allFlights.length - 1} onClick={() => setCurrentIndex(i => i + 1)}><NavigateNextIcon /></IconButton>
              </Stack>
              
              <Typography variant="caption" display="block" align="center" sx={{ mb: 2, color: 'primary.main', fontWeight: 500 }}>{countdown(flight.startDate, flight.endDate)}</Typography>
              
              <Box sx={{ minHeight: '220px' }}>
                <Timeline sx={{ p: 0, m: 0 }}>
                    {isAway && (
                    <TimelineItem>
                        <TimelineOppositeContent sx={{ m: 'auto 0', flex: 1 }} align="right">
                        <Typography variant="subtitle2">Pick-up</Typography>
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                        <TimelineConnector />
                        <TimelineDot variant="outlined"><AirportShuttleIcon fontSize="small"/></TimelineDot>
                        <TimelineConnector />
                        </TimelineSeparator>
                        <TimelineContent sx={{ py: '12px', px: 2, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">{pickupTime && dayAndMonth(pickupTime, flight.origin, isUTC)}</Typography>
                        <Typography variant="body2" color="text.primary">{pickupTime && hoursZoned(pickupTime, flight.origin, isUTC)}</Typography>
                        </TimelineContent>
                    </TimelineItem>
                    )}

                    <TimelineItem>
                    <TimelineOppositeContent sx={{ m: 'auto 0', flex: 1 }} align="right">
                        <Typography variant="subtitle2">Report</Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineConnector />
                        <TimelineDot variant="outlined"><AssignmentIndIcon fontSize="small"/></TimelineDot>
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">{dayAndMonth(reportTime, flight.origin, isUTC)}</Typography>
                        <Typography variant="body2" color="text.primary">{hoursZoned(reportTime, flight.origin, isUTC)}</Typography>
                    </TimelineContent>
                    </TimelineItem>

                    <TimelineItem>
                    <TimelineOppositeContent sx={{ m: 'auto 0', flex: 1, position: 'relative' }} align="right">
                        <Typography variant="subtitle2">Departure</Typography>
                        <Box sx={{ position: 'absolute', bottom: -12, right: 8, bgcolor: 'background.paper', px: 0.5, zIndex: 1 }}>
                            <Typography variant="caption" color="text.secondary">BF{flight.flightNumber}</Typography>
                        </Box>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineConnector />
                        <TimelineDot color="primary"><FlightTakeoffIcon fontSize="small" /></TimelineDot>
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2, flex: 1, position: 'relative' }}>
                        <Typography variant="body2" color="text.secondary">{dayAndMonth(depTime, flight.origin, isUTC)}</Typography>
                        <Typography variant="body2" color="text.primary">{hoursZoned(depTime, flight.origin, isUTC)}</Typography>
                        <Box sx={{ position: 'absolute', bottom: -12, left: 8, bgcolor: 'background.paper', px: 0.5, zIndex: 1 }}>
                            <Typography variant="caption" color="text.secondary">{durationStr}</Typography>
                        </Box>
                    </TimelineContent>
                    </TimelineItem>

                    <TimelineItem>
                    <TimelineOppositeContent sx={{ m: 'auto 0', flex: 1 }} align="right">
                        <Typography variant="subtitle2">Arrival</Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineConnector />
                        <TimelineDot color="primary"><FlightLandIcon fontSize="small" /></TimelineDot>
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2, flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">{dayAndMonth(arrivalTime, flight.destination, isUTC)}</Typography>
                        <Typography variant="body2" color="text.primary">{hoursZoned(arrivalTime, flight.destination, isUTC)}</Typography>
                    </TimelineContent>
                    </TimelineItem>
                </Timeline>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption">Local</Typography>
                  <AntSwitch checked={isUTC} onChange={e => setIsUTC(e.target.checked)} />
                  <Typography variant="caption">UTC</Typography>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Stack alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Duty {currentIndex + 1} of {allFlights.length}
            </Typography>
            <Typography variant="caption" sx={{ color: syncStatus.color, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                {syncStatus.text}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
