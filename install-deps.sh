#!/bin/bash

echo "Installing dependencies for all services..."

# Frontend
echo "Installing frontend dependencies..."
cd frontend
npm install

# Scraping Service
echo "Installing scraping service dependencies..."
cd ../services/scraping-service
npm install

# Recommendation Engine
echo "Installing recommendation engine dependencies..."
cd ../recommendation-engine
npm install

# User Management
echo "Installing user management dependencies..."
cd ../user-management
npm install

echo "All dependencies installed!"
