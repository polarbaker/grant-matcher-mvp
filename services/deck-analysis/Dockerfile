FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install numpy first, then other dependencies
RUN pip install numpy==1.23.5 && \
    pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download en_core_web_sm

COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads

EXPOSE 4001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4001"]
