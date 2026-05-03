# 🏙️ City Day App

משחק עיר דיגיטלי עם ניהול קבוצות בזמן אמת.

## Stack
- **Backend**: Node.js + Express + TypeScript + Socket.io
- **Database**: MongoDB + Mongoose
- **Frontend**: Angular
- **Upload**: Multer (local, upgrade to S3 in production)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally

### 1. Clone & Install
```bash
git clone <repo>
cd city-day-app
npm run install:all
```

### 2. Configure Server
```bash
cd server
cp .env.example .env
# Edit .env - set MONGODB_URI, JWT_SECRET, ADMIN_PASSWORD
```

### 3. Run Dev
```bash
# From root - runs both server and client
npm run dev

# Or separately:
cd server && npm run dev     # http://localhost:3000
cd client && npm run dev     # http://localhost:4200
```

---

## 📁 Project Structure

```
city-day-app/
├── server/src/
│   ├── app.ts              # Entry point
│   ├── models/index.ts     # All MongoDB models
│   ├── routes/index.ts     # All API routes
│   ├── controllers/        # Business logic
│   │   ├── auth.controller.ts
│   │   ├── groups.controller.ts
│   │   ├── missions.controller.ts
│   │   ├── submissions.controller.ts
│   │   └── messages.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT + response helpers
│   │   └── upload.middleware.ts # Multer
│   ├── socket/
│   │   └── socket.handler.ts   # Socket.io events
│   └── types/index.ts          # Shared TypeScript types
│
└── client/src/app/
    ├── core/services/
    │   ├── api.service.ts      # HTTP wrapper
    │   ├── auth.service.ts     # Auth state
    │   └── socket.service.ts   # Socket.io
    └── features/
        ├── admin/              # Admin dashboard
        └── player/             # Player screens
```

---

## 🔌 API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/join` | ❌ | Player joins game |
| POST | `/api/auth/admin-login` | ❌ | Admin login |
| GET  | `/api/auth/me` | ✅ | Get current user |

### Groups
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/groups` | ❌ | List all groups |
| POST   | `/api/groups` | 👑 | Create group |
| PUT    | `/api/groups/:id` | 👑 | Update group |
| DELETE | `/api/groups/:id` | 👑 | Delete group |
| GET    | `/api/groups/:id/members` | 👑 | List members |

### Missions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/missions` | ✅ | Get active missions |
| POST | `/api/missions` | 👑 | Create mission |
| PUT  | `/api/missions/:id` | 👑 | Update mission |
| POST | `/api/missions/:id/unlock` | 👑 | Unlock mission |
| POST | `/api/missions/:id/hint/:order/unlock` | 👑 | Unlock hint |

### Submissions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/submissions` | ✅ | Submit answer |
| GET  | `/api/submissions/my` | ✅ | My group's submissions |
| GET  | `/api/submissions` | 👑 | All submissions |
| PUT  | `/api/submissions/:id/review` | 👑 | Approve/reject |
| GET  | `/api/submissions/stats` | 👑 | Scoreboard |

### Messages
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/messages` | ✅ | My messages |
| POST | `/api/messages` | 👑 | Send message |
| PUT  | `/api/messages/welcome` | 👑 | Set welcome message |

---

## ⚡ Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `user:joined` | Server→Admin | Player joined |
| `mission:unlocked` | Server→All | New mission available |
| `submission:received` | Server→Admin | New submission |
| `submission:reviewed` | Server→Group | Feedback received |
| `message:new` | Server→Group/All | New message |
| `hint:unlocked` | Server→Group/All | Hint revealed |

---

## 🛣️ Next Steps (in order)

1. `cd server && npm install && npm run dev` - verify server starts
2. Create Angular components for join screen + admin dashboard
3. Add auth guards in Angular routing
4. Add notification toast for socket events
5. Build admin dashboard (groups, missions, submissions panels)
6. Build player screens (current mission, submit answer, messages)
7. Add scoreboard / live leaderboard
8. Production: swap local upload to AWS S3

> **Tip**: Use Postman/Insomnia to test all APIs before building the UI.
