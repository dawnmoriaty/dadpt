#!/usr/bin/env bash
# Generate gRPC Python stubs from proto file.
# Run from aiservice/ directory:  bash scripts/gen_proto.sh

set -e

PROTO_DIR="proto"
OUT_DIR="src/grpc_server/generated"

mkdir -p "$OUT_DIR"

python -m grpc_tools.protoc \
    -I "$PROTO_DIR" \
    --python_out="$OUT_DIR" \
    --grpc_python_out="$OUT_DIR" \
    --pyi_out="$OUT_DIR" \
    "$PROTO_DIR/ai_agent.proto"

# Fix imports in generated code (grpc_tools generates absolute imports)
sed -i 's/import ai_agent_pb2/from . import ai_agent_pb2/g' "$OUT_DIR/ai_agent_pb2_grpc.py" 2>/dev/null || true

echo "✅ Proto stubs generated in $OUT_DIR"
