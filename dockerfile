FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    unixodbc \
    unixodbc-dev \
    libodbc2 \
    gcc \
    g++ \
    build-essential \
    apt-transport-https \
    ca-certificates

# Microsoft repo
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
 > /etc/apt/sources.list.d/mssql-release.list

RUN apt-get update \
 && ACCEPT_EULA=Y apt-get install -y msodbcsql18

WORKDIR /app
COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 10000



CMD ["sh", "-c", "gunicorn aistudyassistant.app:app --bind 0.0.0.0:$PORT"]