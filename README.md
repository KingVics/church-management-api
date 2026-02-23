# Church Management API

Backend API for church operations: members, attendance, departments, reports, follow-up, and WhatsApp automation via WAHA.

## Core Features

- Member management
- Attendance tracking
- Department management
- Call and follow-up workflows
- Role and permission based access
- Reports and exports
- WhatsApp automation (WAHA)

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT auth
- node-cron

## Local Setup

```bash
git clone https://github.com/KingVics/church-management-api.git
cd church-management-api
pnpm install
cp .env.example .env
pnpm start
```

Swagger UI:

- `http://localhost:5000/doc`

## WAHA WhatsApp Integration

WAHA docs:

- https://waha.devlike.pro/docs/overview/quick-start/

### 1. Start WAHA Docker

```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -e WAHA_API_KEY=your-secret-key \
  devlikeapro/waha
```

If WAHA runs on another host port, use that port in `WAHA_API_URL`.

### 2. Add WhatsApp Environment Variables

Add to `.env`:

```env
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your-secret-key
WAHA_SESSION=default
WEBHOOK_BASE_URL=https://your-domain.com/api/v1/whatsapp/webhook

CHURCH_NAME=Victory Chapel
WHATSAPP_COMMUNITY_LINK=https://chat.whatsapp.com/your-group-link
SERVICE_TIME=9:00 AM
```

### 3. Start and Manage WAHA Session from This API

All endpoints below are exposed by this backend under `/api/v1/whatsapp`.

- Start session (create if missing, then start): `POST /api/v1/whatsapp/session/start`
- Get QR code payload: `GET /api/v1/whatsapp/session/qr`
- Check session status: `GET /api/v1/whatsapp/session-status`
- Stop session: `POST /api/v1/whatsapp/session/stop`
- Restart session: `POST /api/v1/whatsapp/session/restart`
- Logout session: `POST /api/v1/whatsapp/session/logout`

After calling `session/start`, call `session/qr`, scan with your WhatsApp app, then verify with `session-status`.

### 4. Webhook

Set WAHA webhook URL to:

- `https://your-domain.com/api/v1/whatsapp/webhook`

Local example:

- `http://localhost:5000/api/v1/whatsapp/webhook`

### 5. WhatsApp Business Flows Exposed by API

- Welcome first-timer: `POST /api/v1/whatsapp/welcome/:memberId`
- Sunday reminder: `POST /api/v1/whatsapp/broadcast/sunday-reminder`
- Event broadcast: `POST /api/v1/whatsapp/broadcast/event`
- Emergency broadcast: `POST /api/v1/whatsapp/broadcast/emergency`
- Custom broadcast: `POST /api/v1/whatsapp/broadcast/custom`
- Manual message: `POST /api/v1/whatsapp/send/:memberId`
- Absent reminders: `POST /api/v1/whatsapp/send-absent-reminders`
- Consent update: `PATCH /api/v1/whatsapp/consent/:memberId`

History and analytics:

- `GET /api/v1/whatsapp/broadcast-history`
- `GET /api/v1/whatsapp/broadcast-history/:broadcastId`
- `GET /api/v1/whatsapp/activity/:memberId`
- `GET /api/v1/whatsapp/journey/:memberId`
- `GET /api/v1/whatsapp/journeys`

### 6. Test Manually in Swagger

1. Open `http://localhost:5000/doc`.
2. Authorize with your Bearer JWT.
3. Use the `WhatsApp` tagged endpoints.

## License

MIT
