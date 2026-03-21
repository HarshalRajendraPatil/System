# GrindForge Complete Website Report

## 1. Executive Overview

GrindForge is a full-stack interview preparation platform built as a gamified progression system. It combines daily habit tracking, domain-specific preparation modules, AI coaching, AI simulation, realtime synchronization, public portfolio publishing, and admin governance controls in one integrated system.

The product model is:
- Progress-driven behavior reinforcement through XP, levels, streaks, and badges.
- Deep operational modules for technical, behavioral, and interview simulation workflows.
- AI-assisted analysis and guidance based on actual user performance signals.
- Realtime updates to reduce stale state and provide multi-session continuity.
- Role-protected administration with platform-wide visibility and control.


## 2. Technology Stack

### Frontend
- React (Vite build pipeline)
- Axios for API client networking
- Sonner for notifications
- Recharts for visual analytics
- Monaco editor integration for coding responses in simulator
- html2pdf / jsPDF utilities for PDF exports
- Socket.IO client for realtime sync

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT authentication
- HTTP-only cookie session strategy
- Express rate limiting + Helmet + CORS + Morgan
- Socket.IO realtime server with optional Redis adapter

### Data Layer
- MongoDB collections for all user progression and module entities
- Model-level indexing for frequent query paths


## 3. Product Architecture

### Runtime Topology
- Frontend app (Client)
- REST API + realtime socket server (Server)
- MongoDB persistence
- Optional Redis pub/sub for horizontal realtime scaling

### Request and Event Flow
1. User authenticates via auth endpoints and secure cookies.
2. Frontend loads dashboard and module data via REST.
3. Domain actions update module records and RPG progression.
4. Realtime events publish cross-session updates.
5. UI performs silent hydration to maintain consistency.

### State Domains
- Identity and authorization
- RPG progression (XP/level/streak/achievements)
- Domain prep data (DSA, design, projects, mocks, behavioral, AI)
- Portfolio projection and export data
- Admin platform observability and user governance


## 4. Roles and Access Control

### User Roles
- user
- admin

### User Role Capabilities
- Personal dashboard and all prep modules
- Portfolio creation and publishing
- AI coaching and simulator usage
- No admin route access

### Admin Role Capabilities
- All user capabilities
- Platform command center access
- Global metrics and activity feed
- User account lifecycle and role management

### Enforcement Strategy
- Backend route-level authorization with role checks
- Frontend tab visibility restrictions for admin UI
- Admin self-protection restrictions:
  - Cannot demote self
  - Cannot deactivate self
  - Cannot delete self


## 5. Authentication, Session, and Security

### Authentication Lifecycle
- Register
- Login
- Refresh session
- Logout
- Get current session user

### Credential and Password Policy
- Username pattern validation
- Email format validation
- Password minimum 8 characters
- Password requires uppercase + lowercase + numeric

### Session Strategy
- Access token + refresh token JWT model
- Tokens stored in HTTP-only cookies
- Refresh token hashed before persistence
- Refresh expiry timestamp persisted
- Session invalidation through refresh token nullification

### Client Auto-Recovery
- Axios interceptor retries failed protected requests after refresh (401 handling)
- Non-auth endpoints auto-attempt refresh once

### Security Middlewares
- CORS with credentials and explicit client origin
- Helmet for HTTP hardening
- JSON body size limits
- Centralized error handling
- Unified not-found handler

### Rate Limit Layers
- API global read/write budget
- Auth-specific limiter
- Login-specific stricter limiter
- Write limiter
- AI limiter
- Public-read limiter


## 6. Realtime System

### Realtime Infrastructure
- Socket.IO server integrated with Express HTTP server
- JWT validation in socket middleware
- Per-user room subscriptions
- Global leaderboard room subscription

### Realtime Events
- Connection acknowledgement
- Connection error
- User progress updated
- Leaderboard updated
- Domain updated

### Domain Event Categories
- created
- updated
- deleted
- moved
- practiced
- generated
- bulk_refresh

### Frontend Realtime Behavior
- Live status indicator panel
- Auto-subscription on connect
- Visibility-aware reconnect behavior
- Local event dispatch for module-level listeners
- Silent hydration scheduling to sync eventual consistency


## 7. RPG Core Engine

### Core Gameplay Objects
- Daily quest record per user per date
- User profile progression fields
- Leaderboard ranking projection
- Achievement unlock state

### Leveling
- Level cap: 100
- Progressive level threshold growth
- XP in current level tracking
- XP to next level tracking
- Level progress percentage tracking

### Streak Logic
- Current streak
- Longest streak
- Completion-day dependent streak continuation

### Daily Quest Completion Rule
A day is considered complete only when at least 3 quest categories are checked.

### Daily Quest Trackable Categories
- dsa
- lldHld
- projectWork
- theoryRevision
- mockInterview
- behavioralStories

### XP Components
- DSA + LLD combo bonus
- Project work bonus
- Theory revision bonus
- Mock interview bonus
- Behavioral stories bonus
- DSA difficulty XP (Easy, Medium, Hard)
- Hours multiplier XP
- Simulator bonus XP (when applicable)

### XP Breakdown Persistence
- Detailed per-source breakdown stored in each daily quest record
- Exposed via quest detail and XP overview APIs


## 8. Achievements and Badges

### Criteria Families
- XP milestone
- Streak milestone
- Count milestone

### Expanded Badge System
The platform includes broad multi-tier badge ladders across:
- Total XP
- Streak length
- DSA solved count
- Mock count
- Project shipped count
- Behavioral practice count
- Daily quest completion count

### Badge UX
- Locked and unlocked badge rendering
- Hover detail with criteria and progress
- Newly unlocked highlight animations
- Compact mode with expand/collapse behavior


## 9. Dashboard Experience

### Header and Session UX
- User identity display
- Logout action
- Status and error banners

### Main Stats
- Current streak and longest streak
- Level and cap
- Total XP
- Global leaderboard rank

### Progress Visualization
- Level progress section
- XP-to-next breakdown

### Daily Quest Interaction
- Checkbox toggles
- Hours input
- DSA difficulty selection
- Save action
- XP preview

### History and Drilldown
- Recent quest history list
- Click-to-open quest detail panel
- Per-day detailed XP source breakdown
- Current day edit flow support

### Rewards UX
- Confetti on level-up
- Toasts on badge unlock


## 10. DSA Module

### Functional Scope
- Log DSA problem
- Update DSA problem
- Delete DSA problem
- List with filters
- Stats aggregation
- LeetCode settings and synchronization

### Problem Data
- title
- difficulty
- platform
- link
- completion date key
- notes
- tags
- source key for deduplication
- xp earned

### Difficulty XP
- Easy
- Medium
- Hard

### Filters
- difficulty
- platform
- date range
- tag

### DSA Stats
- Total solved count
- Difficulty distribution
- XP totals by bucket
- Platform breakdown

### LeetCode Integration
- Username setting persistence on profile
- Recent accepted submission ingestion (bounded window)
- Metadata enrichment with fallback strategy
- Source-key dedupe to prevent duplicate imports
- Snapshot enrichment for analytics dashboard


## 11. Analytics Module

### Visualization Surface
- LeetCode profile snapshot cards
- Recent submissions listing
- Year heatmap (GitHub/LeetCode style)
- Difficulty pie chart
- Contest rating trend line
- Contest rank trend bars
- Weekly solve bars
- Cumulative progress line chart

### Integration Workflow
1. User stores LeetCode username.
2. Sync job imports accepted submissions.
3. Analytics endpoint aggregates transformed data.
4. Charts render historical and current-state projections.


## 12. LLD/HLD Vault Module

### Functional Scope
- Create design entry
- List and filter entries
- View single entry
- Update entry
- Toggle completion
- Delete entry
- Fetch stats and unique tags

### Design Metadata
- title
- design type (LLD / HLD / Both)
- content
- description
- category
- difficulty
- tags
- resources
- notes
- completion status and timestamp
- view metrics

### RPG Sync Integration
- LLD/HLD actions auto-sync daily quest state
- Theory revision mapping is currently tied to this activity path


## 13. Projects Workspace Module

### Functional Scope
- Kanban workflow with move transitions
- Project CRUD
- Project metrics and impact views
- Search/filter by keyword, priority, tag

### Status Pipeline
- idea
- planning
- in_progress
- blocked
- shipped
- archived

### Priority Scale
- low
- medium
- high
- critical

### Impact Model
- users impacted
- revenue impact
- performance gain
- time saved
- quality score
- adoption rate
- confidence
- normalized impact score

### Auditability
- Movement history captures from/to status with note and timestamp


## 14. Mocks Module

### Functional Scope
- Mock log CRUD
- Calendar view
- Trend analytics
- Multi-dimensional filtering

### Interview Dimensions
- format (dsa, system_design, behavioral, mixed)
- interviewer type (self, peer, mentor, ai, panel)
- section-level scores
- confidence before and after
- strengths / weaknesses / action items

### Analytics Outputs
- Trend windows by day range
- Weakness patterns
- Score progression summaries

### Integration with Simulator
- Completed simulator sessions auto-create synced mock entries
- Deleting simulator session also deletes the linked mock record


## 15. Behavioral Module

### Functional Scope
- STAR story CRUD
- Practice log capture
- Random practice recommendation
- Analytics dashboard

### STAR Data Model
- prompt and context
- situation
- task
- action
- result
- competencies
- tags
- quantified impact
- reflection notes
- confidence score
- favorite flag
- practice log entries

### Filtering and Sorting
- competency
- tag
- difficulty
- outcome
- favorites
- confidence and practice-based sort orders

### Practice Loop
- Random story retrieval with constraints
- Practice session logging with self-score and feedback
- Practice count and last-practiced tracking


## 16. AI Coach Module

### Functional Scope
- Generate full report
- Generate motivation-focused output
- View latest output
- View history
- Delete history items
- Fetch performance snapshot context

### Input Controls
- focus area
- tone
- custom prompt

### Tone Options
- balanced
- tough_love
- supportive

### Generation Provider Logic
- Primary: Gemini model
- Fallback: local heuristic coach engine

### Persistence and Observability
- Provider and model stored per insight
- Latency and token usage tracking
- Snapshot used for generation persisted with insight

### Realtime Integration
- Refreshes with domain updates and user progress events


## 17. AI Interview Simulator Module

### Functional Scope
- Start session by difficulty and round type
- Sequential question answering
- Rich text answer capture
- Optional code answer capture
- AI feedback after each answer
- Final scoring and summary
- History browsing and loading
- Session deletion
- PDF transcript export

### Session Rules
- Total questions: 4
- Session statuses: active, completed
- Round types: coding, lld, behavioral, mixed
- Difficulty: easy, medium, hard

### Feedback Artifacts
- Per-question rating
- Identified gaps
- Improved answer suggestion
- Overall weaknesses and summary

### Reward Integration
- Simulator completion grants RPG bonus XP
- Completion contributes to daily quest and synced mock workflows


## 18. Portfolio Module

### Private User Portfolio Features
- Profile settings management
- Slug management and uniqueness
- Theme and accent customization
- Public visibility toggle
- Section inclusion toggles
- Contact links with URL validation

### Public Portfolio Features
- Slug-based public endpoint
- Public rendering with prep metrics and highlights
- Optional portfolio query mode in app shell

### Export and Reporting
- Export endpoint assembles comprehensive performance payload
- Client renders printable/exportable report with charts
- Includes fallback-safe AI insights for readiness narrative

### Portfolio Snapshot Coverage
- User profile progression
- Quest trend series
- DSA stats
- Project metrics
- Mock trends
- Behavioral analytics
- AI insight excerpts


## 19. Admin Dashboard Module

### Access Control
- Backend route: admin role required
- Frontend tab rendered only for admin users

### Admin Overview KPIs
- Total users
- Active users
- Admin users
- New users in rolling window
- Total XP across users
- Average level
- Average streak
- Completed quests today

### Module Inventory Counters
- DSA problems
- LLD/HLD designs
- Projects
- Mock interviews
- Behavioral stories
- AI coach insights
- Interview simulations
- Portfolios
- Daily quests
- Badges

### Top User Visibility
- Leaderboard-style top users by progression

### User Administration Surface
- Paginated user list
- Search by username/display/email
- Filter by role and active status
- Sort by created/login/xp/level/name
- Update role
- Activate/deactivate account
- Delete user and cascade-delete linked module data

### Activity Feed
- Aggregated recent actions from major domains
- Paginated feed response and UI

### Numeric UX
- Compact number formatting (K/M/B style) applied across admin metrics and pagination summaries


## 20. API Surface Summary

### Health
- GET /api/v1/health

### Auth
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- GET /api/v1/auth/me

### RPG
- GET /api/v1/rpg/dashboard
- GET /api/v1/rpg/achievements
- GET /api/v1/rpg/leaderboard/global
- GET /api/v1/rpg/daily-quest/history
- GET /api/v1/rpg/daily-quest/detail
- GET /api/v1/rpg/daily-quest/xp-overview
- PUT /api/v1/rpg/daily-quest

### DSA
- POST /api/v1/dsa/problems
- GET /api/v1/dsa/problems
- PUT /api/v1/dsa/problems/:id
- DELETE /api/v1/dsa/problems/:id
- GET /api/v1/dsa/stats
- GET /api/v1/dsa/analytics
- GET /api/v1/dsa/leetcode/settings
- PUT /api/v1/dsa/leetcode/settings
- POST /api/v1/dsa/leetcode/sync

### LLD/HLD
- POST /api/v1/lld-hld
- GET /api/v1/lld-hld
- GET /api/v1/lld-hld/:id
- PUT /api/v1/lld-hld/:id
- PATCH /api/v1/lld-hld/:id/completion
- DELETE /api/v1/lld-hld/:id
- GET /api/v1/lld-hld/stats
- GET /api/v1/lld-hld/tags

### Projects
- GET /api/v1/projects/kanban
- GET /api/v1/projects/metrics
- GET /api/v1/projects/:id
- POST /api/v1/projects
- PUT /api/v1/projects/:id
- PATCH /api/v1/projects/:id/move
- DELETE /api/v1/projects/:id

### Mocks
- GET /api/v1/mocks/logs
- POST /api/v1/mocks/logs
- PUT /api/v1/mocks/logs/:id
- DELETE /api/v1/mocks/logs/:id
- GET /api/v1/mocks/calendar
- GET /api/v1/mocks/trends

### Behavioral
- GET /api/v1/behavioral/stories
- GET /api/v1/behavioral/stories/:id
- POST /api/v1/behavioral/stories
- PUT /api/v1/behavioral/stories/:id
- DELETE /api/v1/behavioral/stories/:id
- POST /api/v1/behavioral/stories/:id/practice
- GET /api/v1/behavioral/practice/random
- GET /api/v1/behavioral/analytics/overview

### AI Coach
- GET /api/v1/ai/history
- DELETE /api/v1/ai/history/:id
- GET /api/v1/ai/latest
- GET /api/v1/ai/snapshot
- POST /api/v1/ai/coach/report
- POST /api/v1/ai/coach/motivation

### Interview Simulator
- GET /api/v1/interview-simulator/history
- GET /api/v1/interview-simulator/:id
- DELETE /api/v1/interview-simulator/:id
- POST /api/v1/interview-simulator/start
- POST /api/v1/interview-simulator/:id/answer

### Portfolio
- GET /api/v1/portfolio/public/:slug
- GET /api/v1/portfolio/me
- PATCH /api/v1/portfolio/settings
- GET /api/v1/portfolio/export

### Admin
- GET /api/v1/admin/overview
- GET /api/v1/admin/users
- PATCH /api/v1/admin/users/:id
- DELETE /api/v1/admin/users/:id
- GET /api/v1/admin/activity/recent


## 21. Data Collections and Purpose

- UserProfile: identity, auth metadata, role, progression.
- DailyQuest: per-day quest checklist, XP, completion, breakdown.
- DSAProblem: solved problem logs and sync provenance.
- LLDHLDDesign: design vault artifacts.
- Project: kanban and impact-tracked project entities.
- MockInterview: interview log records and score telemetry.
- BehavioralStory: STAR stories with practice history.
- AICoachInsight: generated coaching outputs and usage metadata.
- InterviewSimulation: simulator sessions and question-level feedback.
- PortfolioProfile: public portfolio configuration.
- UserBadge: unlocked achievement records.


## 22. Pagination Coverage

Implemented pagination controls for major high-volume UI surfaces:
- DSA problems list
- Mock logs list
- Behavioral stories list
- AI coach history
- Interview simulator history
- Admin users list
- Admin recent activity feed

Pagination labels use compact number formatting where displayed.


## 23. Error Handling and Reliability

- Centralized error middleware for consistent API response shape.
- Graceful route-not-found responses.
- Client-side retry path for auth refresh.
- Realtime disconnection tolerance with reconnect logic.
- Fallback AI generation when primary model is unavailable.


## 24. Performance and Operational Notes

- Client production build currently succeeds.
- Build reports indicate large chunk warnings for some bundles.
- Server test script currently indicates no automated tests yet.
- Optional Redis adapter allows scaling realtime beyond single-process socket delivery.


## 25. Known Improvement Opportunities

1. Add automated tests (unit + integration + e2e).
2. Introduce deeper server-side pagination on all read-heavy endpoints.
3. Improve bundle splitting for heavy client modules.
4. Add immutable admin audit logs for governance tracing.
5. Expand operational observability (structured logs + metrics dashboards).


## 26. Final Product State

GrindForge currently operates as a complete and cohesive prep ecosystem with:
- Secure authentication and role-based access control
- Full RPG progression backbone
- Rich prep domain modules
- AI coaching and simulation features
- Public portfolio and export tooling
- Realtime synchronization infrastructure
- Admin command and governance dashboard

This is no longer a single tracker feature set. It is an integrated placement-prep platform with end-to-end user workflows, data persistence, and operational controls.
