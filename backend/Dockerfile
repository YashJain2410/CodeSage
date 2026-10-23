FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Cloud inference is the default. Opt in to local models at image build time.
ARG INSTALL_LOCAL_MODELS=false
COPY requirements.txt requirements-local-models.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN if [ "$INSTALL_LOCAL_MODELS" = "true" ]; then \
      pip install --no-cache-dir -r requirements-local-models.txt \
        --extra-index-url https://download.pytorch.org/whl/cpu; \
    fi

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]