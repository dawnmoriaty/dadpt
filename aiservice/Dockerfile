FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy source
COPY proto/ proto/
COPY src/ src/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Generate gRPC stubs (if protoc available)
RUN python -m grpc_tools.protoc \
    -I proto \
    --python_out=src/grpc_server/generated \
    --grpc_python_out=src/grpc_server/generated \
    proto/ai_agent.proto || true

EXPOSE 8100 50051

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8100"]
