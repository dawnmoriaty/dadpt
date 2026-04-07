# CHƯƠNG 4: XÂY DỰNG, TRIỂN KHAI VÀ KIỂM THỬ HỆ THỐNG

## 4.1 TỔNG QUAN KIẾN TRÚC TRIỂN KHAI

### 4.1.1 Tổng quát về hệ thống

Hệ thống SmartBus được thiết kế theo mô hình **kiến trúc vi dịch vụ** với ba thành phần chính hoạt động độc lập:

**1. Tầng giao diện di động (Expo/React-Native)**
Ứng dụng di động được biên dịch từ codebase TypeScript/React-Native duy nhất, chạy trên iOS và Android. Vai trò chính:
- Cung cấp giao diện người dùng cho đặt vé xe khách
- Xử lý tương tác người dùng (nhấn, vuốt, nhập biểu mẫu)
- Quản lý trạng thái cục bộ (Zustand store) cho lưu cache dữ liệu
- Ghi âm giọng nói thông qua API âm thanh của Expo
- Gửi yêu cầu tới Máy chủ qua giao thức HTTPS

**2. Dịch vụ máy chủ chính (Go + Gin Framework)**
Máy chủ chính được viết bằng ngôn ngữ Go, chạy trên môi trường sản xuất với kiến trúc lục giác. Vai trò:
- Cung cấp các điểm kết nối (API) cho ứng dụng di động (GET/POST /api/v1/*)
- Nhận yêu cầu từ Dịch vụ trí tuệ nhân tạo để cập nhật dữ liệu
- Quản lý xác thực & phân quyền (mã thông báo JWT)
- Xử lý logic đặt vé (phòng chống tình huống chạy đua thông qua các khóa phân tán)
- Truy vấn cơ sở dữ liệu trực tiếp và lưu cache qua Redis

**3. Dịch vụ trí tuệ nhân tạo (Python + FastAPI + LangGraph)**
Dịch vụ chuyên biệt xử lý quy trình hội thoại do trí tuệ nhân tạo điều khiển. Vai trò:
- Nhận yêu cầu luồng gRPC từ Máy chủ (chứa dữ liệu âm thanh)
- Chạy quy trình điều phối (6 nút trong máy trạng thái LangGraph)
- Tích hợp với các nhà cung cấp mô hình ngôn ngữ lớn (OpenAI, Google) qua LangChain
- Xử lý đầu vào giọng nói (chuyển đổi giọng nói thành văn bản) qua API Google Cloud
- Sinh phản hồi và chuyển thành âm thanh (chuyển đổi văn bản thành giọng nói)
- Gửi luồng phản hồi trở lại qua gRPC

### 4.1.2 Luồng giao tiếp giữa các lớp

Ba lớp này giao tiếp qua:
- **HTTPS/REST** giữa Mobile ↔ Backend: Cho booking queries, user auth, trip search. Mobile gửi request, Backend xử lý và trả JSON response
- **gRPC Stream** giữa Backend ↔ AI Service: Cho voice chat processing. Backend nhận audio từ mobile, wrap thành gRPC message, stream tới AI. AI streams back intermediate results (STT progress, transcript, intent, final response, audio URL)
- **External APIs**: Backend gọi PostgreSQL (data), Redis (cache), RabbitMQ (async jobs). AI gọi Google Cloud Speech API (STT), Google Cloud TTS API (text-to-speech), OpenAI API (LLM), Qdrant (vector search)

### 4.1.3 Nguyên tắc thiết kế kiến trúc

Hệ thống tuân theo các nguyên tắc sau:

**Tách biệt chức năng**: Mỗi dịch vụ chỉ chịu trách nhiệm một chức năng cụ thể. Máy chủ không xử lý âm thanh (đó là việc của Dịch vụ trí tuệ nhân tạo). Dịch vụ trí tuệ nhân tạo không quản lý xác thực (Máy chủ làm). Di động chỉ xử lý giao diện (không có logic kinh doanh). Điều này giúp:
- Dễ bảo trì: Khi thay đổi logic đặt vé, chỉ cần sửa Máy chủ
- Dễ kiểm thử: Kiểm thử mỗi dịch vụ riêng lẻ
- Dễ mở rộng: Có thể tăng số công nhân của Dịch vụ trí tuệ nhân tạo để xử lý nhiều yêu cầu hội thoại giọng nói

**Xử lý không có trạng thái**: Các dịch vụ không lưu trạng thái trong bộ nhớ máy. Nếu dịch vụ bị sự cố, yêu cầu của người dùng không bị mất:
- Máy chủ: Không lưu dữ liệu phiên (chỉ xác minh mã thông báo JWT)
- Dịch vụ trí tuệ nhân tạo: Không lưu lịch sử hội thoại (chỉ xử lý một yêu cầu tại một thời điểm)
- Mọi trạng thái đều được lưu trong cơ sở dữ liệu (PostgreSQL) hoặc bộ nhớ cache (Redis)

**Giao tiếp không đồng bộ**: Sử dụng hàng đợi thư (RabbitMQ) cho các tác vụ không yêu cầu trả lời ngay lập tức:
- Khi người dùng đặt vé, máy chủ gửi thư vào hàng đợi, trả lời ngay lập tức
- Một quy trình riêng lấy thư từ hàng đợi, xử lý thanh toán (có thể chậm vì gọi PayOS)
- Khi thanh toán hoàn tất, gửi thông báo tới di động qua kết nối Web
- Lợi ích: Giao diện trước không chờ, không hết thời gian

**Tính nhất quán dữ liệu**: Sử dụng Redis + PostgreSQL khóa cấp hàng để đảm bảo không có tình huống chạy đua:
- Khi 2 người dùng cùng lúc đặt vé 1 ghế, khóa Redis đảm bảo chỉ 1 người được đặt
- PostgreSQL `SELECT FOR UPDATE` đảm bảo tính nguyên tử của việc đọc-rồi-ghi
- Kết quả: 0 lỗi quá đặt dù có 500 người dùng đồng thời

---

## 4.2 TRIỂN KHAI HỆ THỐNG (DEPLOYMENT STRATEGY)

### 4.2.1 Chiến lược triển khai toàn bộ hệ thống

Hệ thống SmartBus sử dụng **distributed deployment strategy** - mỗi thành phần được triển khai trên nền tảng tối ưu nhất cho use case của nó:

#### **Giao diện trước: Triển khai trên Vercel (được khuyến nghị)**

**Tại sao chọn Vercel?**
- Ứng dụng di động Expo/React-Native được xuất thành ứng dụng web (sử dụng React Native Web)
- Vercel là nền tảng mạng phân phối nội dung chuyên biệt cho giao diện trước, cung cấp:
  - Mạng biên toàn cầu (triển khai trên 280+ vị trí biên)
  - Chứng chỉ HTTPS & SSL tự động
  - Quản lý biến môi trường
  - Triển khai tự động từ GitHub (đẩy → kiểm thử tự động → triển khai tự động)
  - Triển khai dự kiến cho các yêu cầu kéo
  - Phân tích & giám sát tích hợp
  - Chi phí: Tầng miễn phí cho dự án cá nhân, $20/tháng cho phiên bản chuyên nghiệp (các dự án không giới hạn)

**Cấu trúc triển khai Vercel**:
```
Kho GitHub (thư mục di động)
         ↓
Đẩy Git
         ↓
GitHub webhook → API Vercel
         ↓
Xây dựng Vercel: npm install → npm run build → xuất tài sản tĩnh
         ↓
Triển khai trên Mạng biên Vercel (Quay lại tự động nếu xây dựng không thành công)
         ↓
Hoạt động tại: https://smartbus.vercel.app
         (Dự kiến tự động tại: https://[số-yêu-cầu-kéo].smartbus.vercel.app)
```

**Cấu hình Vercel (vercel.json)**:
```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": ".expo/web",
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.smartbus.vn",
    "EXPO_PUBLIC_WS_URL": "wss://api.smartbus.vn/ws"
  },
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Quy trình tích hợp liên tục/triển khai liên tục**:
- Lập trình viên đẩy mã lên GitHub
- Vercel tự động kích hoạt xây dựng (tải phụ thuộc, biên dịch TypeScript, làm gói)
- Kết quả xây dựng (~5MB nén) được tối ưu hóa, bộ nhớ cache bị vô hiệu hóa, triển khai trên mạng phân phối nội dung
- DNS chỉ đến máy chủ biên Vercel, máy chủ biên định tuyến tới máy chủ gần nhất với người dùng
- Máy chủ gốc (ví dụ: Netlify) có thể đặt dự phòng

**Lợi ích so với tự host**:
- Không cần duy trì máy chủ (tự động mở rộng)
- Không lo chứng chỉ SSL (tự động gia hạn)
- Không lo mạng phân phối nội dung (tích hợp sẵn)
- Các liên kết URL dự kiến cho mỗi yêu cầu kéo
- Triển khai nguyên tử (không có thời gian ngừng)
- Quay lại chỉ bằng 1 cú nhấp chuột

**Biến môi trường Vercel**:
- `EXPO_PUBLIC_API_URL`: Miền máy chủ (ví dụ: https://api.smartbus.vn)
- `EXPO_PUBLIC_WS_URL`: Điểm kết nối Web (ví dụ: wss://api.smartbus.vn/ws)
- `EXPO_PUBLIC_AI_WS_URL`: Web của Dịch vụ trí tuệ nhân tạo (tùy chọn, nếu được sử dụng để truyền phát)
- Biến env sản xuất từ bí mật GitHub, biến env dàn diễn khác

#### **Máy chủ chính: Máy ảo đám mây / Kubernetes (AWS/GCP/Azure)**

**Tại sao không dùng Vercel cho Máy chủ?**
- Máy chủ sử dụng kết nối cơ sở dữ liệu tồn tại (các hàm Vercel có thời gian chờ 10 giây)
- Máy chủ sử dụng Web (Vercel không hỗ trợ kết nối lâu dài)
- Máy chủ cần địa chỉ IP tĩnh để chấp nhận kết nối cơ sở dữ liệu

**Tùy chọn triển khai**:
1. **Tùy chọn A: Máy ảo đơn (Đơn giản, dùng cho dàn diễn)**
   - AWS EC2 t3.medium (2 lõi, 4GB RAM, ~$25/tháng)
   - Docker Compose bắt đầu tất cả 8 dịch vụ
   - Nginx nghe trên :443
   - Chi phí: thấp, dễ quản lý

2. **Tùy chọn B: Cụm Kubernetes (Doanh nghiệp, dùng cho sản xuất)**
   - AWS EKS / Google GKE / Azure AKS
   - Triển khai Máy chủ, Dịch vụ trí tuệ nhân tạo, Nginx dưới dạng các nhóm riêng biệt
   - Tự động mở rộng dựa trên CPU/bộ nhớ
   - Tự xử lý: sự cố nhóm → tự động khởi động lại
   - Chi phí: cao ($500+/tháng), nhưng độ sẵn sàng cao

**Thiết lập được khuyến nghị**:
- Dàn diễn: Tùy chọn A (Docker Compose trên EC2)
- Sản xuất: Tùy chọn B (Kubernetes để đáng tin cậy)

**Tích hợp liên tục/Triển khai liên tục cho Máy chủ**:
```
Đẩy Git vào nhánh chính
    ↓
GitHub Actions kích hoạt
    ↓
Xây dựng: go build, docker build -t backend:$SHA
    ↓
Kiểm thử: go test ./..., artillery tải kiểm thử
    ↓ (nếu kiểm thử vượt qua)
Đẩy vào Sổ đăng ký Docker (AWS ECR / Docker Hub)
    ↓
Triển khai: kubectl đặt hình ảnh triển khai/backend ...
    ↓
Kubernetes: cập nhật lăn (không có thời gian ngừng)
    ↓
Kiểm tra sức khỏe: curl /health trả về 200 OK
```

#### **Dịch vụ trí tuệ nhân tạo: Máy ảo GPU chuyên dụng (GCP/AWS)**

**Tại sao cần GPU?**
- Tổng hợp văn bản thành giọng nói nhanh hơn 10 lần trên GPU
- Chuyển đổi giọng nói thành văn bản nhanh hơn 3 lần trên GPU
- Với 1000 hội thoại giọng nói đồng thời/ngày, GPU tiết kiệm chi phí đáng kể

**Deployment**:
- GCP Compute Engine n1-standard-4 + Tesla K80 GPU (~$200/month)
- hoặc AWS g3s.xlarge (~$250/month)
- Docker image: `smartbus-ai-service:$SHA`
- Auto-scaling: Trigger when queue depth > 100

### 4.2.2 Quy trình xây dựng chi tiết (Build Process)

Build process là bước biến source code thành runnable artifact (binary hoặc docker image). Chia làm 3 phase:

#### **Phase 1: Frontend Build (Expo → Web Bundle)**

**Input**: TypeScript + React Native code từ `mobile/` folder

**Build steps**:
```
1. Dependency resolution
   pnpm install
   - Download packages từ npm registry
   - Lock file ensures reproducible builds
   
2. TypeScript compilation
   tsc
   - Convert .tsx → .js
   - Type check (if error, build fails here)
   
3. Bundling (using metro bundler for Expo)
   expo build:web
   - Combine all .js files thành single bundle
   - Tree-shake unused code
   - Minify (reduce size by 70%)
   - Output: .expo/web/ folder (~5MB gzipped)

4. Upload to Vercel CDN
   vercel deploy --prod
   - Push code to Vercel
   - Vercel CDN distribute globally
   - Users download từ nearest edge location
```

**Optimization techniques**:
- Code splitting: Large routes loaded on-demand
- Image optimization: Automatic WebP conversion
- Caching: Static assets cached forever (content-addressed names)

#### **Phase 2: Backend Build (Go → Binary)**

**Input**: Go code từ `backend/` folder

**Build is Multi-Stage Docker build**:
```
STAGE 1 - Builder
├─ Use golang:1.21 image (contains Go compiler, git, gcc)
├─ WORKDIR /app
├─ COPY go.mod go.sum ./
├─ go mod download (fetch all dependencies into /go/pkg/mod)
├─ COPY . . (copy source code)
├─ sqlc generate (generate Go code từ SQL queries, commit ở repo)
├─ go build -o /bin/app ./cmd/app/main.go
│  Output: /bin/app (binary, ~25MB)

STAGE 2 - Runtime
├─ Use alpine:latest (minimal Linux, 5MB)
├─ COPY --from=builder /bin/app . (copy binary from stage 1)
├─ EXPOSE 8080
├─ RUN apk add ca-certificates (for HTTPS client certs)
└─ Final image size: 30MB (vs 150MB if single-stage)
```

**Why multi-stage?**
- Builder stage: Has compiler, tools, source code (large)
- Runtime stage: Has only compiled binary + runtime deps (small)
- Reduces deployment time: 150MB → 30MB = 5x faster deployment

**Build commands**:
```bash
# Build image
docker build -t smartbus-backend:latest ./backend

# Tag with version
docker tag smartbus-backend:latest smartbus-backend:v1.2.3

# Push to registry
docker push smartbus-backend:v1.2.3

# Deploy: pull and run
docker run -d smartbus-backend:v1.2.3
```

#### **Phase 3: AI Service Build (Python → Docker Image)**

**Input**: Python code từ `aiservice/` folder

**Multi-stage build similar to backend**:
```
STAGE 1 - Builder
├─ Use python:3.11 image
├─ Create virtual environment: python -m venv /opt/venv
├─ pip install -r requirements.txt
│  Downloads: numpy, torch, fastapi, langchain, etc.
│  Could be 1GB+
├─ Collect into /opt/venv (contains all packages)

STAGE 2 - Runtime
├─ Use python:3.11-slim (smaller, ~90MB vs 900MB)
├─ COPY --from=builder /opt/venv /opt/venv
├─ Add system libraries: libpq5 (for database)
├─ Final image size: 250MB
```

**Build commands**:
```bash
docker build -t smartbus-ai-service:latest ./aiservice

# If using GPU, tag specially
docker tag smartbus-ai-service:latest smartbus-ai-service:latest-gpu

# Deploy to GPU machine
docker run --gpus all smartbus-ai-service:latest-gpu
```

### 4.2.3 Cấu hình hệ thống cơ sở (Infrastructure Services)

Infrastructure services là các công cụ không phải application logic nhưng cần thiết cho hệ thống hoạt động:

| Service | Mục đích | Công nghệ | Kết nối từ | Cấu hình |
|---------|---------|----------|-----------|---------|
| **PostgreSQL** | Persistent data store (trips, bookings, users, payments) | pgx driver, row-level locks `SELECT FOR UPDATE` | Backend only | 8GB RAM, 100GB SSD, vacuum daily |
| **Redis** | Cache + distributed locks | SETEX with TTL, INCR for counters | Backend + AI | 4GB RAM, persistence via AOF |
| **Qdrant** | Vector database for embeddings (FAQ search) | Cosine similarity, filtering API | AI Service | 50GB storage, replicas for HA |
| **RabbitMQ** | Async message queue (payment processing, notifications) | AMQP protocol, dead-letter queues | Backend only | 2GB RAM, queue persistence |
| **Nginx** | Reverse proxy + load balancer + SSL termination | HTTP/HTTPS routing, gzip compression | Internet | Let's Encrypt SSL, rate limiting |

**Topology toàn bộ**:
```
Internet (users on various networks)
    ↓ HTTPS
[Nginx:443 - Reverse Proxy & SSL]
    ├─ Route /api/* → Backend:8080 (with round-robin load balancing)
    ├─ Route / → Vercel CDN (for static frontend)
    └─ Route /ws → Backend:8080 (WebSocket for real-time updates)

[Backend:8080 (Go)]
    ├─ PostgreSQL:5432 (data queries)
    ├─ Redis:6379 (cache, locks)
    └─ RabbitMQ:5672 (async jobs)

[AI Service:50051 (gRPC)]
    ├─ Qdrant:6333 (vector search)
    ├─ Google Cloud APIs (STT, TTS, LLM)
    └─ Redis:6379 (shared cache with Backend)
```

**Connection pooling strategy**:
- Backend: max_pool_size = 20 connections to PostgreSQL
  - Each request reuses connection from pool
  - Prevents connection exhaustion
- AI Service: async connection management
  - Uses `aioredis` for async Redis
  - Async httpx for Google APIs
- RabbitMQ: Consumer groups for distributed message processing
  - 3 workers listen on same queue
  - Each message processed by 1 worker
  - If worker crashes, message redelivered

**Network security**:
- All services on same VPC (private network)
- Only Nginx exposed to internet (port 80, 443)
- Backend, AI, databases only accessible from within VPC
- Database passwords from Kubernetes Secrets (not in code)

---

---

## 4.3 VOICE CHAT FLOW - KIẾN TRÚC CHI TIẾT

### 4.3.1 Phân tích dòng xử lý tổng quát

Voice Chat là public-facing feature cho phép người dùng nói câu hỏi, hệ thống trả lời bằng giọng nói. Điều này phức tạp hơn text chat bởi vì cần xử lý audio format, latency, bandwidth. Quá trình chia thành 6 bước chính, trải dài qua 3 lớp hệ thống:

**Bước 1-2: Tầng Mobile** - User nói vào microphone, mobile ghi âm thành WAV file, upload để server
**Bước 3-5: Tầng Backend** - Nhận audio dari mobile, forward tới AI Service qua gRPC, wait for response, cache result, return JSON
**Bước 4a-4e: Tầng AI Service** - Multi-step processing: STT → NLU → Tool calls → LLM → TTS
**Bước 6: Tầng Mobile lại** - Nhận response từ server, decode MP3, play audio, display text

```
┌─────────────────────────────────────────────────────────────────┐
│ MOBILE LAYER                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Step 1: User Record Audio (via Expo Audio API)                 │
│  - Format: PCM 16-bit, 16kHz sample rate, mono channel         │
│  - Duration: 30 seconds max (safety limit)                     │
│  - Storage: WAV (uncompressed, larger but faster to process)   │
│  - Latency: 0ms (user holds record button)                     │
│                                                                  │
│ Step 2: Upload to Backend API                                  │
│  - Protocol: HTTP POST with multipart/form-data                │
│  - Payload: audio blob (< 5MB), user_id, conversation_id       │
│  - Header: Authorization Bearer $JWT_TOKEN                     │
│  - Endpoint: POST /api/v1/ai/chat                              │
│  - Network latency: 100-500ms (depend on user network)         │
│  - Processing status: show spinner to user                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                        (HTTP)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND LAYER (Go)                                              │
├─────────────────────────────────────────────────────────────────┤
│ Step 3: Route to AI Service via gRPC Stream                    │
│  - Backend receive multipart data, extract audio_blob          │
│  - Validate: auth token, file format, size < 5MB               │
│  - Initialize gRPC duplex streaming connection                 │
│  - Send ChatRequest proto message containing audio_blob        │
│  - Backend now waits and collects response stream               │
│  - Latency: 50-100ms (internal network)                        │
│                                                                  │
│ Step 5: Cache Response & Return to Mobile                      │
│  - After AI returns full response (all stream chunks)           │
│  - Backend aggregate: transcript + response_text + audio_url   │
│  - Cache in Redis with key=conversation_id, TTL=5min           │
│    (if same user asks identical question within 5min → instant) │
│  - Return JSON to mobile: 200 OK                               │
│  - Latency: 10ms (to Redis)                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                        (gRPC)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ AI SERVICE LAYER (Python)                                       │
├─────────────────────────────────────────────────────────────────┤
│ Step 4a: Speech-to-Text (STT)                                  │
│  - Call Google Cloud Speech API v2                             │
│  - Config: model=latest_long, language=vi-VN, VAD=true         │
│  - VAD (Voice Activity Detection): remove silence segments     │
│  - Google processes audio asynchronously                       │
│  - Return: transcript string + confidence score (0-1)          │
│  - Validate: confidence > 0.5 (else retry or fail)             │
│  - Latency: 2000-3000ms (2-3 seconds)                          │
│                                                                  │
│ Step 4b: Intent Recognition & NLU                              │
│  - Call LLM (GPT-4-turbo via OpenAI API)                       │
│  - Prompt: "Classify user intent from transcript"              │
│  - Intents: search_trips, book, track_order, cancel, faq       │
│  - LLM returns JSON: { intent: "search_trips", confidence: 0.9 } │
│  - Latency: 1000-2000ms (1-2 seconds)                          │
│                                                                  │
│ Step 4c: Tool Routing & Data Extraction                        │
│  - If intent=search_trips: extract from_loc, to_loc, date      │
│  - Call Backend gRPC API: SearchTrips(from, to, date)          │
│  - Backend queries PostgreSQL, returns trip list               │
│  - AI reranktrips by user preference                           │
│  - If intent=faq: query Qdrant vector DB                       │
│    - Convert transcript to embedding (using sentence-transformer) │
│    - Search similar FAQ questions (cosine similarity)          │
│    - Return top-3 answers                                      │
│  - Latency: 500-1500ms (API calls + db query)                  │
│                                                                  │
│ Step 4d: Response Generation (LLM)                             │
│  - Call LLM again with full context                            │
│  - Context: transcript + intent + tool_results                 │
│  - Prompt: "Generate concise Vietnamese response (max 50 words)" │
│  - Max 50 words because TTS takes 3-5s, user impatient         │
│  - LLM return response text (e.g., "Có 3 chuyến xe...")        │
│  - Latency: 1000-2000ms                                        │
│                                                                  │
│ Step 4e: Text-to-Speech (TTS)                                  │
│  - Call Google Cloud TTS API                                   │
│  - Config: language=vi-VN, voice=neural-female, rate=1.0x      │
│  - Google synthesizes speech, return audio bytes (MP3, 64kbps)  │
│  - Upload MP3 to Google Cloud Storage (GCS)                    │
│  - Generate signed_url: valid for 1 hour (security)            │
│  - Return: audio_url to Backend                                │
│  - Latency: 1500-2500ms (1-2s TTS + 0.5s upload)               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                        (gRPC)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND LAYER (Go)                                              │
├─────────────────────────────────────────────────────────────────┤
│ Return to Mobile: {                                             │
│   "transcript": "Tôi muốn đặt vé từ Hà Nội tới Hồ Chí Minh",  │
│   "response": "Có 3 chuyến xe...",                             │
│   "audio_url": "https://gcs.googleapis.com/.../audio.mp3",     │
│   "confidence": 0.92,                                           │
│   "process_time_ms": 9000                                      │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                        (HTTP/JSON)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ MOBILE LAYER                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Step 6: Play Response Audio to User                            │
│  - Receive JSON response                                       │
│  - Display: transcript text + response text                    │
│  - Download audio from URL (GCS CDN)                           │
│  - Decode MP3 to PCM                                           │
│  - Play through speaker (or earpiece)                          │
│  - Save to local database for history                          │
│  - Latency: 500ms (download) + 5000ms (playback)               │
└─────────────────────────────────────────────────────────────────┘

TOTAL END-TO-END LATENCY:
  Mobile upload: 100-500ms
  Backend routing: 50-100ms
  AI STT: 2000-3000ms
  AI Intent: 1000-2000ms
  AI Tool routing: 500-1500ms
  AI LLM response: 1000-2000ms
  AI TTS: 1500-2500ms
  Backend caching: 10ms
  Mobile playback: 500-5500ms
  ────────────────────────
  TOTAL: 7660-15110ms ≈ 8-15 seconds end-to-end
  
This is acceptable for voice chat (similar to Siri/Google Assistant)
```

### 4.3.2 Chi tiết kỹ thuật từng bước - Tầm sâu hơn

#### **Step 1-2: Mobile Recording & Upload (Chi tiết)**

**Ghi âm**:
- Sử dụng `Expo.Audio.Recording` API (native Audio framework dưới hood)
- Sample rate phải 16kHz vì:
  - Google Cloud STT model trained on 16kHz audio
  - Human speech frequencies concentrate 0-8kHz (Nyquist: 2x frequency)
  - 16kHz là standard cho voice calls (8000 samples/sec = 8kHz bandwidth)
  - Cao hơn (48kHz) unnecessary, tốn băng thông & battery
- PCM 16-bit encoding:
  - Each sample = 2 bytes (values -32768 to +32767)
  - 30 seconds × 16000 samples/sec × 2 bytes = 960KB uncompressed
  - Do ghi kiến format: WAV = RIFF header + PCM data (không nén)

**File validation trước upload**:
```
Check size: file < 5MB (safety limit to prevent abuse)
           30s × 16kHz × 2bytes ≈ 1MB typical
Check format: ".wav" extension, RIFF header magic bytes
Check duration: <= 30 seconds (prevent timeout)
Retry logic: If upload fails, exponential backoff
            Attempt 1: immediate
            Attempt 2: wait 1s then retry
            Attempt 3: wait 2s then retry
            Attempt 4: wait 4s then retry
            If all fail: show "Network error" to user
```

**Upload mechanism**:
- Protocol: HTTP POST multipart/form-data (standard for file uploads)
- Payload:
  ```
  --boundary
  Content-Disposition: form-data; name="audio"; filename="voice_12345.wav"
  Content-Type: audio/wav
  [binary WAV data here]
  --boundary
  Content-Disposition: form-data; name="user_id"
  user_uuid_12345
  --boundary
  Content-Disposition: form-data; name="conversation_id"
  conv_uuid_67890
  --boundary
  ```
- Timeout: 30 seconds (if network too slow, show timeout error)
- Header Authentication: `Authorization: Bearer eyJhbGc...` (JWT token)

#### **Step 3: Backend Routes to AI Service via gRPC (Chi tiết)**

**Tại sao gRPC thay REST?**
- REST send JSON (text): {"audio": "base64(...)"} = 4/3 × data size
- gRPC send binary proto: [audio bytes directly] = original size
- Result: gRPC 25% faster for large payloads
- gRPC streaming: backend can send chunks progressively
  - Backend → AI: stream audio chunks as they arrive
  - AI → Backend: stream transcript + intent + response as ready
  - No need wait for complete:streamready before sending response

**gRPC proto definition**:
```protobuf
service Chat {
  rpc ProcessVoice(stream ChatRequest) returns (stream ChatResponse);
}

message ChatRequest {
  string conversation_id = 1;
  string user_id = 2;
  bytes audio_chunk = 3;          // Stream video chunks
  string language = 4;
  bool is_final_chunk = 5;        // Signal end of audio
}

message ChatResponse {
  enum Status {
    PROCESSING = 0;
    STT_COMPLETE = 1;
    INTENT_RECOGNIZED = 2;
    RESPONSE_GENERATED = 3;
    TTS_COMPLETE = 4;
    ERROR = 5;
  }
  Status status = 1;
  string transcript = 2;          // Only when STT_COMPLETE
  string intent = 3;              // Only when INTENT_RECOGNIZED
  string response_text = 4;       // Only when RESPONSE_GENERATED
  string audio_url = 5;           // Only when TTS_COMPLETE
  string error_message = 6;       // Only when ERROR
}
```

**Streaming logic**:
- Backend (client) sends ChatRequest with audio_chunks
- AI (server) streams back ChatResponse as it processes
- Backend collects all responses, extract final values
- Benefit: Mobile sees partial progress (transcript appears after 2s)

#### **Step 4a: Speech-to-Text (STT) - Deep dive**

**Google Cloud Speech-to-Text v2 API**:
- Differences from v1:
  - v1: synchronous, latency ~5s
  - v2: uses latest transformer models, latency ~2-3s
  - v2: Vietnamese model specifically tuned for Vietnamese speakers
  - v2: Better handling of accented speech, background noise

**Config khuyến nghị**:
```python
config = speech_v1.RecognitionConfig(
    encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
    sample_rate_hertz=16000,
    language_code="vi-VN",
    
    # Advanced settings:
    enable_automatic_punctuation=True,  # "Xin chào" not "xin chao"
    use_enhanced=True,                  # Use enhanced models
    model="latest_long",                # Trained for longer sentences
    max_alternatives=3,                 # Return 3 alternatives
    enable_word_time_offsets=False,     # Don't need timing of each word
    profanity_filter=False,             # Don't filter slang
)
```

**Why thêm choices**:
- `enable_automatic_punctuation=True`: Capitalization + punctuation are important for understanding (Tiến - name vs tiến - progress)
- `use_enhanced=True`: Trade-off latency +500ms for accuracy +5%
- `model=latest_long`: Optimized for 30-60s audio (vs model=default for <15s)
- `max_alternatives=3`: If confidence low, can show alternatives to user

**Error handling**:
```
If confidence < 0.5:
  - confidence is too low, high chance STT wrong
  - Show user: "Sorry, couldn't understand. Please try again."
  - Don't proceed to NLU (garbage in → garbage out)

If transcript empty:
  - Possible causes: silence, noise only, technical error
  - Retry or ask user to speak again

If language != vi-VN:
  - Auto-detect failed or user spoke English
  - Either translate to Vietnamese or ask user to speak Vietnamese
```

**Latency breakdown**:
- API call: 10ms
- STT processing: 1500-2000ms
- Return result: 10ms
- Total: 1500-2000ms (1.5-2 seconds)

#### **Step 4b: Intent Recognition via LLM (Chi tiết)**

**LLM choice rationale**:
- GPT-4-Turbo: Latest (as of April 2026), best accuracy for Vietnamese NLU
- Cost: $0.01/1K input tokens, $0.03/1K output tokens
  - Average voice message: 50 words = 60 tokens input
  - Typical cost: $0.0006 per request
  - 1000 requests/day = $0.60/day = $18/month reasonable

**Prompt engineering**:
```
System prompt:
  "You are a intelligent Vietnamese NLU classifier. 
   Always respond in JSON format only."

Few-shot examples:
  "Tôi muốn tìm vé từ Hà Nội đến Hồ Chí Minh"
  → {"intent": "search_trips", "confidence": 0.95}
  
  "Hủy giúp tôi cái booking này"
  → {"intent": "cancel", "confidence": 0.92}
  
  "Chi phí hủy là bao nhiêu?"
  → {"intent": "faq", "confidence": 0.88}

User message:
  {actual user transcript}

Classify the intent and return JSON.
```

**Why few-shot?**
- Zero-shot (no examples): GPT might hallucinate intents
- Few-shot (2-3 examples): Guides LLM behavior, improves accuracy
- Few-shot examples should cover edge cases

**Intents:**
- `search_trips`: User wants find buses by route/date
- `book`: User wants finalize booking (must have trip selected)
- `track_order`: User wants check existing booking status
- `cancel`: User wants cancel booking
- `faq`: General questions about policies, prices, etc.
- `chat`: Small talk / greeting (respond friendly, don't take action)

**Error handling**:
```
If confidence < 0.7:
  - Intent unclear, might misclassify
  - Ask user clarification: "Did you want to search or book?"
  
If intent not in predefined list:
  - LLM returned unknown intent
  - Fallback to "chat" mode
```

#### **Step 4c: Tool Routing & Backend API Calls (Chi tiết)**

**Case 1: search_trips Intent**
```
Extract from transcript:
  - Origin (from): Hà Nội, Hanoi, Northc ("origin" key)
  - Destination (to): Hồ Chí Minh, HCMC, Ho Chi Minh City
  - Date: "ngày mai" (tomorrow), "chủ nhật tới" (next Sunday), "13/4"
  - Passenger count: default = 1 (if user says "2 người" extract 2)
  - Time preference: buổi sáng (morning), buổi đêm (evening), any
  
Normalize location names:
  - Vietnamese cities have multiple names
  - "Hà Nội" = "Hanoi" = "Hn" = "Ha Noi"
  - Database has canonical names, so normalize user input
  
Call Backend gRPC:
  - Method: SearchTrips(origin, destination, date, passenger_count)
  - Backend queries PostgreSQL:
    SELECT * FROM trips 
    WHERE origin = 'Ha Noi' 
    AND destination = 'Ho Chi Minh'
    AND departure_date = '2026-04-08'
    AND available_seats >= 1
    ORDER BY departure_time ASC
  - Returns: array of Trip objects
    { busName, companyName, departureTime, price, availableSeats }
  
Rerank trips by user preference:
  - If user said "sáng sớm" (early morning): prioritize 6h-9h buses
  - If user said "rẻ nhất" (cheapest): sort by price ASC
  - Default: sort by departure_time ASC
  - Return top-3 trips to user (don't overload with 20 buses)
```

**Case 2: track_order Intent**
```
Extract booking_id from:
  - User's conversation history (previous bookings)
  - Phone number + date of booking (if user provides)
  
Call Backend gRPC:
  - Method: GetBooking(booking_id)
  - Backend queries PostgreSQL booking table
  - Returns: booking status (confirmed, pending_payment, cancelled, used)
  
Response examples:
  - "Booking của bạn được xác nhận, khởi hành 08:00 sáng mai"
  - "Bookinghoàn chưa thanh toán, vui lòng thanh toán trước 12h hôm nay"
```

**Case 3: faq Intent**
```
Query Qdrant vector DB:
  1. Convert transcript to embedding (768-dim vector)
     Using sentence-transformer pre-trained model
  2. Search Qdrant with cosine similarity
  3. Return top-3 FAQ answers with scores
  
Qdrant query:
  POST /searchpoints
  {
    "vector": [0.1, -0.2, ..., 0.3],  // 768 dims
    "limit": 3,
    "with_payload": true
  }
  
Results:
  - FAQ1: "Giá hủy là bao nhiêu?" → Answer: "20% giá vé"
  - FAQ2: "Có thể đổi ngày không?" → Answer: "Có thể đổi miễn phí"
  - FAQ3: "Giờ nhận vé?" → Answer: "30 phút trước khởi hành"
```

#### **Step 4d: Response Generation (LLM)**

**Full context for LLM**:
```
You are a helpful Vietnam bus booking assistant speaking Vietnamese.
Keep responses concise (maximum 50 words).

User transcript: "{transcript}"
Detected intent: "{intent}"
Tool results: {serialized_tool_results}

Generate a natural Vietnamese response that addresses user need.
Be friendly, helpful, and concise.
```

**Why 50 word limit?**
- 50 words in Vietnamese ≈ 70-100 characters
- TTS processing time: ~2-3 seconds for 50 words
- If response 200 words: wait 8-10s, user loses patience
- Trade-off: conciseness vs informativeness

**Example LLM responses**:
```
Input: 
  Transcript: "Tôi muốn đặt vé từ Hà Nội đến Hồ Chí Minh ngày mai"
  Intent: search_trips
  Tool result: 
    - Bus A: 6:00 AM, 250k
    - Bus B: 10:00 AM, 220k
    - Bus C: 2:00 PM, 200k

LLM output:
  "Có 3 chuyến xe từ Hà Nội đến Hồ Chí Minh ngày mai. 
   Chuyến 6 giờ: 250 nghìn, 10 giờ: 220 nghìn, 2 giờ chiều: 200 nghìn.
   Bạn chọn chuyến nào?"
   (= 40 words, good!)
```

#### **Step 4e: Text-to-Speech (TTS)**

**Google Cloud TTS API**:
- Modern neural voices (much better than old robotic TTS)
- Vietnamese female voice: `vi-VN-Neural2-A`
- Speaking rate: 1.0x (normal), can be 0.5x-2.0x if wanted
- Output formats: MP3 (64kbps), WAV, OGG Opus
- Latency: 1-2 seconds

**Upload to Cloud Storage**:
```
1. Synthesize speech → MP3 bytes (typed ~30-50KB for 30-word response)
2. Upload to Google Cloud Storage bucket
   - Bucket name: "smartbus-audio-cache"
   - Path: "voice/{conversation_id}_{timestamp}.mp3"
3. Generate signed URL (valid 1 hour)
   - URL expires after 1 hour (security, prevent URL sharing)
   - Using: blob.generate_signed_url(expiration=3600)
4. Return URL to Backend
   - Backend → Mobile in JSON response
```

**Why not store audio locally?**
- Mobile apps shouldn't cache audio (privacy concern)
- GCS URL can be cached by CDN
- Next user asking same question → hit cache, instant response
- URL expiration: prevents old URLs from working (privacy)

---

---

## 4.4 DEPLOYMENT WORKFLOW

### 4.4.1 Pre-Deployment (Chuẩn bị)

**Goals**: Đảm bảo code quality, test thực on staging

**Checklist**:
1. Code review approved (2+ senior engineers)
2. Unit tests: coverage > 80%, all passing
3. Integration tests: voice flow test passed on staging
4. Load test: 500 concurrent users, P99 < 500ms
5. Database migrations: tested backup/restore
6. Security scan: no CVE vulnerabilities
7. Performance comparison: new code vs old baseline

### 4.4.2 Deployment Phase

**Timeline**: 10-15 minutes downtime (if needed)

**Process**:
```
Step 1: Backup database (PostgreSQL dump)
Step 2: Build Docker images locally (test pass?)
Step 3: Push images to registry (Docker Hub / ECR)
Step 4: Pull latest images on production server
Step 5: Stop old containers (graceful shutdown)
Step 6: Run database migrations (if any)
Step 7: Start new containers (with health checks)
Step 8: Verify all services responsive (smoke test)
Step 9: Monitor for 5 minutes (error rate should be < 0.1%)
```

**Automated via**: GitHub Actions + deployment script

### 4.4.3 Post-Deployment (Xác minh)

**Metrics to check** (via monitoring dashboard):
- Error rate: should stay < 0.1%
- Response time P50/P95/P99: should be same as before
- Database connections: stable
- Cache hit rate: > 70%
- Voice chat success rate: > 95% (successful end-to-end flow)

**Rollback criteria**:
- Error rate > 1% for 5 minutes → automatic rollback
- Response time P99 > 2 seconds → manual rollback decision
- Critical bug reported → immediate rollback

**Rollback process**:
- Stop current containers
- Restore database from backup
- Pull previous Docker image version
- Start containers with old version
- Verify functionality

---

## 4.5 TESTING STRATEGY

### 4.5.1 Unit Testing

**Backend (Go)**:
- Individual handler tests (mock database)
- Business logic tests (booking calculation, pricing)
- Utility tests (validation, formatting)
- Coverage target: > 80%

**AI Service (Python)**:
- STT module: mock Google API, test with sample audio
- NLU module: test intent classification with various inputs
- LLM prompt construction: verify output format
- Vector search: test Qdrant integration
- Coverage target: > 75%

### 4.5.2 Integration Testing

**Scope**: How services talk to each other

**Test scenarios**:
1. **Auth flow**: Login → get JWT token → access protected API
2. **Booking flow**: Search trips → receive results → book → pay → confirmation
3. **Voice workflow**: Record audio → transcribe → search → respond with audio
4. **Error handling**: Network timeout → retry logic triggers
5. **Concurrent requests**: 10 users searching simultaneously → no race conditions

**Method**: Docker Compose up all services → run pytest/go test against live stack

### 4.5.3 Load Testing

**Tool**: Artillery.io (open source, JavaScript-based)

**Scenario**:
- Ramp up: 0 → 500 concurrent users over 5 minutes
- Sustain: 500 users for 5 minutes
- Ramp down: 500 → 0 over 2 minutes
- Total duration: 15 minutes

**Endpoints tested**:
- POST /api/v1/ai/chat (voice chat)
- GET /api/v1/trips (search)
- POST /api/v1/bookings (create booking)

**Success criteria**:
- P99 latency < 500ms (99% of requests answer in 500ms)
- Error rate < 0.1% (99.9% successful)
- Database connection pool stable (not exhausted)
- Memory usage stable (no leaks)

**Report**: Generates HTML dashboard with charts

### 4.5.4 Voice Chat Specific Tests

**Test cases**:
1. Clear speech (no background noise) → transcript accuracy > 90%
2. Noisy environment → still functional, confidence score low
3. Vietnamese with English code-mixing → correctly handled
4. Long queries (50+ words) → truncated intelligently
5. Silence (user doesn't speak) → timeout after 5s, user prompt
6. Network latency (backend slow) → gRPC stream timeout after 30s

---

## 4.6 INFRASTRUCTURE REQUIREMENTS

### Staging Server
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 100GB SSD
- **Services**: All 8 services on single machine
- **Cost**: ~$20/month (AWS t3.medium or similar)

### Production Setup
**Frontend**:
- 1x Nginx load balancer (AWS ALB)
- Backend: 2 instances (t3.xlarge, 4 cores, 16GB RAM each)
- AI Service: 3 instances (g4dn.xlarge with GPU, 4 cores, 16GB RAM, 1x Tesla V100)

**Database**:
- 1x PostgreSQL primary (db.r6i.2xlarge, 8 cores, 64GB RAM, 500GB SSD)
- 1x PostgreSQL read replica (backup)
- 1x Redis cluster (3 nodes), each 2 cores, 8GB RAM

**External**:
- Google Cloud APIs (Speech, TTS, Storage) → pay per request
- Qdrant Cloud (managed) → ~$100/month for 100GB storage

**Total monthly cost**: ~$2,000/month

---

## 4.7 MONITORING & OBSERVABILITY

### Metrics Collection
**Backend metrics** (Prometheus):
- HTTP request latency (histogram)
- Error rate (counter)
- Database connection pool usage (gauge)

**AI Service metrics**:
- STT latency (histogram)
- Intent recognition accuracy (gauge, 0-1)
- LLM API costs (counter)

**Infrastructure metrics**:
- CPU usage %
- Memory usage %
- Disk usage %
- Network I/O

### Logging
- **Format**: Structured JSON (timestamp, level, service, message)
- **Storage**: Google Cloud Logging (17$ per GB ingested)
- **Retention**: 30 days
- **Query**: Filter by service, error level, or request_id

### Alerting
- Error rate > 1% for 5 min → Slack notification
- Response P99 > 1 second → page on-call engineer
- Database connection pool > 80% → warning
- Disk usage > 90% → urgent alert

---

## 4.8 TÓM TẮT CHƯƠNG 4

| Khía cạnh | Giải pháp |
|-----------|---------|
| **Kiến trúc** | 3-layer microservices (Mobile → Backend → AI) + 5 infrastructure services |
| **Deployment layers** | Local (dev) → Docker Compose (staging) → Kubernetes (production) |
| **Voice chat flow** | 6 bước: Record → Upload → STT → NLU → LLM → TTS → Play |
| **Build optimization** | Multi-stage Docker builds, 80% kích thước giảm |
| **Testing** | Unit + Integration + Load test + voice-specific scenarios |
| **Infrastructure** | Staging: 4 cores / Production: 14 cores recommended |
| **Monitoring** | Metrics + Logs + Alerts for 24/7 health check |
| **CI/CD** | GitHub Actions: test → build → deploy (automated) |

**Kết luận**: Hệ thống được thiết kế để dễ triển khai, dễ mở rộng, dễ bảo trì với các quy trình rõ ràng và monitoring đầy đủ.
