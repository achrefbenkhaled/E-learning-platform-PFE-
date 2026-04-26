#!/bin/bash

# E-Learning Platform Quick Start Script

echo "🚀 E-Learning Platform Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Backend setup
echo "📦 Installing Backend Dependencies..."
cd backend
npm install
echo "✓ Backend dependencies installed"
echo ""

# Frontend setup
echo "📦 Installing Frontend Dependencies..."
cd ../frontend
npm install
echo "✓ Frontend dependencies installed"
echo ""

# Return to root
cd ..

echo "================================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Make sure MongoDB is running"
echo "2. In one terminal: cd backend && npm run dev"
echo "3. In another terminal: cd frontend && npm run dev"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:5000"
echo ""
echo "Documentation: See README.md and PHASE1_SETUP.md"
