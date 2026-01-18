<div align="center">

# CoSign

### Task Management with External Verification

[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-cosign--nwwl.onrender.com-00C853?style=for-the-badge&logo=render&logoColor=white)](https://cosign-nwwl.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

**CoSign** is a task management application where tasks require approval from another user before they can be marked complete. When you create a task, you assign a verifier and attach penalty content that stays hidden. If you submit proof of completion, your verifier reviews it and decides whether to approve. If the deadline passes without approval, the penalty content is automatically revealed to the verifier via email.

[View Live Demo](https://cosign-nwwl.onrender.com) | [Report Bug](https://github.com/Shahir-47/CoSign/issues) | [Request Feature](https://github.com/Shahir-47/CoSign/issues)

</div>

---

## Table of Contents

<details>
<summary>Click to expand</summary>

- [Why CoSign Exists](#why-cosign-exists)
- [Core Concepts](#core-concepts)
- [Application Screenshots](#application-screenshots)
- [Video Walkthrough](#video-walkthrough)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Data Models](#data-models)
- [Features Deep Dive](#features-deep-dive)
- [Security Model](#security-model)
- [Real-Time Communication](#real-time-communication)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [License](#license)

</details>

---

## Why CoSign Exists

Most task apps let you delete tasks, push deadlines, or just ignore things. CoSign adds external accountability by requiring someone else to verify your work.

**External Verification**: You can't mark your own tasks complete. You submit proof, and your verifier decides if it's good enough.

**Hidden Penalties**: When you create a task, you write penalty content that your verifier can't see. It only gets revealed if you miss the deadline.

**Automatic Deadline Enforcement**: If the deadline passes without verification, the system emails your penalty to the verifier. No manual intervention needed.

---

## Core Concepts

### The Verification Loop

Every task goes through these states:

```mermaid
stateDiagram-v2
    [*] --> PENDING_PROOF: Task Created
    PENDING_PROOF --> PENDING_VERIFICATION: Proof Submitted
    PENDING_VERIFICATION --> COMPLETED: Verifier Approves
    PENDING_VERIFICATION --> PENDING_PROOF: Verifier Rejects
    PENDING_PROOF --> MISSED: Deadline Passes
    PENDING_VERIFICATION --> MISSED: Deadline Passes
    MISSED --> [*]: Penalty Exposed
    COMPLETED --> [*]: Task Archived
```

**Task States**

- `PENDING_PROOF`: Waiting for the creator to submit evidence
- `PENDING_VERIFICATION`: Proof submitted, verifier reviewing
- `COMPLETED`: Verifier approved the proof
- `MISSED`: Deadline passed, penalty exposed to verifier
- `PAUSED`: On hold (verifier reassignment needed)

### Penalties

The creator sees their penalty content; the verifier doesn't until the deadline is missed. This is the main accountability mechanism.

Penalties support rich text and file attachments. The content could be anything the creator would rather keep private. The system hashes penalty content to prevent reusing the same penalty after it's been exposed.

### Verifier Relationships

Any registered user can be a verifier. You can save frequently-used verifiers for quick access, or enter any email when creating a task.

**As a Creator**, you can create tasks, submit proof, and reassign verifiers. You cannot verify your own tasks or delete tasks that are still active.

**As a Verifier**, you can review proof and approve or reject it. You can't see the penalty content until the deadline is missed, and you can't modify the task itself.

---

## Application Screenshots

<div align="center">

<!-- Add screenshots of the application here -->

|                           Dashboard View                           |              Task Creation              |
| :----------------------------------------------------------------: | :-------------------------------------: |
| _Main dashboard showing My Tasks, To Verify, and Supervising tabs_ | _Create task modal with penalty editor_ |
|                     `[Screenshot Placeholder]`                     |       `[Screenshot Placeholder]`        |

|                Proof Submission                |         Verification Review          |
| :--------------------------------------------: | :----------------------------------: |
| _Proof submission interface with file uploads_ | _Verifier reviewing submitted proof_ |
|           `[Screenshot Placeholder]`           |      `[Screenshot Placeholder]`      |

|              Penalty Exposure              |
| :----------------------------------------: |
| _Missed task with exposed penalty content_ |
|         `[Screenshot Placeholder]`         |

</div>

---

## Video Walkthrough

<div align="center">

<!-- Add video demonstration here -->

[![Video Walkthrough](https://img.shields.io/badge/Video-Watch%20Demo-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](#)

_Complete walkthrough demonstrating task creation, proof submission, verification, and penalty exposure_

`[Video Placeholder]`

</div>

---

## System Architecture

The application runs as a single container serving both the REST API and static frontend files.

```mermaid
flowchart TB
    subgraph Client["Browser Client"]
        React["React 19 SPA"]
        WS_Client["WebSocket Client"]
    end

    subgraph Server["Spring Boot Application"]
        subgraph Web["Web Layer"]
            REST["REST Controllers"]
            WS_Handler["WebSocket Handler"]
            Security["Security Filter Chain"]
        end

        subgraph Business["Business Layer"]
            AuthService["Auth Service"]
            TaskService["Task Service"]
            VerifierService["Verifier Service"]
            EmailService["Email Service"]
            EncryptionService["Encryption Service"]
            SocketService["Socket Service"]
        end

        subgraph Data["Data Layer"]
            JPA["Spring Data JPA"]
            Repositories["Repositories"]
        end
    end

    subgraph External["External Services"]
        PostgreSQL[(PostgreSQL)]
        S3["AWS S3"]
        Resend["Resend Email API"]
    end

    React --> REST
    WS_Client <--> WS_Handler
    REST --> Security
    Security --> AuthService
    Security --> TaskService
    Security --> VerifierService
    TaskService --> EmailService
    TaskService --> EncryptionService
    TaskService --> SocketService
    SocketService --> WS_Handler
    Business --> JPA
    JPA --> PostgreSQL
    TaskService --> S3
    EmailService --> Resend
```

### Request Flow

Users log in and receive a JWT token used for subsequent requests. WebSocket connections pass the token as a query parameter during handshake.

Task creation validates the request, encrypts sensitive fields, saves to the database, and broadcasts updates via WebSocket. A background job runs every minute to check deadlines and expose penalties for missed tasks.

### Components

- **AuthController**: Registration, login, email verification, password reset
- **TaskController**: Task CRUD, proof submission, approval/rejection
- **VerifierController**: Saved verifier management
- **SocketService**: WebSocket connections indexed by user ID for real-time updates

---

## Technology Stack

### Backend

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.1-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring%20Security-JWT-6DB33F?style=flat-square&logo=springsecurity&logoColor=white)
![Hibernate](https://img.shields.io/badge/Hibernate-JPA-59666C?style=flat-square&logo=hibernate&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)

Built on **Spring Boot 4.0.1** with **Java 21**, using virtual threads for improved concurrency. Authentication is stateless via JWT with BCrypt password hashing. The persistence layer uses **Spring Data JPA** with Hibernate, backed by **PostgreSQL** with HikariCP connection pooling.

Real-time updates use **Spring WebSocket** with session management indexed by user ID. File storage is handled through **AWS S3** with presigned URLs for direct client uploads (no server proxy). Transactional emails (verification, password reset, penalty notifications) go through the **Resend API**.

Additional libraries: **Lombok** for reducing boilerplate, **iCal4j** for RRULE recurrence parsing.

### Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React%20Router-7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)

A **React 19** single-page application written in **TypeScript 5.9**, bundled with **Vite 7.2** for fast builds and HMR during development. Routing uses **React Router 7** with protected routes that redirect unauthenticated users.

Rich text editing (for penalties and proof descriptions) uses **TipTap**. Icons from **Lucide React**, toast notifications via **React Toastify**. Recurring task patterns are generated with **RRule** (iCalendar-compatible). Data export uses **PapaParse** for CSV and **JSZip** for archives.

### Infrastructure

![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?style=flat-square&logo=docker&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS-S3-FF9900?style=flat-square&logo=amazons3&logoColor=white)
![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=flat-square&logo=render&logoColor=white)

Deploys as a single Docker container using a multi-stage build: frontend compilation, Spring Boot JAR packaging with embedded assets, then a minimal runtime on Eclipse Temurin's Alpine JRE. File storage uses a private S3 bucket with time-limited presigned URLs for access control.

---

## Data Models

The domain model centers on tasks, users, and the relationships between them. The design prioritizes clear ownership semantics and efficient querying patterns.

<details>
<summary><strong>View Entity Relationship Diagram</strong></summary>

```mermaid
erDiagram
    USER ||--o{ TASK_CREATOR : creates
    USER ||--o{ TASK_VERIFIER : verifies
    USER ||--o{ TASK_LIST : owns
    USER }|--o{ USER : saved_verifiers

    TASK_LIST ||--o{ TASK : contains
    TASK ||--|| PENALTY : has
    TASK ||--o{ PROOF_ATTACHMENT : has
    PENALTY ||--o{ PENALTY_ATTACHMENT : has

    USER {
        bigint id PK
        string fullName "encrypted"
        string email UK
        string passwordHash
        string timezone
        string profilePictureUrl
        boolean isEmailVerified
        string emailVerificationToken
        timestamp emailVerificationTokenExpiry
        string passwordResetToken
        timestamp passwordResetTokenExpiry
        timestamp createdAt
        timestamp updatedAt
    }

    TASK {
        bigint id PK
        string title "encrypted"
        string description "encrypted"
        timestamp deadline
        string location "encrypted"
        boolean isStarred
        string repeatPattern
        enum priority
        enum status
        bigint creator_id FK
        bigint verifier_id FK
        string tags "encrypted"
        bigint list_id FK
        string proofDescription "encrypted"
        string denialReason "encrypted"
        string approvalComment "encrypted"
        bigint penalty_id FK
        boolean penaltyEmailSent
        timestamp createdAt
        timestamp submittedAt
        timestamp verifiedAt
        timestamp completedAt
        timestamp rejectedAt
        timestamp updatedAt
    }

    TASK_LIST {
        bigint id PK
        string name
        string colorHex
        string icon
        boolean isDefault
        bigint user_id FK
        timestamp createdAt
        timestamp updatedAt
    }

    PENALTY {
        bigint id PK
        string content "encrypted"
        string contentHash
        boolean isExposed
        bigint user_id FK
        timestamp createdAt
    }

    PROOF_ATTACHMENT {
        bigint id PK
        string s3Key
        string originalFilename
        string mimeType
        bigint task_id FK
    }

    PENALTY_ATTACHMENT {
        bigint id PK
        string s3Key
        string originalFilename
        string mimeType
        string contentHash
        bigint penalty_id FK
    }
```

</details>

### Entity Overview

#### User

Stores account info: `fullName` (encrypted), `email`, `passwordHash` (BCrypt), `timezone` (IANA ID like `America/New_York`), and `profilePictureUrl`. Email verification is required before the account is active.

Users have a many-to-many self-reference for saved verifiers, which is a list of people you frequently assign as verifiers.

#### Task

The main entity. Contains `title` and `description` (both encrypted), `deadline`, `priority` (LOW/MEDIUM/HIGH/CRITICAL), and `status` (the verification loop state).

Recurring tasks store a `repeatPattern` in RRULE format. Each task links to a `creator_id` and `verifier_id`. Additional timestamps track when proof was submitted, when it was verified, and when the task was completed or rejected.

#### Penalty

Linked one-to-one with a task. The `content` field is encrypted and only visible to the verifier after the deadline is missed. A `contentHash` (SHA-256) prevents reusing the same penalty text after it's been exposed.

#### TaskList

Optional organization. Each list has a `name`, `colorHex`, and `icon`. Every user gets a default list on signup. When you delete a list, its tasks move to the default.

---

## Features Deep Dive

<details>
<summary><strong>Task Creation</strong></summary>

To create a task, you provide a title, deadline, verifier, and penalty content.

The penalty editor uses TipTap, so you can format text and attach files (images, documents). The system checks if you've used the same penalty content before and had it exposed. If so, you'll need to write something new.

When picking a verifier, you can choose from your saved list (with online/offline indicators) or enter any email address.

</details>

<details>
<summary><strong>Proof Submission</strong></summary>

When you've completed a task, you submit proof: a description (same TipTap editor as penalties) and optional file attachments.

Files upload directly to S3 via presigned URLs. The backend only stores metadata (filename, mime type, S3 key), not the actual bytes. Once you submit, your verifier gets a WebSocket notification immediately.

</details>

<details>
<summary><strong>Verification Review</strong></summary>

Verifiers see pending tasks in the "To Verify" tab. Each shows the proof description and any attached files.

You can **approve** (optionally with a comment) or **reject** (reason required). Approving marks the task `COMPLETED`. Rejecting sends it back to `PENDING_PROOF` so the creator can try again.

</details>

<details>
<summary><strong>Deadline Enforcement</strong></summary>

A scheduled job runs every minute. For each task, it checks whether the deadline has passed in the creator's timezone.

If a task misses its deadline:

1. Status changes to `MISSED`
2. The penalty is marked as exposed
3. The verifier gets a WebSocket notification
4. An email goes out containing the penalty content and any attached files (as presigned download links)

</details>

<details>
<summary><strong>Recurring Tasks</strong></summary>

Tasks can repeat using iCalendar RRULE patterns. When a recurring task completes or misses, the next instance is created automatically with the same penalty content.

Examples:

- `FREQ=DAILY`: every day
- `FREQ=WEEKLY;BYDAY=MO,WE,FR`: Monday, Wednesday, Friday
- `FREQ=MONTHLY;BYMONTHDAY=15`: the 15th of each month
- `FREQ=WEEKLY;COUNT=10`: weekly for 10 occurrences
- `FREQ=DAILY;UNTIL=20260301`: daily until March 1, 2026

</details>

<details>
<summary><strong>Supervising Mode</strong></summary>

The "Supervising" tab shows everyone who has assigned you as a verifier. For each person, you see counts: how many tasks are waiting for their proof, how many have proof you need to review, and how many you've completed.

Click on someone to expand their full task list.

</details>

<details>
<summary><strong>Filtering and Sorting</strong></summary>

**Task Lists** let you organize tasks into categories with custom colors and icons. The sidebar shows each list with its task count. You can move tasks between lists, and deleting a list moves its tasks to your default list.

**Filtering** works on title/description text, tags, priority level, status, starred flag, or deadline range. Filters combine, so you can narrow down to "high priority tasks due this week that are pending verification."

**Sorting** defaults to deadline, but you can sort by priority, status, or title. There's a secondary sort and tiebreaker (e.g., deadline, then priority, then starred).

</details>

<details>
<summary><strong>User Profile</strong></summary>

You can upload an avatar (goes to S3 via presigned URL) and set your timezone. The timezone matters: deadlines are evaluated in your local time, not the server's. A 5:00 PM deadline means 5:00 PM wherever you are.

</details>

---

## Security Model

### Authentication

![JWT](https://img.shields.io/badge/JWT-Stateless-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![BCrypt](https://img.shields.io/badge/BCrypt-Password%20Hashing-003A70?style=flat-square)

Stateless JWT authentication. On login, you get a signed token that expires after a configurable period (default 24 hours). The token is validated on every request by a Spring Security filter. Passwords are hashed with BCrypt before storage.

### Authorization

Permissions are relationship-based and enforced in the service layer:

- **Creators** can edit their task, submit proof, and reassign verifiers
- **Verifiers** can approve or reject proof
- Both can view the task details
- Creators always see their penalty content; verifiers only see it after exposure

### Data Encryption

![AES](https://img.shields.io/badge/AES-Encryption-4B0082?style=flat-square)
![SHA-256](https://img.shields.io/badge/SHA--256-Hashing-8B0000?style=flat-square)

Sensitive fields are encrypted at rest using AES, applied via a JPA attribute converter. This includes user full names, task titles/descriptions/locations/tags, proof descriptions, penalty content, and review comments.

Penalty content is also SHA-256 hashed on creation. When you create a new task, the system checks if that hash matches any previously exposed penalties and rejects duplicates.

### File Access

![S3](https://img.shields.io/badge/S3-Private%20Bucket-FF9900?style=flat-square&logo=amazons3&logoColor=white)

All files go to a private S3 bucket with no public access. The backend generates presigned URLs: 15-minute expiry for uploads, 60-minute expiry for downloads.

---

## Real-Time Communication

WebSocket connections push updates to users when task states change.

<details>
<summary><strong>View WebSocket Sequence Diagram</strong></summary>

```mermaid
sequenceDiagram
    participant Creator
    participant Server
    participant Verifier

    Creator->>Server: Create Task
    Server->>Server: Persist Task
    Server-->>Creator: NEW_TASK_ASSIGNED
    Server-->>Verifier: NEW_TASK_ASSIGNED

    Creator->>Server: Submit Proof
    Server->>Server: Update Status
    Server-->>Creator: TASK_UPDATED
    Server-->>Verifier: TASK_UPDATED

    Verifier->>Server: Approve Proof
    Server->>Server: Mark Completed
    Server-->>Creator: TASK_UPDATED
    Server-->>Verifier: TASK_UPDATED

    Note over Server: Deadline passes without verification

    Server->>Server: Deadline Check (Scheduled)
    Server->>Server: Expose Penalty
    Server-->>Creator: TASK_MISSED
    Server-->>Verifier: PENALTY_UNLOCKED
    Server->>Verifier: Email with Penalty
```

</details>

### Connection Management

Clients connect via WebSocket and pass their JWT as a query parameter. The server validates the token during handshake and stores the session indexed by user ID.

If the connection drops, the client uses exponential backoff (1s, 2s, 4s... up to 30s) to reconnect. On intentional logout, no reconnection is attempted.

### Message Types

- `NEW_TASK_ASSIGNED`: sent to both creator and verifier when a task is created
- `TASK_UPDATED`: sent when any task property changes or status transitions
- `TASK_MISSED`: sent to the creator when their deadline passes
- `PENALTY_UNLOCKED`: sent to the verifier when a penalty is exposed
- `USER_STATUS`: broadcast to all connected users when someone connects or disconnects

---

## API Reference

<details>
<summary><strong>Authentication Endpoints</strong></summary>

| Method | Endpoint                        | Description                  | Auth |
| :----: | ------------------------------- | ---------------------------- | :--: |
| `POST` | `/api/auth/signup`              | Register new account         |  No  |
| `GET`  | `/api/auth/verify-email`        | Verify email with token      |  No  |
| `POST` | `/api/auth/resend-verification` | Resend verification email    |  No  |
| `POST` | `/api/auth/login`               | Authenticate and receive JWT |  No  |
| `POST` | `/api/auth/forgot-password`     | Request password reset       |  No  |
| `POST` | `/api/auth/reset-password`      | Reset password with token    |  No  |

</details>

<details>
<summary><strong>Task Endpoints</strong></summary>

| Method | Endpoint                   | Description                      | Auth |
| :----: | -------------------------- | -------------------------------- | :--: |
| `GET`  | `/api/tasks`               | List user's tasks                | Yes  |
| `GET`  | `/api/tasks/list/{listId}` | List tasks in specific list      | Yes  |
| `GET`  | `/api/tasks/to-verify`     | List tasks awaiting verification | Yes  |
| `POST` | `/api/tasks`               | Create new task                  | Yes  |
| `PUT`  | `/api/tasks/{id}`          | Update task details              | Yes  |
| `PUT`  | `/api/tasks/{id}/reassign` | Change task verifier             | Yes  |
| `PUT`  | `/api/tasks/{id}/move`     | Move task to different list      | Yes  |
| `GET`  | `/api/tasks/{id}/details`  | Get task with proof and penalty  | Yes  |
| `POST` | `/api/tasks/{id}/proof`    | Submit proof for task            | Yes  |
| `POST` | `/api/tasks/{id}/review`   | Approve or reject proof          | Yes  |

</details>

<details>
<summary><strong>Task List Endpoints</strong></summary>

|  Method  | Endpoint          | Description                            | Auth |
| :------: | ----------------- | -------------------------------------- | :--: |
|  `GET`   | `/api/lists`      | List user's task lists                 | Yes  |
|  `POST`  | `/api/lists`      | Create new list                        | Yes  |
|  `PUT`   | `/api/lists/{id}` | Update list properties                 | Yes  |
| `DELETE` | `/api/lists/{id}` | Delete list (tasks migrate to default) | Yes  |

</details>

<details>
<summary><strong>Verifier Endpoints</strong></summary>

|  Method  | Endpoint                     | Description               | Auth |
| :------: | ---------------------------- | ------------------------- | :--: |
|  `GET`   | `/api/verifiers`             | List saved verifiers      | Yes  |
|  `POST`  | `/api/verifiers`             | Add saved verifier        | Yes  |
| `DELETE` | `/api/verifiers/{email}`     | Remove saved verifier     | Yes  |
|  `GET`   | `/api/verifiers/supervisees` | List users you verify for | Yes  |

</details>

<details>
<summary><strong>User Endpoints</strong></summary>

| Method | Endpoint             | Description              | Auth |
| :----: | -------------------- | ------------------------ | :--: |
| `GET`  | `/api/users/me`      | Get current user profile | Yes  |
| `PUT`  | `/api/users/me`      | Update profile           | Yes  |
| `GET`  | `/api/users/presign` | Get presigned upload URL | Yes  |

</details>

<details>
<summary><strong>Upload Endpoints</strong></summary>

| Method | Endpoint                      | Description                              | Auth |
| :----: | ----------------------------- | ---------------------------------------- | :--: |
| `POST` | `/api/upload/presign`         | Get presigned URL for proof upload       | Yes  |
| `POST` | `/api/upload/presign/penalty` | Get presigned URL for penalty attachment | Yes  |

</details>

---

## Deployment

### Docker Deployment

The application ships as a single Docker image that includes both the compiled frontend and the Spring Boot backend.

```bash
# Build the image
docker build -t cosign .

# Run with environment file
docker run -p 8080:8080 --env-file .env cosign
```

### Production Considerations

- **Database Pool**: Default is max 5 connections with 0 min idle. Adjust based on your load.
- **Memory**: The JVM is container-aware, but add explicit `-Xmx` flags if you're in a constrained environment.
- **Health Checks**: `/api/health` endpoint returns 200 when the app is ready.
- **Static Assets**: Filenames are hashed, so you can set long cache headers via CDN or reverse proxy.

---

## Local Development

### Prerequisites

- Java JDK 21+
- Node.js 20+
- PostgreSQL 15+
- Maven 3.9+

### Quick Start

**Backend:**

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
./mvnw spring-boot:run
```

Runs on `http://localhost:8080`

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` with hot reload

### Database Setup

```sql
CREATE DATABASE cosign;
CREATE USER cosign_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cosign TO cosign_user;
```

Hibernate auto-updates the schema on startup during development.

---

## Environment Variables

### Database

```
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/cosign
SPRING_DATASOURCE_USERNAME=cosign_user
SPRING_DATASOURCE_PASSWORD=secure_password
```

### Security

```
APP_JWT_SECRET=your-256-bit-secret-key-here
APP_JWT_EXPIRE=86400000
APP_ENCRYPTION_SECRET=16-char-secret!
```

`APP_JWT_EXPIRE` is in milliseconds (86400000 = 24 hours). `APP_ENCRYPTION_SECRET` must be exactly 16 characters for AES.

### External Services

```
APP_FRONTEND_URL=https://cosign-nwwl.onrender.com
RESEND_API_KEY=re_xxxxx
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/...
AWS_REGION=us-east-1
AWS_S3_BUCKET=cosign-uploads
```

`APP_FRONTEND_URL` is used in email links. The AWS credentials need S3 read/write permissions on the specified bucket.

---

## License

This project is available under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-Shahir--47%2FCoSign-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Shahir-47/CoSign)

</div>
