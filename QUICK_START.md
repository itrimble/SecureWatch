# 🚀 SecureWatch Quick Start

## ✅ Setup Complete!

Your SecureWatch SIEM platform is now fully configured with:
- ✅ Supabase authentication (GitHub OAuth)
- ✅ JWT verification in backend
- ✅ Frontend with auth components
- ✅ API bridge for secure communication

## 🎯 Quick Start

### One Command to Run Everything:
```bash
cd /Users/ian/Scripts/SecureWatch
./start-dev.sh
```

This will:
1. Install dependencies if needed
2. Start backend on http://localhost:3000
3. Start frontend on http://localhost:3001

### Manual Start (Two Terminals):
```bash
# Terminal 1: Backend
cd /Users/ian/Scripts/SecureWatch
npm run dev

# Terminal 2: Frontend
cd /Users/ian/Scripts/SecureWatch/frontend
PORT=3001 npm run dev
```

## 🧪 Test Authentication

1. **Open Frontend**: http://localhost:3001
2. **Click "Sign in with GitHub"** in the header
3. **Authorize the app** on GitHub
4. **Test Backend Connection**: Go to http://localhost:3001/auth-test
5. **Click "Test Backend Authentication"** to verify JWT flow

## 📁 Key Files

```
SecureWatch/
├── .env.local                    # Backend env (✅ configured)
├── frontend/.env.local           # Frontend env (✅ configured)
├── src/lib/auth.ts              # JWT verification
├── src/middleware.ts            # Auth middleware
├── frontend/components/header.tsx # Auth UI
├── frontend/lib/api-service.ts   # API client
└── start-dev.sh                 # Dev server script
```

## 🔍 Verify Everything Works

1. **Frontend Auth**: You should see your email after login
2. **Backend API Test**: Should return success with user info
3. **Console**: No CORS or auth errors

## 🛠️ Troubleshooting

### "Failed to fetch JWKS"
- Check if backend is running on port 3000
- Verify Supabase URL in .env.local

### "Authentication required"
- Make sure you're logged in via GitHub
- Check browser DevTools for JWT token

### CORS Issues
- Frontend must run on different port than backend
- Use the start-dev.sh script which sets PORT=3001

## 🎉 Success!

Your SecureWatch SIEM is ready! The authentication pipeline is:
```
GitHub → Supabase → JWT → Frontend → Backend API → Protected Resources
```

Next steps:
- Explore the event logger features
- Build custom dashboards
- Add more protected API endpoints