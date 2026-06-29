# 💬 ChatApp — WhatsApp Clone (MERN + Socket.io)

Real-time chat app with 1-on-1 messaging, group chats, typing indicators, online status, and message history.

---

## 🗂️ Project Structure

```
whatsapp-clone/
├── backend/                    ← Node.js + Express + Socket.io + MongoDB
│   ├── server.js               ← Main server (Express + Socket.io)
│   ├── .env.example            ← Environment variables template
│   ├── package.json
│   ├── config/
│   │   └── db.js               ← MongoDB connection
│   ├── models/
│   │   ├── User.js             ← User schema (auth, online status)
│   │   ├── Conversation.js     ← Chat / group schema
│   │   └── Message.js          ← Message schema
│   ├── routes/
│   │   ├── auth.js             ← POST /register  POST /login
│   │   ├── users.js            ← GET /users  GET /users/search
│   │   ├── conversations.js    ← GET / POST /direct  POST /group
│   │   └── messages.js         ← GET /:id  POST /
│   ├── middleware/
│   │   └── authMiddleware.js   ← JWT protect middleware
│   └── socket/
│       └── socketHandler.js    ← All Socket.io events
│
└── frontend/                   ← React + Vite
    ├── index.html
    ├── vite.config.js          ← Proxy: /api → localhost:5000
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx             ← Router + Protected routes
        ├── index.css           ← Dark theme CSS variables
        ├── utils/
        │   └── api.js          ← Axios instance with auth header
        ├── context/
        │   ├── AuthContext.jsx ← Login / register / logout state
        │   └── SocketContext.jsx ← Socket.io connection + online users
        └── components/
            ├── Auth/
            │   ├── Login.jsx
            │   └── Register.jsx
            ├── Chat/
            │   ├── ChatLayout.jsx    ← Main layout wrapper
            │   ├── Sidebar.jsx       ← Conversation list + search
            │   ├── ChatWindow.jsx    ← Message area + header
            │   └── MessageInput.jsx  ← Input box + typing indicator
            └── Group/
                └── CreateGroupModal.jsx ← Create group chat
```

---

## ⚡ Setup Guide (Step by Step)

### Step 1 — Prerequisites

Install these first if not already installed:
- **Node.js** v18+ → https://nodejs.org
- **MongoDB** (local) → https://www.mongodb.com/try/download/community
  - OR use **MongoDB Atlas** (free cloud): https://cloud.mongodb.com

### Step 2 — Clone / Download Project

```bash
# If you downloaded the zip, extract it. Or if using git:
cd whatsapp-clone
```

### Step 3 — Backend Setup

```bash
# 1. Go to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file (copy from example)
cp .env.example .env

# 4. Edit .env with your values:
#    - MONGODB_URI: your MongoDB connection string
#    - JWT_SECRET: any random string (keep it secret!)
#    - PORT: 5000 (default)
#    - CLIENT_URL: http://localhost:3000
```

**.env file example:**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=mysupersecretkey123changeMe
CLIENT_URL=http://localhost:3000
```

**For MongoDB Atlas (cloud), MONGODB_URI looks like:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
```

```bash
# 5. Start backend (development mode with auto-restart)
npm run dev

# You should see:
# 🚀 Server running on http://localhost:5000
# ✅ MongoDB Connected: localhost
# 📡 WebSocket ready on ws://localhost:5000
```

### Step 4 — Frontend Setup

```bash
# Open a NEW terminal window, go to frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# You should see:
# ➜  Local:   http://localhost:3000
```

### Step 5 — Open App

Open your browser and go to: **http://localhost:3000**

- Register with 2-3 different email accounts (open in different browsers or incognito)
- Log in with each account and start chatting!

---

## 🚀 Features

| Feature | Status |
|---|---|
| User Register / Login with JWT | ✅ |
| 1-on-1 Private Chat | ✅ |
| Group Chat (unlimited members) | ✅ |
| Real-time messages via WebSocket | ✅ |
| Typing indicators | ✅ |
| Online / Offline status | ✅ |
| Message history (MongoDB) | ✅ |
| Read receipts (✓ / ✓✓) | ✅ |
| Search users by name or email | ✅ |
| WhatsApp-style dark theme | ✅ |
| Reconnect on network drop | ✅ |

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | Create account |
| POST | `/api/auth/login` | `{ email, password }` | Login |

### Users (requires JWT)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | Get all users |
| GET | `/api/users/search?q=name` | Search users |

### Conversations (requires JWT)
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/conversations` | — | My conversations |
| POST | `/api/conversations/direct` | `{ userId }` | Start DM |
| POST | `/api/conversations/group` | `{ name, participants[] }` | Create group |
| PUT | `/api/conversations/group/add` | `{ conversationId, userId }` | Add member |
| PUT | `/api/conversations/group/remove` | `{ conversationId, userId }` | Remove member |

### Messages (requires JWT)
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/messages/:conversationId` | — | Get chat messages |
| POST | `/api/messages` | `{ conversationId, content }` | Send message |

---

## ⚡ Socket.io Events

### Client → Server (emit)
| Event | Payload | Description |
|---|---|---|
| `join:conversations` | — | Join all conversation rooms |
| `join:conversation` | `conversationId` | Join specific room |
| `message:send` | `{ conversationId, content }` | Send a message |
| `typing:start` | `{ conversationId }` | Started typing |
| `typing:stop` | `{ conversationId }` | Stopped typing |
| `messages:read` | `{ conversationId }` | Mark as read |

### Server → Client (listen)
| Event | Payload | Description |
|---|---|---|
| `message:received` | Message object | New message arrived |
| `typing:start` | `{ userId, userName, conversationId }` | Someone typing |
| `typing:stop` | `{ userId, conversationId }` | Stopped typing |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |
| `messages:read` | `{ conversationId, userId }` | Messages read |

---

## 🛠️ Common Errors & Fixes

**MongoDB connection error:**
- Make sure MongoDB is running: `mongod` (for local)
- Check your MONGODB_URI in .env

**CORS error:**
- Make sure CLIENT_URL in backend .env matches your frontend URL exactly

**Socket not connecting:**
- Check that the backend is running on port 5000
- In SocketContext.jsx, the URL `http://localhost:5000` must match your backend

**npm install fails:**
- Try: `npm install --legacy-peer-deps`
- Make sure Node.js version is 18+: `node --version`

---

## 📦 Tech Stack

**Backend:**
- Node.js + Express
- Socket.io (real-time WebSocket)
- MongoDB + Mongoose (database)
- JWT + bcryptjs (auth)

**Frontend:**
- React 18 + Vite
- React Router v6
- Socket.io-client
- Axios (HTTP)
- date-fns (time formatting)

---

## 🔐 Security Notes

- Change JWT_SECRET to a long random string in production
- Use HTTPS in production (required for secure WebSocket `wss://`)
- Consider rate-limiting your API with `express-rate-limit`
- Store passwords are hashed with bcrypt (12 salt rounds)

---

*Built with ❤️ — MERN Stack + Socket.io*
