#!/bin/bash

# SecureWatch Development Server Startup Script

echo "🚀 Starting SecureWatch SIEM Platform..."
echo ""

# Check if node_modules exists in both directories
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install --legacy-peer-deps && cd ..
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down SecureWatch..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start backend
echo "🔧 Starting backend on http://localhost:3000..."
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend on http://localhost:4001..."
cd frontend && PORT=4001 npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ SecureWatch is running!"
echo ""
echo "📍 Backend:  http://localhost:3000"
echo "📍 Frontend: http://localhost:4001"
echo "🧪 Auth Test: http://localhost:4001/auth-test"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait