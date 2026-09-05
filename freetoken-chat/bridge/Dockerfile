FROM python:3.12-slim

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download tiktoken encoding data
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

COPY . .

# Data volume for SQLite
VOLUME ["/data"]

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
