"""Seed script — creates default 'bus' tenant with tools, models, and sample workflows.

Run once after first startup:
  python -m src.seed
"""

import asyncio

from sqlalchemy import select

from src.db.database import get_session_factory, init_db
from src.db.models import (
    AgentDefinition,
    ModelInstance,
    ModelProvider,
    SkillDefinition,
    Tenant,
    ToolDefinition,
    Workflow,
)


async def seed():
    await init_db()
    factory = get_session_factory()

    async with factory() as session:
        # Check if already seeded
        existing = await session.execute(select(Tenant).where(Tenant.slug == "bus"))
        if existing.scalars().first():
            print("⚠️  Already seeded — skipping.")
            return

        # ── 1. Model Providers (Global) ─────────────────────────────────
        # API keys resolved from env var fallback. To use DB-encrypted keys,
        # call POST /api/admin/providers with {"api_key": "sk-xxx"} instead.
        openai_prov = ModelProvider(
            slug="openai-main",
            name="OpenAI Production",
            provider_type="openai",
            api_key_env_var="OPENAI_API_KEY",
            rate_limit_rpm=500,
        )
        google_prov = ModelProvider(
            slug="google-main",
            name="Google AI",
            provider_type="google",
            api_key_env_var="GOOGLE_API_KEY",
            rate_limit_rpm=360,
        )
        hf_prov = ModelProvider(
            slug="huggingface-main",
            name="Hugging Face Inference API",
            provider_type="huggingface",
            api_key_env_var="HUGGINGFACEHUB_API_TOKEN",
            rate_limit_rpm=120,
        )
        session.add_all([openai_prov, google_prov, hf_prov])
        await session.flush()

        # ── 2. Bus Tenant ───────────────────────────────────────────────
        bus = Tenant(
            slug="bus",
            name="Đặt Vé Xe Bus",
            description="AI Agent hỗ trợ tìm kiếm và đặt vé xe bus",
            grpc_target="localhost:50052",
            qdrant_prefix="bus",
            supervisor_model_slug="bus-supervisor-gpt",
            supervisor_prompt="Bạn là nhân viên hỗ trợ đặt vé xe bus. Hãy giúp khách hàng tìm chuyến xe, đặt vé, và trả lời câu hỏi về dịch vụ.",
            max_turns=20,
            fallback_message="Xin lỗi, tôi chưa hiểu yêu cầu của bạn. Bạn có thể hỏi tôi về:\n- Tìm chuyến xe\n- Đặt vé\n- Kiểm tra trạng thái đặt vé",
        )
        session.add(bus)
        await session.flush()

        # ── 3. Model Instances (Bus) ────────────────────────────────────
        # Using HuggingFace free Inference API models.
        # Change provider_id to google_prov.id / openai_prov.id if you have valid keys.
        session.add_all([
            ModelInstance(
                tenant_id=bus.id,
                provider_id=hf_prov.id,
                slug="bus-supervisor-gpt",
                display_name="HF Supervisor",
                model_name="Qwen/Qwen2.5-72B-Instruct",
                temperature=0.1,
                max_tokens=500,
                purpose="supervisor",
            ),
            ModelInstance(
                tenant_id=bus.id,
                provider_id=hf_prov.id,
                slug="bus-search-gpt",
                display_name="HF Search",
                model_name="Qwen/Qwen2.5-72B-Instruct",
                temperature=0.3,
                max_tokens=2000,
                purpose="search",
                fallback_slug="bus-logic-gemini",
            ),
            ModelInstance(
                tenant_id=bus.id,
                provider_id=hf_prov.id,
                slug="bus-logic-gemini",
                display_name="HF Logic",
                model_name="Qwen/Qwen2.5-72B-Instruct",
                temperature=0.1,
                max_tokens=4000,
                purpose="reasoning",
                fallback_slug="bus-search-gpt",
            ),
            ModelInstance(
                tenant_id=bus.id,
                provider_id=hf_prov.id,
                slug="bus-chat-gpt",
                display_name="HF Chat",
                model_name="Qwen/Qwen2.5-72B-Instruct",
                temperature=0.7,
                max_tokens=1000,
                purpose="conversation",
            ),
        ])

        # ── 4. Tool Definitions (Bus) ──────────────────────────────────
        session.add_all([
            ToolDefinition(
                tenant_id=bus.id,
                name="search_trips",
                description="Tìm kiếm chuyến xe bus từ điểm đi đến điểm đến theo ngày. Dùng khi khách hàng muốn tìm chuyến xe.",
                grpc_method="SearchTrips",
                input_schema={
                    "origin": "string",
                    "destination": "string",
                    "date": "string",
                    "passengers": "integer",
                },
            ),
            ToolDefinition(
                tenant_id=bus.id,
                name="get_trip_detail",
                description="Lấy thông tin chi tiết của một chuyến xe cụ thể theo ID. Dùng khi khách hàng muốn xem chi tiết chuyến.",
                grpc_method="GetTripDetail",
                input_schema={"trip_id": "integer"},
            ),
            ToolDefinition(
                tenant_id=bus.id,
                name="get_locations",
                description="Tìm kiếm bến xe / điểm đón trả theo tên. Dùng khi cần xác định điểm đi/đến chính xác.",
                grpc_method="GetLocations",
                input_schema={"query": "string", "limit": "integer"},
            ),
            ToolDefinition(
                tenant_id=bus.id,
                name="create_booking",
                description="Tạo đặt vé xe bus. Dùng khi khách hàng xác nhận muốn đặt vé cho chuyến cụ thể.",
                grpc_method="CreateBooking",
                input_schema={
                    "trip_id": "integer",
                    "guest_name": "string",
                    "guest_phone": "string",
                    "seat_codes": "string",
                    "pickup_point": "string",
                    "dropoff_point": "string",
                },
            ),
            ToolDefinition(
                tenant_id=bus.id,
                name="get_booking_status",
                description="Kiểm tra trạng thái đặt vé theo mã booking. Dùng khi khách hỏi về tình trạng vé.",
                grpc_method="GetBookingStatus",
                input_schema={"booking_code": "string"},
            ),
        ])

        # ── 5. Workflows (Bus) — BPMN-style ────────────────────────────

        # Workflow: Search Trips
        session.add(Workflow(
            tenant_id=bus.id,
            name="Tìm Chuyến Xe",
            slug="search-trips",
            description="Tìm kiếm chuyến xe bus theo yêu cầu khách hàng",
            trigger_description="Khách hàng muốn tìm chuyến xe, hỏi về tuyến xe, lịch trình, giá vé, hoặc tìm xe từ A đến B",
            definition={
                "nodes": {
                    "extract": {
                        "task_type": "llm_call",
                        "config": {
                            "model": "bus-search-gpt",
                            "system_prompt": "Bạn là bộ phân tích yêu cầu tìm chuyến xe. Trích xuất thông tin từ câu hỏi của khách hàng.",
                            "prompt_template": (
                                "Phân tích yêu cầu sau và trích xuất JSON (không markdown):\n"
                                '- origin: điểm đi\n- destination: điểm đến\n- date: ngày đi (YYYY-MM-DD)\n- passengers: số người\n\n'
                                "Yêu cầu: {user_message}\n\n"
                                'Trả về JSON thuần: {{"origin": "...", "destination": "...", "date": "...", "passengers": 1}}'
                            ),
                            "output_key": "search_params",
                        },
                    },
                    "search": {
                        "task_type": "grpc_call",
                        "config": {
                            "tool_name": "search_trips",
                            "input_mapping": {
                                "origin": "{origin}",
                                "destination": "{destination}",
                                "date": "{date}",
                                "passengers": "{passengers}",
                            },
                            "output_key": "search_results",
                        },
                    },
                    "rerank": {
                        "task_type": "rerank_trips",
                        "config": {
                            "input_key": "search_results",
                            "list_key": "trips",
                            "output_key": "top_trips",
                            "top_n": 5,
                            "price_field": "base_price"
                        }
                    },
                    "rag": {
                        "task_type": "rag_query",
                        "config": {
                            "collection": "trips",
                            "query_key": "user_message",
                            "top_k": 5,
                            "output_key": "trip_context"
                        }
                    },
                    "format": {
                        "task_type": "llm_call",
                        "config": {
                            "model": "bus-chat-gpt",
                            "system_prompt": "Bạn là nhân viên tư vấn vé xe bus. Hãy trình bày kết quả tìm kiếm một cách thân thiện, dễ đọc.",
                            "prompt_template": (
                                "Khách hàng tìm: {user_message}\n\n"
                                "Kết quả đã xếp hạng theo giá (rẻ → đắt):\n{top_trips}\n\n"
                                "Ngữ cảnh chuyến xe liên quan:\n{trip_context}\n\n"
                                "Hãy trình bày kết quả dạng danh sách dễ đọc, ưu tiên các chuyến rẻ hơn. "
                                "Nếu không có kết quả, gợi ý khách tìm ngày khác hoặc tuyến khác."
                            ),
                            "output_key": "response",
                        },
                    },
                },
                "edges": [
                    {"from": "START", "to": "extract"},
                    {"from": "extract", "to": "search"},
                    {"from": "search", "to": "rerank"},
                    {"from": "rerank", "to": "rag"},
                    {"from": "rag", "to": "format"},
                    {"from": "format", "to": "END"},
                ],
            },
        ))

        # Workflow: Book Ticket (multi-step with human input)
        session.add(Workflow(
            tenant_id=bus.id,
            name="Đặt Vé Xe",
            slug="book-ticket",
            description="Hỗ trợ khách hàng đặt vé xe bus qua hội thoại",
            trigger_description="Khách hàng muốn đặt vé, mua vé, book vé xe bus cho chuyến cụ thể",
            definition={
                "nodes": {
                    "collect_info": {
                        "task_type": "llm_call",
                        "config": {
                            "model": "bus-search-gpt",
                            "system_prompt": "Trích xuất thông tin đặt vé từ yêu cầu khách hàng.",
                            "prompt_template": (
                                "Phân tích yêu cầu đặt vé và trích xuất JSON:\n"
                                '- trip_id: ID chuyến (số)\n- guest_name: tên khách\n- guest_phone: SĐT\n- seat_codes: mã ghế (VD: "A01,A02")\n\n'
                                "Yêu cầu: {user_message}\n\n"
                                'Trả về JSON. Nếu thiếu thông tin, để giá trị null.'
                            ),
                            "output_key": "booking_info",
                        },
                    },
                    "check_info": {
                        "task_type": "condition",
                        "config": {
                            "expression": "booking_info is not None and 'null' not in str(booking_info)",
                            "true_branch": "confirm",
                            "false_branch": "ask_more",
                        },
                    },
                    "ask_more": {
                        "task_type": "human_input",
                        "config": {
                            "prompt_template": "Để đặt vé, tôi cần thêm thông tin:\n- Chuyến xe (ID hoặc mô tả)\n- Họ tên\n- Số điện thoại\n- Ghế muốn chọn\n\nBạn vui lòng cung cấp thêm nhé!",
                            "output_key": "additional_info",
                        },
                    },
                    "confirm": {
                        "task_type": "human_input",
                        "config": {
                            "prompt_template": "Xác nhận đặt vé:\n{booking_info}\n\nBạn đồng ý đặt vé không? (Có/Không)",
                            "output_key": "user_confirm",
                        },
                    },
                    "do_booking": {
                        "task_type": "grpc_call",
                        "config": {
                            "tool_name": "create_booking",
                            "input_mapping": {
                                "trip_id": "{trip_id}",
                                "guest_name": "{guest_name}",
                                "guest_phone": "{guest_phone}",
                                "seat_codes": "{seat_codes}",
                                "pickup_point": "{pickup_point}",
                                "dropoff_point": "{dropoff_point}",
                            },
                            "output_key": "booking_result",
                        },
                    },
                    "success_msg": {
                        "task_type": "llm_call",
                        "config": {
                            "model": "bus-chat-gpt",
                            "prompt_template": "Đặt vé thành công!\nKết quả: {booking_result}\n\nHãy tóm tắt thông tin vé cho khách một cách thân thiện.",
                            "output_key": "response",
                        },
                    },
                },
                "edges": [
                    {"from": "START", "to": "collect_info"},
                    {"from": "collect_info", "to": "check_info"},
                    {"from": "check_info", "to": "confirm", "condition": "true"},
                    {"from": "check_info", "to": "ask_more", "condition": "false"},
                    {"from": "ask_more", "to": "collect_info"},
                    {"from": "confirm", "to": "do_booking"},
                    {"from": "do_booking", "to": "success_msg"},
                    {"from": "success_msg", "to": "END"},
                ],
            },
        ))

        # Workflow: Check Booking Status
        session.add(Workflow(
            tenant_id=bus.id,
            name="Kiểm Tra Vé",
            slug="check-booking",
            description="Kiểm tra trạng thái đặt vé theo mã booking",
            trigger_description="Khách hàng muốn kiểm tra vé, xem trạng thái đặt vé, hỏi về mã booking",
            definition={
                "nodes": {
                    "extract_code": {
                        "task_type": "llm_call",
                        "config": {
                            "model": "bus-search-gpt",
                            "prompt_template": 'Trích xuất mã booking từ tin nhắn: "{user_message}"\nChỉ trả về mã booking, không thêm gì khác. Nếu không tìm thấy, trả về "UNKNOWN".',
                            "output_key": "booking_code",
                        },
                    },
                    "lookup": {
                        "task_type": "grpc_call",
                        "config": {
                            "tool_name": "get_booking_status",
                            "input_mapping": {"booking_code": "{booking_code}"},
                            "output_key": "booking_status",
                        },
                    },
                    "respond": {
                        "task_type": "llm_call",
                        "config": {
                            "model": "bus-chat-gpt",
                            "prompt_template": "Thông tin vé:\n{booking_status}\n\nHãy trình bày trạng thái vé cho khách hàng một cách rõ ràng.",
                            "output_key": "response",
                        },
                    },
                },
                "edges": [
                    {"from": "START", "to": "extract_code"},
                    {"from": "extract_code", "to": "lookup"},
                    {"from": "lookup", "to": "respond"},
                    {"from": "respond", "to": "END"},
                ],
            },
        ))

        # Workflow: FAQ (RAG-powered)
        session.add(Workflow(
            tenant_id=bus.id,
            name="Hỏi Đáp FAQ",
            slug="faq",
            description="Trả lời câu hỏi thường gặp từ knowledge base",
            trigger_description="Khách hàng hỏi câu hỏi chung về dịch vụ, chính sách hoàn vé, quy định hành lý, giờ giấc, thông tin nhà xe",
            definition={
                "nodes": {
                    "rag_search": {
                        "task_type": "rag_query",
                        "config": {
                            "collection": "faq",
                            "query_key": "user_message",
                            "top_k": 5,
                            "output_key": "faq_context",
                        },
                    },
                    "answer": {
                        "task_type": "llm_call",
                        "config": {
                            "model": "bus-chat-gpt",
                            "system_prompt": "Bạn là nhân viên hỗ trợ khách hàng. Trả lời dựa trên thông tin FAQ bên dưới. Nếu không tìm thấy câu trả lời trong FAQ, nói rõ và gợi ý liên hệ hotline.",
                            "prompt_template": "Câu hỏi: {user_message}\n\nThông tin FAQ liên quan:\n{faq_context}\n\nHãy trả lời câu hỏi:",
                            "output_key": "response",
                        },
                    },
                },
                "edges": [
                    {"from": "START", "to": "rag_search"},
                    {"from": "rag_search", "to": "answer"},
                    {"from": "answer", "to": "END"},
                ],
            },
        ))
        # ── 6. Agent Definitions (Bus) — new Agent→Skill hierarchy ───

        # Agent: Ticket Sales Agent (Nhân viên bán vé)
        sales_agent = AgentDefinition(
            tenant_id=bus.id,
            slug="ticket_sales",
            name="Nhân viên bán vé",
            description="Hỗ trợ tìm chuyến xe và đặt vé cho khách hàng",
            role_prompt=(
                "Bạn là nhân viên bán vé xe bus. Nhiệm vụ chính: "
                "giúp khách tìm chuyến xe phù hợp, tư vấn giá vé, "
                "và hoàn tất đặt vé. Luôn hỏi đủ thông tin trước khi đặt."
            ),
            model_slug="bus-search-gpt",
            icon="🎫",
            priority=0,
        )
        session.add(sales_agent)
        await session.flush()

        # Skills for Ticket Sales Agent
        session.add_all([
            SkillDefinition(
                agent_id=sales_agent.id,
                slug="search_trip",
                name="Tìm chuyến xe",
                description="Tìm kiếm chuyến xe theo yêu cầu",
                trigger_description="Khách muốn tìm chuyến xe, hỏi về tuyến, lịch trình, giá vé",
                workflow_definition={
                    "nodes": {
                        "extract": {
                            "task_type": "llm_call",
                            "config": {
                                "model": "bus-search-gpt",
                                "prompt_template": (
                                    "Phân tích yêu cầu tìm chuyến xe. Trích xuất JSON:\n"
                                    '{"origin": "...", "destination": "...", "date": "...", "passengers": 1}\n\n'
                                    "Yêu cầu: {user_message}"
                                ),
                                "output_key": "search_params",
                            },
                            "position": {"x": 100, "y": 200},
                        },
                        "search": {
                            "task_type": "grpc_call",
                            "config": {
                                "tool_name": "search_trips",
                                "input_mapping": {
                                    "origin": "{origin}",
                                    "destination": "{destination}",
                                    "date": "{date}",
                                    "passengers": "{passengers}",
                                },
                                "output_key": "search_results",
                            },
                            "position": {"x": 400, "y": 200},
                        },
                        "format": {
                            "task_type": "llm_call",
                            "config": {
                                "model": "bus-chat-gpt",
                                "prompt_template": (
                                    "Khách tìm: {user_message}\nKết quả:\n{search_results}\n\n"
                                    "Trình bày kết quả dạng danh sách dễ đọc."
                                ),
                                "output_key": "response",
                            },
                            "position": {"x": 700, "y": 200},
                        },
                    },
                    "edges": [
                        {"source": "START", "target": "extract", "flow_type": "SEQUENCE"},
                        {"source": "extract", "target": "search", "flow_type": "SEQUENCE"},
                        {"source": "search", "target": "format", "flow_type": "SEQUENCE"},
                        {"source": "format", "target": "END", "flow_type": "SEQUENCE"},
                    ],
                },
            ),
            SkillDefinition(
                agent_id=sales_agent.id,
                slug="book_ticket",
                name="Đặt vé xe",
                description="Hoàn tất đặt vé cho khách",
                trigger_description="Khách muốn đặt vé, mua vé, book vé cho chuyến xe cụ thể",
                model_slug="bus-search-gpt",
                workflow_definition={
                    "nodes": {
                        "collect": {
                            "task_type": "llm_call",
                            "config": {
                                "model": "bus-search-gpt",
                                "prompt_template": (
                                    "Trích xuất thông tin đặt vé: trip_id, guest_name, "
                                    'guest_phone, seat_codes. Yêu cầu: {user_message}'
                                ),
                                "output_key": "booking_info",
                            },
                            "position": {"x": 100, "y": 200},
                        },
                        "confirm": {
                            "task_type": "human_input",
                            "config": {
                                "prompt_template": "Xác nhận đặt vé:\n{booking_info}\n\nĐồng ý? (Có/Không)",
                                "output_key": "user_confirm",
                            },
                            "position": {"x": 400, "y": 200},
                        },
                        "do_book": {
                            "task_type": "grpc_call",
                            "config": {
                                "tool_name": "create_booking",
                                "input_mapping": {
                                    "trip_id": "{trip_id}",
                                    "guest_name": "{guest_name}",
                                    "guest_phone": "{guest_phone}",
                                    "seat_codes": "{seat_codes}",
                                },
                                "output_key": "booking_result",
                            },
                            "position": {"x": 700, "y": 200},
                        },
                        "done": {
                            "task_type": "llm_call",
                            "config": {
                                "model": "bus-chat-gpt",
                                "prompt_template": "Đặt vé thành công!\n{booking_result}\nTóm tắt thân thiện.",
                                "output_key": "response",
                            },
                            "position": {"x": 1000, "y": 200},
                        },
                    },
                    "edges": [
                        {"source": "START", "target": "collect", "flow_type": "SEQUENCE"},
                        {"source": "collect", "target": "confirm", "flow_type": "SEQUENCE"},
                        {"source": "confirm", "target": "do_book", "flow_type": "SEQUENCE"},
                        {"source": "do_book", "target": "done", "flow_type": "SEQUENCE"},
                        {"source": "done", "target": "END", "flow_type": "SEQUENCE"},
                    ],
                },
            ),
        ])

        # Agent: Customer Support Agent (Nhân viên CSKH)
        support_agent = AgentDefinition(
            tenant_id=bus.id,
            slug="customer_support",
            name="Nhân viên chăm sóc khách hàng",
            description="Kiểm tra trạng thái vé, trả lời FAQ, hỗ trợ khiếu nại",
            role_prompt=(
                "Bạn là nhân viên chăm sóc khách hàng. "
                "Giải đáp thắc mắc, kiểm tra trạng thái vé, "
                "xử lý khiếu nại một cách lịch sự và chuyên nghiệp."
            ),
            model_slug="bus-chat-gpt",
            icon="💬",
            priority=1,
        )
        session.add(support_agent)
        await session.flush()

        # Skills for Customer Support Agent
        session.add_all([
            SkillDefinition(
                agent_id=support_agent.id,
                slug="check_booking",
                name="Kiểm tra vé",
                description="Tra cứu trạng thái đặt vé",
                trigger_description="Khách hỏi về trạng thái vé, mã booking, kiểm tra vé",
                workflow_definition={
                    "nodes": {
                        "extract": {
                            "task_type": "llm_call",
                            "config": {
                                "model": "bus-search-gpt",
                                "prompt_template": 'Trích xuất mã booking từ: "{user_message}". Chỉ trả về mã.',
                                "output_key": "booking_code",
                            },
                            "position": {"x": 100, "y": 200},
                        },
                        "lookup": {
                            "task_type": "grpc_call",
                            "config": {
                                "tool_name": "get_booking_status",
                                "input_mapping": {"booking_code": "{booking_code}"},
                                "output_key": "booking_status",
                            },
                            "position": {"x": 400, "y": 200},
                        },
                        "respond": {
                            "task_type": "llm_call",
                            "config": {
                                "model": "bus-chat-gpt",
                                "prompt_template": "Thông tin vé:\n{booking_status}\nTrình bày rõ ràng.",
                                "output_key": "response",
                            },
                            "position": {"x": 700, "y": 200},
                        },
                    },
                    "edges": [
                        {"source": "START", "target": "extract", "flow_type": "SEQUENCE"},
                        {"source": "extract", "target": "lookup", "flow_type": "SEQUENCE"},
                        {"source": "lookup", "target": "respond", "flow_type": "SEQUENCE"},
                        {"source": "respond", "target": "END", "flow_type": "SEQUENCE"},
                    ],
                },
            ),
            SkillDefinition(
                agent_id=support_agent.id,
                slug="faq",
                name="Hỏi đáp FAQ",
                description="Trả lời câu hỏi thường gặp",
                trigger_description="Khách hỏi chung về dịch vụ, chính sách hoàn vé, quy định hành lý",
                workflow_definition={
                    "nodes": {
                        "rag": {
                            "task_type": "rag_query",
                            "config": {
                                "collection": "faq",
                                "query_key": "user_message",
                                "top_k": 5,
                                "output_key": "faq_context",
                            },
                            "position": {"x": 100, "y": 200},
                        },
                        "answer": {
                            "task_type": "llm_call",
                            "config": {
                                "model": "bus-chat-gpt",
                                "system_prompt": "Trả lời dựa trên FAQ. Nếu không có, gợi ý hotline.",
                                "prompt_template": "Câu hỏi: {user_message}\nFAQ:\n{faq_context}",
                                "output_key": "response",
                            },
                            "position": {"x": 400, "y": 200},
                        },
                    },
                    "edges": [
                        {"source": "START", "target": "rag", "flow_type": "SEQUENCE"},
                        {"source": "rag", "target": "answer", "flow_type": "SEQUENCE"},
                        {"source": "answer", "target": "END", "flow_type": "SEQUENCE"},
                    ],
                },
            ),
        ])

        await session.commit()
        print(
            "✅ Seed complete! Bus tenant created with:\n"
            "   - 4 models, 5 tools, 4 legacy workflows\n"
            "   - 2 agents (ticket_sales, customer_support)\n"
            "   - 4 skills (search_trip, book_ticket, check_booking, faq)"
        )


if __name__ == "__main__":
    asyncio.run(seed())
