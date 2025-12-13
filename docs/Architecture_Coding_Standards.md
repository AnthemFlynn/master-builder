# Architecture & Coding Standards

**Audience:** Engineers contributing to this codebase  
**Scope:** All production code, tests, and tooling in this repository

This document defines how we design, structure, and write code. It enforces:

- A **Modular Monolith** structure  
- Each module uses a **pure Hexagonal Architecture**  
- Coding practices aligned with **CLEAN** and **SOLID** principles, suitable for enterprise systems

---

## 1. Core Principles

1. **Modular Monolith first**
   - One deployable unit, many clearly separated modules.
   - Optimize for simplicity, cohesion, and refactorability.

2. **Hexagonal Architecture per module**
   - Domain rules are at the center.
   - All external details sit at the edges behind ports.

3. **Domain over technology**
   - Business language, not framework language, drives design.
   - Technology is a plugin, not the core.

4. **Explicit boundaries**
   - Each module is a small, self-contained system.
   - No hidden coupling, no “just reach into their database”.

5. **Clean and SOLID**
   - Functions are small, classes cohesive, dependencies clear.
   - Code is testable without infrastructure.

6. **Readability over cleverness**
   - Code is written for humans first, compilers second.

---

## 2. Modular Monolith Structure

The entire system lives in one repo and one deployable artifact, but is split into **modules** representing coherent domains or subdomains.

### 2.1 Module Definition

A **module**:

- Represents a business capability or bounded context.
- Owns its own domain model, application services, and ports.
- Has a clear public interface for other modules.
- Hides internal details behind that interface.

Examples of modules:

- `IdentityAccess`
- `ProductionScheduling`
- `Inventory`
- `Billing`
- `Reporting`

### 2.2 Allowed Dependencies

- Modules may depend on:
  - **Shared kernel** (cross-cutting abstractions that are stable and generic).
  - **Other modules** only through **public interfaces** (facades, services, domain events), not via internal classes or tables.

**Forbidden:**

- Direct database access across module boundaries.
- Referencing another module’s internal types.
- Circular dependencies between modules.

### 2.3 Repository Layout (Template)

Example layout (language agnostic):

```text
.
├── docs/
│   └── ARCHITECTURE_AND_CODING_STANDARDS.md
└── src/
    ├── SharedKernel/
    │   ├── Domain/
    │   ├── Application/
    │   └── Infrastructure/
    └── Modules/
        ├── IdentityAccess/
        │   ├── Domain/
        │   ├── Application/
        │   ├── Ports/
        │   │   ├── In/
        │   │   └── Out/
        │   ├── Adapters/
        │   │   ├── In/
        │   │   └── Out/
        │   └── Infrastructure/
        ├── ProductionScheduling/
        │   ├── Domain/
        │   ├── Application/
        │   ├── Ports/
        │   ├── Adapters/
        │   └── Infrastructure/
        └── Inventory/
            ├── Domain/
            ├── Application/
            ├── Ports/
            ├── Adapters/
            └── Infrastructure/


⸻

3. Hexagonal Architecture per Module

Every module follows a strict hexagonal structure.

3.1 Layers

Within a module:
	•	Domain
	•	Entities, value objects, domain services, domain events, aggregates.
	•	Pure business logic, no framework or IO.
	•	Application
	•	Use cases / application services.
	•	Orchestrates domain logic, handles transactions, but no business rules.
	•	Ports
	•	In: Interfaces representing inbound operations (commands, queries, events).
	•	Out: Interfaces representing dependencies on external systems (repositories, message buses, external APIs).
	•	Adapters
	•	In: Implement inbound ports using external technologies (HTTP controllers, CLI handlers, message handlers, UI events).
	•	Out: Implement outbound ports using external resources (database, message brokers, REST clients, file systems).
	•	Infrastructure
	•	Module-specific infrastructure wiring, configurations, DI registration, migrations.

3.2 Allowed Dependencies inside a Module
	•	Domain
	•	Can depend only on other domain code and shared kernel abstractions.
	•	Application
	•	Can depend on Domain and Ports (interfaces), never on Adapters.
	•	Ports
	•	Can depend on Domain types for contracts (request/response DTOs may be separate).
	•	Adapters
	•	May depend on Application, Ports, infrastructure libraries, frameworks.
	•	Infrastructure
	•	May depend on anything inside the same module and on frameworks.

In short:

Domain ← Application ← Ports ← Adapters
          ↑                ↑
        SharedKernel     Infrastructure

Reverse dependencies (Adapters calling Application) are handled by DI / runtime wiring, not direct compile-time inversion.

⸻

4. Module Boundaries & Interactions

4.1 Public API of a Module

Each module exposes a narrow, documented API to other modules via one or more of:
	•	Application services interfaces
	•	Domain events
	•	Query interfaces
	•	Integration DTOs

Internal types are not referenced outside the module.

4.2 Communication Rules
	•	Prefer asynchronous events for cross-module communication when appropriate.
	•	For synchronous calls:
	•	Call other modules via their application service interfaces, not repositories, not domain entities.
	•	Data sharing:
	•	Share IDs and immutable data, not live entities.
	•	Avoid cross-module transactions when possible. If needed, consider saga / process manager patterns.

4.3 Database Rules
	•	Each module owns its persistence schema segment.
	•	This may be separate schemas or logically separated tables with module prefixes.
	•	No module writes directly to another module’s tables.
	•	Foreign keys across modules should be avoided or treated as loose references (IDs), not tightly coupled constraints.

⸻

5. Coding Standards: CLEAN & SOLID

All code in this repo adheres to CLEAN and SOLID principles.

5.1 SOLID
	1.	Single Responsibility Principle (SRP)
	•	A class or function does one thing and does it well.
	•	If you cannot name it without “and”, it likely has more than one responsibility.
	2.	Open/Closed Principle (OCP)
	•	Modules, classes, and functions are open for extension, closed for modification.
	•	Add new behavior through polymorphism, strategy, or configuration, not scattered if/switch checks.
	3.	Liskov Substitution Principle (LSP)
	•	Subtypes must behave correctly when used as their base types.
	•	No changing expectations, no throwing “not supported” where base types would not.
	4.	Interface Segregation Principle (ISP)
	•	Prefer multiple small interfaces over one fat interface.
	•	Consumers should not be forced to depend on methods they do not use.
	5.	Dependency Inversion Principle (DIP)
	•	High-level modules depend on abstractions, not concretions.
	•	Concrete implementations live on the edges (Adapters), not the core.

5.2 CLEAN Code Practices
	1.	Naming
	•	Names communicate intent, not implementation details.
	•	Avoid abbreviations, except widely understood ones.
	•	Class names: nouns. Method names: verbs. Events: past tense actions.
	2.	Functions & Methods
	•	Short and focused, ideally < 20–30 lines.
	•	One level of abstraction per function.
	•	No long parameter lists, use parameter objects where needed.
	3.	Immutability & State
	•	Favor immutable value objects.
	•	Side effects must be explicit and obvious.
	•	Shared mutable state is minimized and controlled.
	4.	Error Handling
	•	Use specific, meaningful error types.
	•	No swallowing exceptions.
	•	Validate early, fail fast, handle gracefully at the edges.
	5.	Comments
	•	Comments explain why, not what.
	•	Do not comment around bad code, refactor the code.
	•	No commented-out dead code in main branches.
	6.	Formatting
	•	Use a project-wide formatter and linter.
	•	No manual style debates, the formatter is the law.
	7.	Configuration
	•	All environment-specific values are in config, not hard-coded.
	•	Secrets are never committed.

⸻

6. Testing Standards

6.1 Test Types
	•	Unit tests
	•	Cover domain logic and application services.
	•	No network, no database, no file system.
	•	Integration tests
	•	Cover adapter behavior, persistence, and external integrations.
	•	Contract tests
	•	Ensure module public APIs conform to contracts used by other modules.
	•	End-to-end tests
	•	Validate main user journeys across modules.

6.2 Testing Rules
	•	Every bug gets a test that would have caught it.
	•	Tests must be deterministic, fast, and isolated.
	•	Do not test private implementation details, test observable behavior.
	•	Domain invariants must be tested at the domain level, not only through APIs.

⸻

7. Dependency Management
	•	Dependencies are introduced deliberately, not casually.
	•	Prefer stable, well-maintained libraries.
	•	Wrap external libraries behind ports so they are replaceable.
	•	Avoid framework leakage into Domain and Application.

Forbidden in Domain layer:
	•	HTTP types
	•	ORM entities
	•	Framework-specific annotations or attributes
	•	Direct logging or IO

⸻

8. Logging, Monitoring, and Observability
	•	Logging happens in Adapters and Application layers, not deep in the domain.
	•	Log structured events, not free-form strings only.
	•	Use correlation IDs for tracing requests across modules.
	•	Metrics and tracing are configured at Infrastructure/Adapter level.

⸻

9. Security & Validation
	•	All external input is validated at the boundary (inbound adapters or application layer).
	•	Domain invariants are enforced in the domain model.
	•	Never trust client input, including internal clients.
	•	Apply least privilege for module interactions and external integrations.

⸻

10. Example Module Skeleton

Example for a ProductionScheduling module:

src/Modules/ProductionScheduling/
├── Domain/
│   ├── Entities/
│   │   ├── WorkOrder.cs
│   │   └── ScheduleSlot.cs
│   ├── ValueObjects/
│   │   ├── WorkCenterId.cs
│   │   └── TimeWindow.cs
│   ├── Services/
│   │   └── SchedulingPolicy.cs
│   └── Events/
│       └── WorkOrderScheduled.cs
├── Application/
│   ├── UseCases/
│   │   ├── ScheduleWorkOrderHandler.cs
│   │   └── RescheduleWorkOrderHandler.cs
│   ├── DTOs/
│   │   └── WorkOrderDto.cs
│   └── Services/
│       └── SchedulingFacade.cs
├── Ports/
│   ├── In/
│   │   └── IScheduleWorkOrder.cs
│   └── Out/
│       ├── IWorkOrderRepository.cs
│       └── ICapacityProvider.cs
├── Adapters/
│   ├── In/
│   │   └── Http/
│   │       └── WorkOrderController.cs
│   └── Out/
│       ├── Persistence/
│       │   └── WorkOrderRepository.cs
│       └── External/
│           └── CapacityApiClient.cs
└── Infrastructure/
    ├── Config/
    ├── DI/
    │   └── ProductionSchedulingModuleRegistration.cs
    └── Migrations/


⸻

11. Enforcement & Review
	•	All new modules must follow the structure defined here.
	•	Architectural violations (wrong dependencies, leaking framework into domain, cross-module data access) are considered blocking issues in review.
	•	Code reviews enforce:
	•	Module boundaries
	•	Hexagonal rules
	•	CLEAN and SOLID adherence
	•	Test coverage on new behavior

This document is the source of truth for architecture and coding practices in this codebase. When in doubt, favor clarity, separation of concerns, and domain purity.

