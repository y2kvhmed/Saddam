# Physics with Mr. Saddam

A Google Classroom-style app built with Expo and Supabase for physics education.

## Features

- **Role-based Authentication**: Admin, Teacher, and Student roles
- **Assignment Management**: Create, submit, and grade assignments
- **Class Management**: Organize students into classes
- **PDF Submissions**: Students can submit PDF assignments
- **Real-time Updates**: Using Supabase real-time features

## Test Admin Access

For testing purposes, you can access admin features using:
- Email: `Admin`
- Password: `Adm1n1strat0r`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Supabase:
   - Create a new Supabase project
   - Update `lib/supabase.ts` with your project URL and anon key
   - Run the SQL schema from `docs/context.md`

3. Start the development server:
   ```bash
   npm start
   ```

## Tech Stack

- **Frontend**: Expo (React Native), TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Navigation**: Expo Router
- **UI**: Custom iOS-themed components

## Project Structure

```
app/
├── (tabs)/          # Tab navigation screens
├── _layout.tsx      # Root layout
├── index.tsx        # Splash screen
└── login.tsx        # Login screen

components/          # Reusable UI components
lib/                # Utilities and services
types/              # TypeScript type definitions
```

## Color Scheme

- Primary: `#001F3F` (Navy Blue)
- Background: White (with dark mode support)
- iOS-inspired design with rounded corners and soft shadows