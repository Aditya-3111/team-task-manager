FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y default-libmysqlclient-dev gcc pkg-config && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120"]
