# Vibe Social Network

A modern full-stack social network built with React, Vite, Tailwind CSS, Node.js, Express, Socket.IO, and MongoDB.

## Features

- **Authentication**: JWT-based sign up, login, profile edit, and password management.
- **Social Feed**: Interactive feed showing posts, reels, and stories.
- **Post & Media**: Uploading images/videos (Cloudinary), likes, comments, and post editors.
- **Messaging**: Real-time group chat and peer-to-peer messaging using Socket.IO.
- **Search & Discover**: Discover users, groups, and content dynamically.
- **Notifications**: Instant notifications for likes, comments, messages, and friend requests.
- **Admin Panel**: Manage users, groups, and view platform statistics.

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Framer Motion (Animations)
- React Query (Data fetching)
- Zustand (State management)
- Socket.IO Client

### Backend
- Node.js & Express.js
- MongoDB & Mongoose
- Socket.IO
- Cloudinary (Media storage)
- Zod (Validation)

## Setup and Installation

### Prerequisites
- Node.js >= 20.0.0
- MongoDB instance

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/vanthuongg/SocialMediaBasic.git
   ```
2. Set up Backend:
   ```bash
   cd backend
   npm install
   # Create a .env file based on example configurations
   npm run dev
   ```
3. Set up Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
