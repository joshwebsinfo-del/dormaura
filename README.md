# GlassNest 🏠✨

> **A futuristic, cinematic private boarding house digital ecosystem for ~78 students.**

Built with **Next.js 15 App Router**, **TypeScript**, **Tailwind CSS**, **Supabase**, **Framer Motion**, **Zustand**, and **React Query**.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Go to **Authentication → Providers** and enable:
   - Email (with OTP)
   - Google OAuth
4. Go to **Storage** and create these **public** buckets:
   - `avatars`
   - `post-images`
   - `marketplace`
   - `lost-found`
5. Go to **Realtime** and enable for tables:
   - `posts`, `channel_messages`, `direct_messages`, `knock_notifications`

### 4. Add Approved Students

In Supabase **Table Editor → approved_students**, add your students:

| full_name | room_number | email | phone_number |
|-----------|-------------|-------|--------------|
| John Doe | A101 | john@gmail.com | +1234567890 |
| Jane Smith | B205 | jane@yahoo.com | +0987654321 |

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated routes
│   │   ├── page.tsx        # 🏠 Home Feed
│   │   ├── chats/          # 💬 Channels & DMs
│   │   ├── notices/        # 📋 Notice Board
│   │   ├── marketplace/    # 🛍️ Mini Marketplace
│   │   ├── profile/        # 👤 User Profile
│   │   ├── directory/      # 👥 Student Directory
│   │   ├── maintenance/    # 🔧 Maintenance Requests
│   │   ├── confessions/    # 🤫 Anonymous Confessions
│   │   ├── lost-found/     # 🔍 Lost & Found
│   │   ├── who-has/        # 🙋 Who Has?
│   │   └── polls/          # 🗳️ Polls
│   ├── auth/               # 🔐 Authentication
│   ├── admin/              # 🛡️ Admin Dashboard
│   └── search/             # 🔍 Global Search
├── components/
│   ├── features/           # Feature components
│   ├── layout/             # App shell, nav
│   └── ui/                 # Glass, badges, etc.
├── lib/
│   ├── supabase/           # Supabase clients
│   └── utils.ts            # Utilities
├── store/                  # Zustand stores
└── types/                  # TypeScript types
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔒 **Approved-only signup** | Only whitelisted student emails can register |
| 🌐 **Social Feed** | Posts, images, likes, comments with real-time updates |
| 💬 **Real-time Chat** | 5 community channels + direct messages |
| 🏠 **Room Knock** | Tap to notify someone you're at their door |
| 😊 **Mood System** | Set studying/gaming/sleeping/prayer moods |
| ✅ **Availability** | Live status: In Room, Away, Busy, Sleeping |
| 📋 **Notice Board** | Pinnable admin announcements |
| 🔧 **Maintenance** | Report & track room issues |
| 🛍️ **Marketplace** | Buy/sell within the nest |
| 🤫 **Confessions** | Anonymous posts with moderation |
| 🔍 **Lost & Found** | Post lost/found items with photos |
| 🙋 **Who Has?** | Request items from neighbors |
| 🗳️ **Polls** | Quick community votes |
| 👥 **Directory** | Browse all 78 students |
| 🛡️ **Admin Dashboard** | Full control panel |
| 📱 **PWA** | Installable on mobile |

---

## 🎨 Design System

- **Glassmorphism**: frosted glass panels with backdrop blur
- **Aurora backgrounds**: animated canvas-based particle system
- **Neon accents**: cyan `#00f5ff` + violet `#7c3aed`
- **Framer Motion**: smooth animations throughout
- **Dark-first**: deep black `#050508` base

---

## 🚀 Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repo to [vercel.com](https://vercel.com) and add your env vars.

---

## 🛡️ Security

- Supabase Row Level Security on all tables
- Email whitelist gate on registration
- Protected routes via middleware
- Moderator/admin role-based access control
- Realtime channel security

---

*GlassNest — Where the nest comes alive* ✨
