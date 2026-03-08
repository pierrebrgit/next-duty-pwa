# Next Duty PWA ✈️

A standalone, personal Progressive Web App (PWA) designed for flight crew to view their upcoming duty roster with zero friction. Optimized for offline use and quick access during flight operations.

## ✨ Features

- **Personalized Duty Viewer**: A clean, centered timeline showing Pick-up, Report, Departure, and Arrival times.
- **Offline First**: All roster data is stored locally using `localStorage`. The app works in Airplane Mode thanks to a dedicated Service Worker.
- **Quick Sync**: A one-tap refresh button on the home screen to fetch the latest roster from Cyberjet.
- **Return Flight Optimization**: Automatically displays both Pick-up and Report times when away from base (ORY).
- **History Navigation**: Browse through your entire duty history, past and future.
- **Data Currency Badge**: Real-time status indicating when the roster was last synced, with warnings for outdated data.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase CLI (`npm install -g firebase-tools`)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/pierrebrgit/next-duty-pwa.git
   cd next-duty-pwa
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

### Deployment
1. Build the production app:
   ```bash
   npm run build
   ```
2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## 📱 Mobile Installation (Android/iOS)
1. Open the deployed URL in Chrome (Android) or Safari (iOS).
2. Android: Tap the **three dots (⋮)** and select **"Install App"**.
3. iOS: Tap the **Share icon** and select **"Add to Home Screen"**.

## 🛠 Tech Stack
- **React** (TypeScript)
- **Material UI** (Timeline & Layout)
- **Firebase Hosting** (Web hosting)
- **Firebase Cloud Functions** (Roster parsing logic)
- **Workbox** (PWA Service Worker management)

---
*Created with 💙 for personal flight operations.*
