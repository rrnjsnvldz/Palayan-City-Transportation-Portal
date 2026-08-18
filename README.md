# City of Palayan Transportation Portal

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/palayan-transport.git
cd palayan-transport
npm install
cd server && npm install && cd ..
```

### 2. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/schema.sql`
3. Then run `supabase/seed.sql` for demo data
4. Go to **Settings → API** and copy your keys

### 3. Environment Variables

**Frontend** — create `palayan-transport/.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001
```

**Backend** — create `palayan-transport/server/.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=palayan_transport_secret_2026
GPS_DEVICE_KEY=gps_device_palayan_2026
PORT=3001
```

### 4. Run Locally
```bash
# Terminal 1 — Backend
cd server && node index.js

# Terminal 2 — Frontend
npm run dev
```

Open http://localhost:5173

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@palayan.gov.ph | admin123 |
| Requestor | juan@palayan.gov.ph | pass123 |
| Driver | manny@palayan.gov.ph | driver123 |

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy — frontend + API routes auto-configure via `vercel.json`

---

## GPS Hardware Integration

```
POST https://your-app.vercel.app/api/gps/update
Header: X-Device-Key: gps_device_palayan_2026

Body: { "vehicleId": 1, "lat": 15.5413, "lng": 121.1082, "speed": 45.2, "fuel": 78.5 }
```

All connected dashboards update live via **Supabase Realtime**.

---

## Tech Stack

- **Frontend**: React + Vite, Leaflet maps, Supabase Realtime
- **Backend**: Node.js + Express (Vercel serverless functions)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime (replaces Socket.IO)
- **Auth**: JWT
- **Hosting**: Vercel
