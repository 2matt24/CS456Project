FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    unixodbc \
    unixodbc-dev \
    gcc \
    g++ \
    build-essential \
    apt-transport-https \
    ca-certificates

# Add Microsoft GPG key and repository properly (Debian 12 compatible)
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
    > /etc/apt/sources.list.d/mssql-release.list

# Install Microsoft ODBC Driver 18
RUN apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18

# Set working directory
WORKDIR /app

# Copy project files
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 10000

# Start app with gunicorn
CMD ["gunicorn", "aistudyassistant.app:app", "--bind", "0.0.0.0:10000"]