# Deployment Checklist

## Pre-Launch Setup

### 1. Environment Variables
- Copy `.env.example` to `.env`
- Update with your actual Supabase credentials

### 2. Database Setup
```bash
# Run in Supabase SQL Editor:
psql -f production-schema.sql
psql -f storage-policies.sql
```

### 3. Assets
- Add required icons to `/assets/` directory (see assets/README.md)

### 4. Test Admin Access
- Username: `Admin`
- Password: `Adm1n1strat0r`

## Deployment Commands

### Development
```bash
npm install
expo start
```

### Production Build
```bash
# Android
expo build:android

# iOS  
expo build:ios

# Web
expo export:web
```

## Post-Launch
- Change default admin password
- Create real user accounts
- Set up proper backup procedures
- Monitor audit logs