# Grant Matcher MVP

An intelligent platform that matches startup pitch decks with relevant grant opportunities using advanced NLP/ML techniques.

## Architecture Overview

The application follows a microservices architecture with the following components:

### Frontend
- React-based SPA with Material UI
- State management using Redux
- React Router for navigation
- Responsive design and accessibility features

### Backend Services
1. **Deck Analysis Service**
   - Handles pitch deck uploads and processing
   - OCR and NLP analysis
   - Built with Python (FastAPI)

2. **Recommendation Engine Service**
   - Matches pitch content with grants
   - ML-based scoring system
   - Built with Node.js/Express

3. **Scraping Service**
   - Automated grant opportunity collection
   - Regular updates and monitoring
   - Built with Node.js/Express

4. **User Management Service**
   - Authentication and authorization
   - Profile management
   - Built with Node.js/Express

### Data Storage
- PostgreSQL for user data and structured information
- MongoDB for unstructured analysis results
- Redis for caching
- S3 for file storage

## Getting Started

### Prerequisites
- Node.js >= 16
- Python >= 3.8
- Docker and Docker Compose
- PostgreSQL >= 13
- MongoDB >= 5.0
- Redis >= 6.0

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd grant-matcher-mvp
```

2. Install dependencies:
```bash
# Frontend
cd frontend
npm install

# Backend services
cd ../services/user-management
npm install
# Repeat for other Node.js services

# Python services
cd ../deck-analysis
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development environment:
```bash
docker-compose up
```

5. Access the application:
- Frontend: http://localhost:3000
- API Documentation: http://localhost:8000/docs

## Testing

The Grant Matcher platform includes comprehensive testing for both frontend and backend components. Here's how to run the tests:

### Running All Tests
```bash
npm test
```
This will run all tests across the frontend and backend services.

### Running Specific Tests
- Frontend tests: `npm run test:frontend`
- User Management Service: `npm run test:user`
- Recommendation Engine: `npm run test:recommendation`
- Scraping Service: `npm run test:scraping`

### Test Coverage
To check test coverage across all services:
```bash
npm run test:coverage
```

### What's Being Tested

#### Frontend Tests
- User authentication flows (login/register)
- Grant list display and filtering
- Pitch deck upload functionality
- Component rendering and user interactions

#### Backend Tests
- User Management: Authentication, authorization, and user data handling
- Recommendation Engine: Grant matching algorithms and filtering
- Scraping Service: Web scraping reliability and data parsing

## API Documentation

Detailed API documentation is available in the `/docs` directory and through Swagger UI when running the services.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
