# Restaurant Finance Management System

Comprehensive financial management for restaurants with offline support. Track income, expenses, due accounts, and analytics.

## Features

- **Income & Expense Tracking** - Record sales orders and business expenses
- **Due Accounts** - Manage customer credit accounts with payment tracking
- **Dashboard** - Real-time stats and financial charts
- **Reports** - Profit/loss statements, sales analytics, and item performance
- **Menu Management** - Manage menu items with categories and pricing
- **Offline Support** - Works offline with automatic sync when online
- **Role-based Access** - Admin, Manager, and Staff roles
- **Multi-organization** - Support for multiple restaurant organizations

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI**: shadcn/ui components
- **Database**: MongoDB with Mongoose
- **Auth**: NextAuth.js with credentials provider
- **Offline**: IndexedDB, Service Workers, Background Sync
- **Forms**: React Hook Form, Zod validation
- **Charts**: Recharts
- **Tables**: TanStack Table

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/restaurant-fin
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### Running the App

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Default User

After first run, create an admin user through the signup or use seeded credentials if available.

## Project Structure

```
src/
├── app/              # Next.js app router pages and API routes
├── components/       # React components
│   ├── dashboard/    # Dashboard-specific components
│   ├── records/      # Income/expense components
│   ├── due-accounts/ # Due account components
│   ├── ui/           # shadcn/ui components
│   └── offline/      # Offline indicator
├── lib/              # Utility functions and configurations
│   └── offline/      # IndexedDB and sync managers
├── models/           # Mongoose models
├── types/            # TypeScript type definitions
└── hooks/            # Custom React hooks
```

## Offline Architecture

The app uses IndexedDB for local storage and syncs with MongoDB when online:
- Records are saved locally when offline
- Queued operations sync automatically when connection restores
- Service worker caches static assets for instant loading

## License

MIT
