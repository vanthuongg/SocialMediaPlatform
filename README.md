# 🌐 SocialMediaPlatform — Full-Stack Social Network Platform

SocialMediaPlatform is a modern, high-performance, full-stack social network platform designed with a clean, decoupled architecture. Built using **React + Vite** on the frontend and **Node.js + Express.js + Socket.IO + MongoDB** on the backend, SocialMediaPlatform offers real-time notifications, interactive feed layouts, stories, reels, messaging, group management, and a robust admin dashboard.

---

## 🚀 Key Features

### 🔐 1. Authentication & Security
- **Secure JWT Flow**: Short-lived Access Tokens (stored in memory/headers) and HTTP-Only Refresh Cookies.
- **Robust Verification**: Verify email registration and password reset flows via secure nodemailer templates.
- **API Protection**: Helmet middleware headers, Express Rate Limiting, and Express Mongo Sanitize (NoSQL injection defense).

### 📰 2. Dynamic Social Feed & Reels
- **Personalized Feed**: Seamless post loading showing text, images, and video attachments.
- **Reels & Stories**: Quick short-video scrolling (Reels) and temporary status posts (Stories) with progress bar animations.
- **Engagement Modules**: Real-time reaction clicks (like, heart, care, etc.) and expandable multi-level comments.

### 💬 3. Real-Time Chat & Collaboration
- **Direct & Group Messaging**: Seamless instant messaging powered by WebSockets via Socket.IO.
- **Online Indicator & Typing States**: Live client indicators showing who is online or currently typing.
- **Group Management**: Create user groups, assign roles, define group posts, and organize discussions.

### ⚙️ 4. Administration & Notifications
- **Real-Time Notification Center**: Instant alerts for comments, reactions, messaging, and group invitations.
- **Admin & Moderator Dashboards**: Live platform usage statistics, user directory search, and custom action boards.
- **Advanced Reels & Group Moderation**: Moderate user-submitted short videos (preview/delete) and communities (approve/decline/restrict).
- **Temporary Ban & Warning System**: Administrative control to warn or temporarily suspend user accounts with automatic ban expiration.
- **Banned Suspended Warning Pages**: Explicit login blocker pages notifying users of warning counts and active ban remaining times.

---

## 🛠️ Tech Stack & Dependencies

### Frontend
- **Framework & Build Tools**: React 18, Vite, Tailwind CSS
- **State Management**: Zustand (lightweight global store)
- **Data Querying**: React Query (TanStack Query) for cache management
- **Real-Time Connections**: Socket.IO Client
- **Animations**: Framer Motion for premium micro-interactions
- **UI Elements**: Radix UI primitives & Lucide React icons

### Backend
- **Framework & Runtime**: Node.js, Express.js
- **Database ORM**: MongoDB + Mongoose (ACID transactions enabled where necessary)
- **Validation Boundary**: Zod schema validators for incoming request bodies
- **Media Upload**: Multer + Cloudinary Storage
- **Communication Services**: Nodemailer (SMTP integration)

---

## 📂 Project Structure

```
SocialMediaPlatform/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection, Env validation (Zod)
│   │   ├── features/           # Layered feature modules (Controllers, Routes, Services)
│   │   │   ├── admin/          # Admin/Moderator features (stats, reports, user bans)
│   │   │   ├── auth/           # SignUp, Login, JWT verification, password recovery
│   │   │   ├── comments/       # Comment creation, nested replies, comment likes
│   │   │   ├── groups/         # Group spaces, posts, member role configurations
│   │   │   ├── messages/       # Conversation channels and chat logic
│   │   │   ├── notifications/  # Notification generation and retrieval
│   │   │   ├── posts/          # User feed posts, attachments, hashtags
│   │   │   ├── reels/          # Short vertical video model operations
│   │   │   ├── search/         # Global unified search engine
│   │   │   ├── stories/        # Temporary story media sharing
│   │   │   └── users/          # Users directory, profiles, friend/follow systems
│   │   ├── shared/             # Global error handlers, middlewares, utility functions
│   │   └── socket/             # Socket.IO connection configurations
│   ├── scripts/                # Database seeding files (admin, groups)
│   ├── server.js               # Express application entrypoint
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Root App router definitions (router.jsx, App.jsx)
│   │   ├── features/           # Frontend pages & component modules
│   │   │   ├── admin/          # Admin users lists, moderation queues, ban panels
│   │   │   ├── auth/           # Login/Signup forms, verification page, suspension notice
│   │   │   ├── feed/           # Main user feed dashboard, reels shelf
│   │   │   ├── friends/        # Friends directory and request handlers
│   │   │   ├── groups/         # Group pages, lists, creation modal
│   │   │   ├── messages/       # Conversation window layout, inbox sidebar
│   │   │   ├── notifications/  # Notifications center page
│   │   │   ├── posts/          # Post cards, post detail view, comments widget
│   │   │   ├── profile/        # User dynamic profile walls
│   │   │   ├── reels/          # Fullscreen scrollable vertical reels deck
│   │   │   ├── search/         # Unified search results template
│   │   │   └── stories/        # Active user story slider view
│   │   ├── shared/             # Shared API instance, layouts, hook & store utilities
│   │   │   ├── api/            # Axios instance and header interceptors
│   │   │   ├── components/     # Reusable components (Avatar, Button, Modal, layouts)
│   │   │   │   └── layouts/    # MainLayout, AdminLayout, AuthLayout, Sidebars
│   │   │   ├── hooks/          # Global React hooks (useTheme, useAuth, useSocket)
│   │   │   └── stores/         # Global Zustand state managers (auth, socket, chat)
│   │   ├── styles/             # Tailwind base & custom components (index.css)
│   │   └── main.jsx
│   ├── tailwind.config.js      # Custom theme palettes and design tokens
│   ├── vite.config.js          # API proxying and dev server configurations
│   └── package.json
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the root/backend directory:

```env
# General
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5174

# Database
MONGO_URI=mongodb://localhost:27017/social-media-platform

# Authentication Tokens
JWT_ACCESS_SECRET=your_super_secure_access_secret_key_at_least_16_characters
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_at_least_16_characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Nodemailer SMTP Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM="SocialMediaPlatform <noreply@socialmediaplatform.com>"

# Cloudinary CDN Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Link Expiry Limits (in minutes/hours)
PASSWORD_RESET_EXPIRES_IN=15
EMAIL_VERIFY_EXPIRES_IN=24
```

---

## 🧭 REST API Endpoints Overview

All endpoints are prefixed with `/api/v1`.

| Module | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `POST` | `/auth/signup` | Register new user account | No |
| | `POST` | `/auth/login` | Log in and receive refresh cookie + access token | No |
| | `POST` | `/auth/refresh` | Refresh expired access tokens | No |
| | `POST` | `/auth/logout` | Clear refresh token cookies | Yes |
| **Users** | `GET` | `/users/me` | Fetch currently logged in user profile | Yes |
| | `PUT` | `/users/profile` | Update profile information | Yes |
| | `GET` | `/users/:username` | Fetch user details by username | Yes |
| **Posts** | `GET` | `/posts` | Fetch paginated general feed posts | Yes |
| | `POST` | `/posts` | Create new post (supports files/videos) | Yes |
| | `DELETE` | `/posts/:id` | Delete post by owner or admin | Yes |
| **Comments** | `POST` | `/posts/:postId/comments` | Write a comment on a post | Yes |
| | `GET` | `/posts/:postId/comments` | Get comments list for a post | Yes |
| **Groups** | `GET` | `/groups` | List user joined groups | Yes |
| | `POST` | `/groups` | Create a new community group | Yes |
| **Realtime Chat** | `GET` | `/messages/rooms` | Fetch active user chatrooms | Yes |
| | `GET` | `/messages/room/:roomId` | Fetch message history in room | Yes |
| **Search** | `GET` | `/search` | Global search for users/posts/groups | Yes |
| **Admin** | `GET` | `/admin/dashboard` | Retrieve moderator dashboard counts | Yes (Admin/Mod) |
| | `GET` | `/admin/users` | List all system users with role/warning filters | Yes (Admin) |
| | `PATCH` | `/admin/users/:id/ban` | Ban/unban a user account (supports temp bans) | Yes (Admin) |
| | `POST` | `/admin/users/:id/warn` | Issue a formal moderation warning to a user | Yes (Admin) |
| | `GET` | `/admin/reels` | Fetch all user reels for moderation review | Yes (Admin/Mod) |
| | `DELETE` | `/admin/reels/:id` | Delete a reel from the platform | Yes (Admin/Mod) |
| | `GET` | `/admin/groups` | Fetch all groups for moderation review | Yes (Admin/Mod) |
| | `PATCH` | `/admin/groups/:id/ban` | Restrict or ban a group space | Yes (Admin) |

---

## 📡 WebSockets & Socket.IO Events

Real-time actions are coordinated via a persistent Socket connection.

### Client-to-Server Events
- `join_room(data)`: Payload `{ roomId }`. Adds client socket instance to room.
- `leave_room(data)`: Payload `{ roomId }`. Removes client socket from room.
- `send_message(data)`: Payload `{ roomId, text, attachments }`. Broadcasts message.
- `typing(data)`: Payload `{ roomId, isTyping }`. Broadcasts typing indicator status.

### Server-to-Client Events
- `receive_message(data)`: Payload `{ messageObject }`. Sent to all clients in a room.
- `user_typing(data)`: Payload `{ isTyping, userId }`. Informs room members of typing state.
- `new_notification(data)`: Payload `{ notificationObject }`. Pushed directly to a user's unique channel on likes/comments/chat alerts.

---

## 🚀 Setup & Installation

### Local Setup

#### Step 1: Initialize Database
Ensure your MongoDB local instance or MongoDB Atlas cluster is up and running.

#### Step 2: Set Up Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Set up database mock data/seed configurations:
   ```bash
   # Seed default admin credentials
   npm run seed:admin
   # Seed default group mock directories
   npm run seed:groups
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:5000`.

#### Step 3: Set Up Frontend
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the Vite client:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5174` (requests are automatically proxied to `http://localhost:5000` via `vite.config.js`).

---

### Docker Compose Setup

You can launch the entire ecosystem (MongoDB, Backend Node Server, Nginx Frontend build) using a single command:

1. Ensure Docker and Docker Compose are installed.
2. Build and run containers:
   ```bash
   docker-compose up --build
   ```
3. The frontend is accessible at `http://localhost:80` (or `http://localhost` on your machine) and backend service calls route directly inside the shared bridge network.

---

## 🧑‍💻 Contributing & Best Practices

When committing new code to this project, ensure you respect:
1. **Clean Modularity**: Organize controllers, services, and routing rules inside their respective `features/` folders. Keep Business Logic out of Express routing parameters.
2. **Error Boundaries**: Handle service errors using custom `AppError` exceptions, letting the centralized express error-handling middlewares manage standard responses.
3. **Responsive Aesthetics**: Follow mobile-first layouts, leveraging custom animation components and dark mode classes configured in Tailwind.
