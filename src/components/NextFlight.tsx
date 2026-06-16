import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
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
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import ViewListIcon from '@mui/icons-material/ViewList';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Flight, Rotation, UserProfile } from '../types';
import { loadProfile, saveProfile, getLastSyncTimestamp, setLastSyncTimestamp } from '../utils/storage';
import { getNextDutyIndex } from '../utils/flightNavigation';
import { getAirportTimeZone, getPickupOffsetMinutes } from '../utils/airportData';
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

const dayAndMonth = (date: Date, airport: string, isUTC: boolean) => {
  const zone = isUTC ? "UTC" : getAirportTimeZone(airport);
  return date.toLocaleString('en-US', { day: 'numeric', month: 'short', timeZone: zone });
};

const hoursZoned = (date: Date, airport: string, isUTC: boolean) => {
  const zone = isUTC ? "UTC" : getAirportTimeZone(airport);
  const suffix = isUTC || zone === "UTC" ? "Z" : "L";
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone }) + suffix;
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

const formatFlightNumber = (flightNumber: string) => {
  const value = flightNumber.trim().toUpperCase();
  if (!value) return '';
  if (/^\d+$/.test(value)) return `BF${value}`;
  return value;
};

const SWIPE_THRESHOLD_PX = 70;
const SWIPE_DIRECTION_LOCK_PX = 12;
const SWIPE_ANIMATION_MS = 200;
const SWIPE_EDGE_RESISTANCE = 0.25;
const SWIPE_EDGE_MAX_OFFSET_PX = 44;
const COMPACT_INITIAL_PAST_COUNT = 3;
const COMPACT_INITIAL_FUTURE_COUNT = 20;
const COMPACT_PAGE_SIZE = 20;

type TouchGesture = {
  x: number;
  y: number;
  mode: 'pending' | 'horizontal' | 'vertical';
};

type ViewMode = 'card' | 'compact';

type FlightCardProps = {
  flight: Flight;
  profile: UserProfile;
  isUTC: boolean;
  displayIndex: number;
  allFlightsLength: number;
  interactive: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onUtcChange: (checked: boolean) => void;
};

function FlightCard({
  flight,
  profile,
  isUTC,
  displayIndex,
  allFlightsLength,
  interactive,
  onPrevious,
  onNext,
  onUtcChange,
}: FlightCardProps) {
  const flightLabel = formatFlightNumber(flight.flightNumber);
  const startDate = new Date(flight.startDate);
  const depTime = new Date(startDate.getTime() + 90 * 60 * 1000);
  const reportTime = new Date(startDate);
  const arrivalTime = new Date(flight.endDate);

  const durationMs = arrivalTime.getTime() - depTime.getTime();
  const durH = Math.floor(durationMs / (1000 * 60 * 60));
  const durM = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationStr = `${durH}h${durM ? ' ' + durM + 'm' : ''}`;

  const isAway = flight.origin !== "ORY" && flight.origin !== profile.base;
  const pickupOffsetMinutes = isAway ? getPickupOffsetMinutes(flight.origin) : undefined;
  const pickupTime = pickupOffsetMinutes === undefined ?
    null :
    new Date(depTime.getTime() + pickupOffsetMinutes * 60 * 1000);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        minHeight: '440px',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, height: '80px' }}>
          <IconButton disabled={displayIndex === 0} onClick={onPrevious}><NavigateBeforeIcon /></IconButton>
          <Stack alignItems="center" spacing={0.25}>
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1, mt: 1, fontSize: '0.7rem', letterSpacing: 1.5 }}>{flightLabel}</Typography>
              <Typography variant="h5" align="center" sx={{ fontWeight: 'bold' }}>{flight.origin} &#x2192; {flight.destination}</Typography>
          </Stack>
          <IconButton disabled={displayIndex === allFlightsLength - 1} onClick={onNext}><NavigateNextIcon /></IconButton>
        </Stack>

        <Typography variant="caption" display="block" align="center" sx={{ mb: 2, color: 'primary.main', fontWeight: 500 }}>{countdown(flight.startDate, flight.endDate)}</Typography>

        <Box sx={{ minHeight: '220px' }}>
          <Timeline sx={{ p: 0, m: 0 }}>
            {pickupTime && (
              <TimelineItem>
                <TimelineOppositeContent sx={{ m: 'auto 0', flex: 1 }} align="right">
                  <Typography variant="subtitle2">Pick-up</Typography>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineConnector sx={{ visibility: 'hidden' }} />
                  <TimelineDot variant="outlined"><AirportShuttleIcon fontSize="small"/></TimelineDot>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent sx={{ py: '12px', px: 2, flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">{dayAndMonth(pickupTime, flight.origin, isUTC)}</Typography>
                  <Typography variant="body2" color="text.primary">{hoursZoned(pickupTime, flight.origin, isUTC)}</Typography>
                </TimelineContent>
              </TimelineItem>
            )}

            <TimelineItem>
              <TimelineOppositeContent sx={{ m: 'auto 0', flex: 1 }} align="right">
                <Typography variant="subtitle2">Report</Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineConnector sx={pickupTime ? undefined : { visibility: 'hidden' }} />
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
                <TimelineConnector sx={{ visibility: 'hidden' }} />
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
            <AntSwitch checked={isUTC} onChange={e => onUtcChange(e.target.checked)} />
            <Typography variant="caption">UTC</Typography>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

type CompactFlightListProps = {
  flights: Flight[];
  isUTC: boolean;
  currentIndex: number;
  nextDutyIndex: number;
  visibleStart: number;
  visibleEnd: number;
  onSelectFlight: (index: number) => void;
  onShowEarlier: () => void;
  onShowMore: () => void;
};

const compactDate = (date: Date, airport: string, isUTC: boolean) => {
  const zone = isUTC ? "UTC" : getAirportTimeZone(airport);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: zone,
  });
};

function CompactFlightList({
  flights,
  isUTC,
  currentIndex,
  nextDutyIndex,
  visibleStart,
  visibleEnd,
  onSelectFlight,
  onShowEarlier,
  onShowMore,
}: CompactFlightListProps) {
  const visibleFlights = flights.slice(visibleStart, visibleEnd);
  const hasEarlier = visibleStart > 0;
  const hasMore = visibleEnd < flights.length;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ maxHeight: 'calc(100vh - 225px)', overflowY: 'auto' }}>
          {hasEarlier && (
            <Box sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
              <Button fullWidth size="small" onClick={onShowEarlier} sx={{ textTransform: 'none' }}>
                Show earlier
              </Button>
            </Box>
          )}

          {visibleFlights.map((flight, offset) => {
            const index = visibleStart + offset;
            const reportTime = new Date(flight.startDate);
            const departureTime = new Date(reportTime.getTime() + 90 * 60 * 1000);
            const arrivalTime = new Date(flight.endDate);
            const isSelected = index === currentIndex;
            const isNextDuty = index === nextDutyIndex;

            return (
              <Box
                key={`${flight.flightNumber}-${flight.startDate}-${index}`}
                component="button"
                type="button"
                onClick={() => onSelectFlight(index)}
                sx={{
                  width: '100%',
                  border: 0,
                  borderBottom: offset === visibleFlights.length - 1 && !hasMore ? 0 : 1,
                  borderColor: 'divider',
                  bgcolor: isSelected ? 'rgba(25, 118, 210, 0.18)' : 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  minHeight: 58,
                  px: 1.25,
                  py: 0.9,
                  textAlign: 'left',
                  '&:active': {
                    bgcolor: 'rgba(25, 118, 210, 0.26)',
                  },
                }}
              >
                <Box sx={{ width: 58, flex: '0 0 58px' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.15, display: 'block' }}>
                    {compactDate(reportTime, flight.origin, isUTC)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.67rem' }}>
                    #{index + 1}
                  </Typography>
                </Box>

                <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                      {formatFlightNumber(flight.flightNumber)}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
                      {flight.origin} &#x2192; {flight.destination}
                    </Typography>
                    {isNextDuty && (
                      <Box
                        component="span"
                        sx={{
                          border: 1,
                          borderColor: 'primary.main',
                          borderRadius: 0.75,
                          color: 'primary.main',
                          flexShrink: 0,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          lineHeight: 1,
                          px: 0.5,
                          py: 0.25,
                        }}
                      >
                        Next
                      </Box>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    Rep {hoursZoned(reportTime, flight.origin, isUTC)} · Dep {hoursZoned(departureTime, flight.origin, isUTC)} · Arr {hoursZoned(arrivalTime, flight.destination, isUTC)}
                  </Typography>
                </Stack>
              </Box>
            );
          })}

          {hasMore && (
            <Box sx={{ px: 1, py: 0.75 }}>
              <Button fullWidth size="small" onClick={onShowMore} sx={{ textTransform: 'none' }}>
                Show more future
              </Button>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function NextFlight() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUTC, setIsUTC] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [compactPastCount, setCompactPastCount] = useState(COMPACT_INITIAL_PAST_COUNT);
  const [compactFutureCount, setCompactFutureCount] = useState(COMPACT_INITIAL_FUTURE_COUNT);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [skipSwipeTransition, setSkipSwipeTransition] = useState(false);
  const touchStart = useRef<TouchGesture | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const slideOutTimer = useRef<number | null>(null);

  const goToPreviousFlight = useCallback(() => {
    setCurrentIndex(i => Math.max(0, i - 1));
  }, []);

  const goToNextFlight = useCallback(() => {
    setCurrentIndex(i => Math.min(allFlights.length - 1, i + 1));
  }, [allFlights.length]);

  const goToNextDuty = useCallback(() => {
    setCurrentIndex(getNextDutyIndex(allFlights));
  }, [allFlights]);

  const clearSwipeTimers = useCallback(() => {
    if (slideOutTimer.current !== null) {
      window.clearTimeout(slideOutTimer.current);
      slideOutTimer.current = null;
    }
  }, []);

  const getSlideDistance = useCallback(() => {
    return carouselRef.current?.clientWidth ||
      Math.max(320, Math.min(window.innerWidth - 48, 400));
  }, []);

  const resetSwipe = useCallback(() => {
    touchStart.current = null;
    setIsDragging(false);
    setSkipSwipeTransition(false);
    setDragOffset(0);
  }, []);

  const openFlightFromList = useCallback((index: number) => {
    resetSwipe();
    setCurrentIndex(index);
    setViewMode('card');
  }, [resetSwipe]);

  const animateSwipeToFlight = useCallback((direction: -1 | 1) => {
    clearSwipeTimers();
    touchStart.current = null;

    const slideDistance = getSlideDistance();
    const targetOffset = direction === 1 ? -slideDistance : slideDistance;

    setIsDragging(false);
    setIsSwipeAnimating(true);
    setSkipSwipeTransition(false);
    setDragOffset(targetOffset);

    slideOutTimer.current = window.setTimeout(() => {
      setSkipSwipeTransition(true);
      setCurrentIndex(i => Math.max(0, Math.min(allFlights.length - 1, i + direction)));
      setDragOffset(0);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setSkipSwipeTransition(false);
          setIsSwipeAnimating(false);
        });
      });
    }, SWIPE_ANIMATION_MS);
  }, [allFlights.length, clearSwipeTimers, getSlideDistance]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (isSwipeAnimating) return;
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, mode: 'pending' };
    setSkipSwipeTransition(true);
    setDragOffset(0);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchStart.current || isSwipeAnimating) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (touchStart.current.mode === 'pending' &&
        (absX > SWIPE_DIRECTION_LOCK_PX || absY > SWIPE_DIRECTION_LOCK_PX)) {
      touchStart.current.mode = absX > absY * 1.2 ? 'horizontal' : 'vertical';
    }

    if (touchStart.current.mode !== 'horizontal') return;
    if (event.cancelable) event.preventDefault();

    const isBeforeFirstFlight = currentIndex === 0 && deltaX > 0;
    const isAfterLastFlight = currentIndex === allFlights.length - 1 && deltaX < 0;
    const nextOffset = isBeforeFirstFlight || isAfterLastFlight ?
      Math.sign(deltaX) * Math.min(absX * SWIPE_EDGE_RESISTANCE, SWIPE_EDGE_MAX_OFFSET_PX) :
      deltaX;

    setIsDragging(true);
    setDragOffset(nextOffset);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const wasHorizontalSwipe = touchStart.current.mode === 'horizontal';

    if (!wasHorizontalSwipe || Math.abs(deltaY) > 75 ||
        Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      resetSwipe();
      return;
    }

    if (deltaX < 0 && currentIndex < allFlights.length - 1) {
      animateSwipeToFlight(1);
      return;
    }

    if (deltaX > 0 && currentIndex > 0) {
      animateSwipeToFlight(-1);
      return;
    }

    resetSwipe();
  };

  const handleTouchCancel = () => {
    resetSwipe();
  };

  const loadLocalData = () => {
    const data = loadProfile();
    if (data) {
      setProfile(data);
      const flights = ((data.rotations as Rotation[] | undefined) || []).map(r => r.flights).flat()
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      setAllFlights(flights);
      setCurrentIndex(getNextDutyIndex(flights));
    }
    setLastSync(getLastSyncTimestamp());
  };

  useEffect(() => {
    loadLocalData();
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => clearSwipeTimers();
  }, [clearSwipeTimers]);

  useEffect(() => {
    setCompactPastCount(COMPACT_INITIAL_PAST_COUNT);
    setCompactFutureCount(COMPACT_INITIAL_FUTURE_COUNT);
  }, [allFlights.length]);

  const handleQuickSync = async () => {
    if (!profile?.webcal || !profile?.base) return;
    setSyncing(true);
    try {
      const roster = await toast.promise(
        fetchProfileRoster(profile.base, profile.webcal),
        {
          pending: 'Syncing...',
          success: 'Roster updated!',
          error: {
            render({ data }) {
              return data instanceof Error ? data.message : 'Sync failed';
            },
          },
        }
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

  const nextDutyIndex = getNextDutyIndex(allFlights);
  const isViewingNextDuty = currentIndex === nextDutyIndex;
  const slideIndexes = [currentIndex - 1, currentIndex, currentIndex + 1];
  const trackTransition = isDragging || skipSwipeTransition ?
    'none' :
    `transform ${SWIPE_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  const syncStatus = getSyncStatus(lastSync);
  const compactStart = Math.max(0, nextDutyIndex - compactPastCount);
  const compactEnd = Math.min(
    allFlights.length,
    nextDutyIndex + compactFutureCount + 1
  );

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
              onClick={() => setViewMode(mode => mode === 'card' ? 'compact' : 'card')}
              size="small"
              aria-label={viewMode === 'card' ? 'Show compact list' : 'Show card view'}
              title={viewMode === 'card' ? 'Compact list' : 'Card view'}
              sx={{ position: 'absolute', right: 36 }}
            >
              {viewMode === 'card' ? <ViewListIcon /> : <ViewCarouselIcon />}
            </IconButton>
            
            <IconButton 
                onClick={() => navigate("/settings")} 
                size="small" 
                sx={{ position: 'absolute', right: 0 }}
            >
                <SettingsIcon />
            </IconButton>
          </Stack>

          {viewMode === 'compact' ? (
            <CompactFlightList
              flights={allFlights}
              isUTC={isUTC}
              currentIndex={currentIndex}
              nextDutyIndex={nextDutyIndex}
              visibleStart={compactStart}
              visibleEnd={compactEnd}
              onSelectFlight={openFlightFromList}
              onShowEarlier={() => setCompactPastCount(count => count + COMPACT_PAGE_SIZE)}
              onShowMore={() => setCompactFutureCount(count => count + COMPACT_PAGE_SIZE)}
            />
          ) : (
            <Box
              ref={carouselRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              sx={{
                overflow: 'hidden',
                touchAction: 'pan-y',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  transform: `translateX(calc(-100% + ${dragOffset}px))`,
                  transition: trackTransition,
                  willChange: 'transform',
                }}
              >
                {slideIndexes.map((flightIndex, slidePosition) => (
                  <Box
                    key={`${flightIndex}-${slidePosition}`}
                    sx={{
                      flex: '0 0 100%',
                      boxSizing: 'border-box',
                      px: 0.75,
                    }}
                  >
                    {allFlights[flightIndex] ? (
                      <FlightCard
                        flight={allFlights[flightIndex]}
                        profile={profile}
                        isUTC={isUTC}
                        displayIndex={flightIndex}
                        allFlightsLength={allFlights.length}
                        interactive={slidePosition === 1 && !isSwipeAnimating}
                        onPrevious={goToPreviousFlight}
                        onNext={goToNextFlight}
                        onUtcChange={setIsUTC}
                      />
                    ) : (
                      <Box sx={{ minHeight: '440px' }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {!isViewingNextDuty && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MyLocationIcon fontSize="small" />}
                onClick={goToNextDuty}
                sx={{ borderRadius: 1, textTransform: 'none' }}
              >
                Next duty
              </Button>
            </Box>
          )}

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
