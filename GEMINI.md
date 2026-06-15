# Project Context: Next Duty PWA

## Foundational Mandates
- **Identity**: This is a personal, standalone Progressive Web App (PWA) for viewing flight duty rosters. Rebranding from "Airbuddy" to "Next Duty" is complete.
- **Architecture**: Single-user focus. No authentication logic. Data is stored in `localStorage` via `src/utils/storage.ts`.
- **Offline Capability**: A Service Worker (`public/service-worker.js`) is critical for offline asset caching.
- **UI Consistency**: 
    - The `Timeline` in `src/components/NextFlight.tsx` must remain centered.
    - Labels (Pick-up, Report, etc.) on the left, Timing (Day/Hour) on the right.
    - Navigation buttons must remain stable (fixed heights in header and card).

## Key Files
- `src/components/NextFlight.tsx`: Main application logic and duty viewer.
- `src/components/Settings.tsx`: Configuration for Webcal URL and Base.
- `src/utils/storage.ts`: Handles local persistence of user profile and sync timestamps.
- `src/api/api.ts`: Connects to Firebase Cloud Functions for roster parsing.
- `public/manifest.json`: PWA configuration (icons, standalone mode).

## Workflow Preferences
- **Builds**: Always run `npm run build` after UI changes before deploying. The generated `build/` folder is local-only and ignored by Git.
- **Deployment**: Deployment is handled via `firebase deploy --only hosting`.
- **Sync**: Roster parsing is performed by an external Firebase Function (separate project); this app only consumes the JSON result.

## Style Guidelines
- **Typography**: Prefers standard MUI font weights. Hours should not be bold.
- **Layout**: Top-aligned content with consistent margins (`px: 3`, `pt: 4`) for mobile stability.
- **Branding**: Uses custom icons generated from Gemini, versioned with `?v=2` in `index.html` to bypass aggressive mobile caching.
