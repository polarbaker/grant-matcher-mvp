#!/bin/bash

# Function to start a service in a new terminal window
start_service() {
    local service_name=$1
    local service_dir=$2
    local start_command=$3
    
    osascript -e "tell application \"Terminal\" to do script \"echo Starting $service_name... && cd $(pwd)/$service_dir && $start_command\""
}

# Start each service in a new terminal window
start_service "Frontend" "frontend" "npm start"
start_service "Scraping Service" "services/scraping-service" "npm run dev"
start_service "Recommendation Engine" "services/recommendation-engine" "npm run dev"
start_service "User Management" "services/user-management" "npm run dev"

echo "All services started! Check the terminal windows for each service."
