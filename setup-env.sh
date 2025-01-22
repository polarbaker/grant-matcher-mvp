#!/bin/bash

# Create .env files from examples
echo "Setting up environment files..."

# Frontend
if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "Created frontend/.env"
fi

# User Management Service
if [ ! -f services/user-management/.env ]; then
    cp services/user-management/.env.example services/user-management/.env
    echo "Created services/user-management/.env"
fi

# Recommendation Engine
if [ ! -f services/recommendation-engine/.env ]; then
    cp services/recommendation-engine/.env.example services/recommendation-engine/.env
    echo "Created services/recommendation-engine/.env"
fi

# Scraping Service
if [ ! -f services/scraping-service/.env ]; then
    cp services/scraping-service/.env.example services/scraping-service/.env
    echo "Created services/scraping-service/.env"
fi

echo "Environment files created! Please update the following:"
echo "1. Frontend .env: Set your API URLs"
echo "2. User Management .env: Set JWT_SECRET and email configuration"
echo "3. Recommendation Engine .env: Set your OPENAI_API_KEY"
echo "4. Scraping Service .env: Set your OPENAI_API_KEY"
