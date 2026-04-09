#!/bin/bash
# ATLAS startup script — double-click to launch both backend and frontend

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════════╗"
echo "║         ATLAS  ·  Starting up        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Start backend
echo "→ Starting backend (Flask on :3001)..."
cd "$DIR/backend"
source venv/bin/activate
python server.py &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "→ Starting frontend (Vite on :5173)..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 2

echo ""
echo "✓ ATLAS is running at http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both services."
echo ""

# Wait and clean up on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'ATLAS stopped.'" INT TERM
wait
