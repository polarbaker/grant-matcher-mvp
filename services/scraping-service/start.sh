#!/bin/bash

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo "Please update the API keys and configuration in .env"
    exit 1
fi

# Install dependencies
npm install

# Build the project
npm run build

# Start the service
npm run start
