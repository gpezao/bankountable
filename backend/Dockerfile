FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make start script executable
RUN chmod +x start.sh || true

# Expose port
EXPOSE 8000

# Run the application with initialization
CMD ["/bin/bash", "-c", "python db_init.py && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]
