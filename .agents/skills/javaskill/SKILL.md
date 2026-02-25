---
name: javaskill
description: |
  Bộ luật Java cho dự án Spring Boot Backend. Kế thừa global SKILL.
  Spring Boot 3+, Java 21+, Records cho DTO, Constructor Injection, Checkstyle, MapStruct.
  Bất kỳ AI nào gặp task Java trong workspace đều follow file này.
  Keywords: java, spring, springboot, jpa, record, dto, checkstyle, mapstruct, maven, gradle.
---

# JAVA ENGINEERING LAW

> Kế thừa: `global/SKILL.md`. Xung đột → file này thắng.

---

## §1. PROJECT LAYOUT

```
src/main/java/com/example/<project>/
├── config/                  # Spring config: Security, CORS, ObjectMapper, etc.
├── common/                  # Shared: exception, response, pagination, constants
│   ├── exception/           # GlobalExceptionHandler, AppException, ErrorCode enum
│   ├── response/            # ApiResponse<T>, PageResponse<T>
│   └── util/                # Pure utility classes (ZERO business logic)
├── <feature>/               # Feature modules
│   ├── controller/          # REST controllers
│   ├── dto/                 # Request/Response records
│   ├── entity/              # JPA entities
│   ├── mapper/              # MapStruct mappers
│   ├── repository/          # Spring Data JPA interfaces
│   └── service/             # Business logic (interface + impl)
└── Application.java         # @SpringBootApplication — KHÔNG có logic
```

---

## §2. DTO — Java Records (BẮT BUỘC)

### §2.1 Request/Response = Record

```java
// ✅ Record cho immutable DTOs
public record CreateTripRequest(
    @NotNull Long providerId,
    @NotNull @Positive BigDecimal basePrice,
    @NotBlank String departureTime
) {}

public record TripResponse(
    Long id,
    String providerName,
    BigDecimal basePrice,
    TripStatus status
) {}

public record PageResponse<T>(
    List<T> items,
    long total,
    int page,
    int totalPages
) {}
```

### §2.2 DTO Rules

- ✅ Request: dùng `record` + Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Size`, `@Positive`).
- ✅ Response: dùng `record`.
- ✅ Nested DTO: `record` lồng `record`.
- ❌ KHÔNG dùng `class` cho DTO (trừ khi cần deserialization phức tạp).
- ❌ KHÔNG dùng `@Data` (Lombok) cho DTO — dùng `record`.
- ❌ KHÔNG dùng `Map<String, Object>` làm DTO.
- ❌ KHÔNG return Entity trực tiếp từ controller.

---

## §3. ENTITY — JPA

```java
@Entity
@Table(name = "trips")
@Getter                      // Lombok chỉ @Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA cần
@Builder                     // Builder cho construction
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long providerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TripStatus status;

    // Business method — logic thuộc entity
    public boolean canTransitionTo(TripStatus target) {
        return switch (this.status) {
            case SCHEDULED -> target == TripStatus.DEPARTED || target == TripStatus.CANCELLED;
            case DEPARTED -> target == TripStatus.COMPLETED;
            default -> false;
        };
    }
}
```

### §3.1 Lombok Whitelist (CHỈ cho Entity)

| Allowed | Forbidden |
|---------|-----------|
| `@Getter` | `@Setter` (dùng domain method thay thế) |
| `@NoArgsConstructor(access = PROTECTED)` | `@Data` |
| `@Builder` | `@ToString` (tự override nếu cần) |
| `@RequiredArgsConstructor` (cho service injection) | `@AllArgsConstructor` |
| `@Slf4j` | `@Value` (dùng record) |

- ❌ `@Setter` trên entity → dùng business method: `trip.updatePrice(newPrice)`.
- ❌ `@Data` → expose quá nhiều. Dùng `@Getter` + `@Builder`.

---

## §4. SERVICE LAYER

### §4.1 Interface + Implementation

```java
public interface TripService {
    TripResponse create(CreateTripRequest request);
    TripResponse getById(Long id);
    PageResponse<TripResponse> list(TripFilter filter, Pageable pageable);
    TripResponse update(Long id, UpdateTripRequest request);
    void delete(Long id);
}

@Service
@RequiredArgsConstructor  // Constructor injection
@Slf4j
public class TripServiceImpl implements TripService {
    private final TripRepository tripRepository;   // final field
    private final TripMapper tripMapper;           // final field

    @Override
    public TripResponse create(CreateTripRequest request) {
        Trip entity = tripMapper.toEntity(request);
        Trip saved = tripRepository.save(entity);
        return tripMapper.toResponse(saved);
    }

    @Override
    public TripResponse getById(Long id) {
        Trip trip = tripRepository.findById(id)
            .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
        return tripMapper.toResponse(trip);
    }
}
```

### §4.2 Injection Rules

- ✅ **Constructor injection** via `@RequiredArgsConstructor` + `private final` fields.
- ❌ KHÔNG `@Autowired` trên field.
- ❌ KHÔNG `@Autowired` trên setter.
- ❌ KHÔNG `new Service()` thủ công.
- ✅ Mọi dependency = `private final`.

---

## §5. CONTROLLER LAYER

```java
@RestController
@RequestMapping("/api/v1/admin/trips")
@RequiredArgsConstructor
public class TripController {
    private final TripService tripService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TripResponse> create(@Valid @RequestBody CreateTripRequest request) {
        return ApiResponse.success(tripService.create(request), "Trip created");
    }

    @GetMapping("/{id}")
    public ApiResponse<TripResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(tripService.getById(id));
    }

    @GetMapping
    public ApiResponse<PageResponse<TripResponse>> list(
            @Valid TripFilter filter,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(tripService.list(filter, pageable));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        tripService.delete(id);
    }
}
```

**Rules:**
- ✅ `@Valid` trên `@RequestBody` và filter objects.
- ✅ `@ResponseStatus` cho POST (201), DELETE (204).
- ✅ Wrap response trong `ApiResponse<T>`.
- ❌ Controller KHÔNG có business logic — chỉ delegate xuống service.
- ❌ KHÔNG try/catch trong controller — để `GlobalExceptionHandler` xử lý.

---

## §6. MAPPER — MapStruct

```java
@Mapper(componentModel = "spring")
public interface TripMapper {
    Trip toEntity(CreateTripRequest request);
    TripResponse toResponse(Trip entity);
    List<TripResponse> toResponseList(List<Trip> entities);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(UpdateTripRequest request, @MappingTarget Trip entity);
}
```

**Rules:**
- ✅ `componentModel = "spring"` → inject như bean.
- ✅ `@BeanMapping(nullValuePropertyMappingStrategy = IGNORE)` cho partial update.
- ❌ KHÔNG map thủ công (setter chain) khi MapStruct có thể handle.
- ❌ KHÔNG dùng ModelMapper/Dozer — chỉ MapStruct (compile-time, type-safe).

---

## §7. ERROR HANDLING — Global Exception Handler

### §7.1 ErrorCode Enum

```java
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // Common
    INTERNAL_ERROR(500, "INTERNAL_ERROR", "Internal server error"),
    VALIDATION_ERROR(400, "VALIDATION_ERROR", "Validation failed"),
    UNAUTHORIZED(401, "UNAUTHORIZED", "Unauthorized"),
    FORBIDDEN(403, "FORBIDDEN", "Access denied"),

    // Trip
    TRIP_NOT_FOUND(404, "TRIP_NOT_FOUND", "Trip not found"),
    TRIP_INVALID_STATUS(400, "TRIP_INVALID_STATUS", "Invalid trip status transition"),
    ;

    private final int httpStatus;
    private final String code;
    private final String message;
}
```

### §7.2 AppException

```java
@Getter
public class AppException extends RuntimeException {
    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
```

### §7.3 GlobalExceptionHandler

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleApp(AppException ex) {
        ErrorCode ec = ex.getErrorCode();
        if (ec.getHttpStatus() >= 500) log.error("Server error", ex);
        return ResponseEntity.status(ec.getHttpStatus())
            .body(ApiResponse.error(ec.getCode(), ec.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
            .body(ApiResponse.error("VALIDATION_ERROR", msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAll(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.internalServerError()
            .body(ApiResponse.error("INTERNAL_ERROR", "Internal server error"));
    }
}
```

**Rules:**
- ✅ Service throw `AppException(ErrorCode.X)`.
- ✅ Handler catch + log 5xx + return generic message.
- ❌ KHÔNG try/catch trong controller.
- ❌ KHÔNG return `ResponseEntity` với hardcoded status — dùng `ErrorCode`.

---

## §8. REPOSITORY

```java
public interface TripRepository extends JpaRepository<Trip, Long> {
    @Query("SELECT t FROM Trip t WHERE t.providerId = :providerId AND t.status = :status")
    Page<Trip> findByProviderAndStatus(
        @Param("providerId") Long providerId,
        @Param("status") TripStatus status,
        Pageable pageable
    );

    boolean existsByProviderIdAndDepartureTime(Long providerId, LocalDateTime departureTime);
}
```

**Rules:**
- ✅ Extend `JpaRepository<Entity, IdType>`.
- ✅ Complex queries: `@Query` JPQL hoặc native.
- ✅ Pagination: `Page<T>`, `Pageable`.
- ❌ KHÔNG logic trong repository — chỉ data access.
- ❌ KHÔNG string concatenation SQL.

---

## §9. OPTIONAL HANDLING

```java
// ✅ Optional chỉ làm return type
Optional<Trip> findByCode(String code);

// ✅ Handle ngay — throw exception
Trip trip = tripRepository.findById(id)
    .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

// ❌ CẤM Optional là field type
private Optional<String> name;  // NEVER

// ❌ CẤM Optional là parameter
public void update(Optional<String> name);  // NEVER

// ❌ CẤM get() không check
tripRepository.findById(id).get();  // NEVER
```

---

## §10. JAVA IDIOMS

### §10.1 Java 21+ Features

- ✅ `record` cho DTO/VO.
- ✅ `switch` expression (pattern matching).
- ✅ `sealed interface/class` cho domain hierarchies.
- ✅ Text blocks `"""..."""` cho long strings.
- ✅ `var` cho local variables khi type rõ ràng.

### §10.2 Naming

```
Class:      PascalCase          TripService, TripServiceImpl
Method:     camelCase           findById, createTrip
Constant:   SCREAMING_SNAKE     MAX_RETRY_COUNT
Package:    lowercase           com.example.trip
Test:       <Method>_<Scenario> create_withValidInput_returnsTrip
```

### §10.3 Code Style

- ✅ Checkstyle + `-Werror` trong CI (zero warnings).
- ✅ Mỗi class 1 file.
- ✅ Max 1 level of `Optional` operation chaining.
- ❌ KHÔNG `null` return cho collections — trả `List.of()`.
- ❌ KHÔNG mutable collections từ service — `Collections.unmodifiableList()` hoặc `List.copyOf()`.

---

## §11. TRANSACTION

```java
// ✅ Service-level transaction
@Transactional
public TripResponse create(CreateTripRequest request) {
    // multiple repo calls trong 1 transaction
}

// ✅ Read-only cho queries
@Transactional(readOnly = true)
public TripResponse getById(Long id) { ... }
```

- ✅ `@Transactional` ở service method (KHÔNG ở repository hoặc controller).
- ✅ `readOnly = true` cho read-only methods.
- ❌ KHÔNG `@Transactional` trên private method (Spring proxy vô hiệu).

---

## §12. TESTING

```java
// Unit test — Mock dependencies
@ExtendWith(MockitoExtension.class)
class TripServiceImplTest {
    @InjectMocks TripServiceImpl service;
    @Mock TripRepository repository;
    @Mock TripMapper mapper;

    @Test
    void create_withValidInput_returnsTrip() { ... }

    @Test
    void getById_notFound_throwsAppException() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getById(1L))
            .isInstanceOf(AppException.class)
            .extracting("errorCode").isEqualTo(ErrorCode.TRIP_NOT_FOUND);
    }
}

// Integration test — Real DB
@SpringBootTest
@AutoConfigureMockMvc
class TripControllerIT {
    @Autowired MockMvc mockMvc;

    @Test
    void create_returns201() throws Exception {
        mockMvc.perform(post("/api/v1/admin/trips")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());
    }
}
```

**Rules:**
- ✅ Unit test: Mockito + JUnit 5. Assert bằng AssertJ.
- ✅ Integration test: `@SpringBootTest` + MockMvc.
- ✅ Test naming: `method_scenario_expectedResult`.
- ❌ KHÔNG test generated code (MapStruct, JPA metamodel).

---

## §13. CHECKLIST TRƯỚC COMMIT

- [ ] DTO = record (không class)
- [ ] Entity: chỉ `@Getter`, `@Builder`, `@NoArgsConstructor(PROTECTED)`
- [ ] Injection: constructor injection (`final` fields)
- [ ] Controller: `@Valid`, delegate service, no business logic
- [ ] Service: `@Transactional`, throw `AppException(ErrorCode.X)`
- [ ] Mapper: MapStruct `@Mapper(componentModel = "spring")`
- [ ] Optional: chỉ return type, ngay `orElseThrow()`
- [ ] Exception: handled bởi `GlobalExceptionHandler`
- [ ] Null collection: trả `List.of()`, KHÔNG trả `null`
- [ ] Checkstyle pass, zero warnings
- [ ] Tests: unit + integration pass
