# Claude Code ENABLE_TASKS 시스템 1:1 포팅

## TL;DR

> **Quick Summary**: Claude Code의 Task 시스템을 oh-my-opencode에 100% 호환되게 포팅. 4개 분리 도구(TaskCreate, TaskGet, TaskUpdate, TaskList), Claude Code 스키마/프롬프트 완전 일치, Task Reminder Hook, Idle Notification 구현.
> 
> **Deliverables**:
> - TaskCreate, TaskGet, TaskUpdate, TaskList 도구 4개
> - Claude Code 호환 Task 스키마 (subject, activeForm, blocks, blockedBy, metadata)
> - Task Reminder Hook (10턴 미사용시)
> - Idle Notification 시스템
> - 기존 task_tool 제거 및 참조 정리
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (스키마) → Task 2-5 (도구) → Task 6-7 (Hook/Notification) → Task 8 (정리)

---

## Context

### Original Request
Claude Code의 ENABLE_TASKS 시스템을 oh-my-opencode에 1:1 완전 호환 포팅.
- 4개 분리 도구: TaskCreate, TaskGet, TaskUpdate, TaskList
- Claude Code 스키마/프롬프트 완전 일치
- Task Reminder Hook, Idle Notification 포함

### Interview Summary
**Key Discussions**:
- **기존 task_tool 처리**: 완전 대체 (제거 후 4개 도구로 교체)
- **기존 필드 처리**: parentID, repoURL, threadID 완전 제거 (Claude Code 1:1 호환)
- **저장소 경로**: `.sisyphus/tasks/{team-name}/` (기존 경로 유지)
- **테스트 전략**: TDD (RED-GREEN-REFACTOR)

**Research Findings**:
- 현재 `src/tools/sisyphus-tasks/task-tool.ts`: 1개 통합 도구 (284 lines)
- 현재 `src/features/sisyphus-tasks/types.ts`: Task 스키마 정의
- 현재 `src/features/sisyphus-tasks/storage.ts`: `acquireLock()` 함수 존재 (30초 stale)
- Hook 패턴: `src/hooks/index.ts`에서 export, `HookNameSchema`에 추가 필요

### Metis Review
**Identified Gaps** (addressed):
- **Claim 검증 로직**: 5가지 실패 사유 조건 명확화 (Claude Code 스펙 기반)
- **lockSync 구현**: 기존 `acquireLock` 활용 (이미 동기적 파일 락 지원)
- **deleted status**: 파일 삭제 없이 status 변경만 (Claude Code 방식)

---

## Work Objectives

### Core Objective
Claude Code의 ENABLE_TASKS 플래그 시스템과 100% 동일하게 동작하는 Task 시스템을 oh-my-opencode에 구현한다.

### Concrete Deliverables
- `src/tools/claude-tasks/task-create.ts` - TaskCreate 도구
- `src/tools/claude-tasks/task-get.ts` - TaskGet 도구
- `src/tools/claude-tasks/task-update.ts` - TaskUpdate 도구
- `src/tools/claude-tasks/task-list.ts` - TaskList 도구
- `src/features/claude-tasks/types.ts` - Claude Code 호환 Task 스키마
- `src/features/claude-tasks/storage.ts` - `.sisyphus/tasks/` 저장소
- `src/hooks/task-reminder/index.ts` - Task Reminder Hook
- Idle Notification 시스템 (send-message-tool 활용)

### Definition of Done
- [ ] `bun test src/tools/claude-tasks/` → 모든 테스트 통과
- [ ] `bun test src/features/claude-tasks/` → 모든 테스트 통과
- [ ] `bun test src/hooks/task-reminder/` → 모든 테스트 통과
- [ ] `bun run typecheck` → 에러 없음
- [ ] 기존 `task_tool` 참조 모두 제거됨

### Must Have
- Claude Code와 동일한 4개 도구 이름: TaskCreate, TaskGet, TaskUpdate, TaskList
- Claude Code 스키마 필드: id, subject, description, status, activeForm, blocks, blockedBy, owner, metadata
- Claude Code Status 값: pending, in_progress, completed, deleted
- 저장소 경로: `.sisyphus/tasks/{team-name}/{id}.json`
- Claude Code description 텍스트 그대로 사용
- Claim 검증 로직 (5가지 실패 사유)
- Task Reminder Hook (10턴 미사용시)
- Idle Notification (teammate 종료시)

### Must NOT Have (Guardrails)
- **기존 필드 유지 금지**: parentID, repoURL, threadID 필드 사용 금지
- **확장 기능 금지**: Claude Code에 없는 기능 추가 금지
- **과도한 추상화 금지**: 불필요한 헬퍼 함수, wrapper 클래스 금지
- **description 수정 금지**: Claude Code 프롬프트 텍스트 그대로 사용


---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: TDD
- **Framework**: bun test

### TDD Workflow

각 TODO는 RED-GREEN-REFACTOR 패턴을 따릅니다:

1. **RED**: 테스트 먼저 작성 → `bun test [file]` → FAIL
2. **GREEN**: 최소 구현 → `bun test [file]` → PASS
3. **REFACTOR**: 정리 → `bun test [file]` → PASS (유지)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Claude Code 호환 Task 스키마 정의
└── (단독 - 모든 도구의 기반)

Wave 2 (After Wave 1):
├── Task 2: TaskCreate 도구 구현
├── Task 3: TaskGet 도구 구현
├── Task 4: TaskUpdate 도구 구현
└── Task 5: TaskList 도구 구현

Wave 3 (After Wave 2):
├── Task 6: Task Reminder Hook 구현
└── Task 7: Idle Notification 구현

Wave 4 (After Wave 3):
├── Task 8: 기존 task_tool 제거 및 참조 정리
└── Task 9: 통합 테스트 및 검증

Critical Path: Task 1 → Task 2-5 → Task 6-7 → Task 8-9
Parallel Speedup: ~50% faster (Wave 2에서 4개 도구 병렬)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | None (foundation) |
| 2 | 1 | 6, 7, 8 | 3, 4, 5 |
| 3 | 1 | 6, 7, 8 | 2, 4, 5 |
| 4 | 1 | 6, 7, 8 | 2, 3, 5 |
| 5 | 1 | 6, 7, 8 | 2, 3, 4 |
| 6 | 2, 3, 4, 5 | 8 | 7 |
| 7 | 2, 3, 4, 5 | 8 | 6 |
| 8 | 6, 7 | 9 | None |
| 9 | 8 | None | None (final) |

---

## TODOs

### Task 1: Claude Code 호환 Task 스키마 정의

**What to do**:
- `src/features/claude-tasks/types.ts` 생성
- Claude Code 스키마 정의 (Zod)
- `src/features/claude-tasks/storage.ts` 생성 (`.sisyphus/tasks/` 경로)
- `src/features/claude-tasks/index.ts` barrel export

**Must NOT do**:
- parentID, repoURL, threadID 필드 추가 금지

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: 스키마 정의는 단순한 타입 작업
- **Skills**: [`typescript-programmer`]
  - `typescript-programmer`: Zod 스키마 정의에 필요

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 1 (단독)
- **Blocks**: Task 2, 3, 4, 5
- **Blocked By**: None

**References**:

**Pattern References**:
- `src/features/sisyphus-tasks/types.ts:1-36` - 현재 Task 스키마 패턴 (Zod 사용법)
- `src/features/sisyphus-tasks/storage.ts:1-125` - 저장소 패턴 (acquireLock, readJsonSafe, writeJsonAtomic)

**Type References**:
- Claude Code TaskCreate Output: `{ task: { id, subject } }`
- Claude Code TaskGet Output: `{ task: { id, subject, description, status, blocks, blockedBy, owner, metadata } | null }`
- Claude Code TaskUpdate Output: `{ success, taskId, updatedFields, error?, statusChange? }`
- Claude Code TaskList Output: `{ tasks: [{ id, subject, status, owner?, blockedBy }] }`

**Claude Code 스키마 (정확한 정의)**:
```typescript
// Status
type TaskStatus = "pending" | "in_progress" | "completed" | "deleted"

// Task 스키마
interface Task {
  id: string
  subject: string           // imperative form ("Run tests")
  description: string
  status: TaskStatus
  activeForm?: string       // present continuous ("Running tests")
  blocks: string[]          // 이 task가 차단하는 task IDs
  blockedBy: string[]       // 이 task를 차단하는 task IDs
  owner?: string            // agent name
  metadata?: Record<string, unknown>
}
```

**저장소 경로**:
```
.sisyphus/tasks/{team-name}/{id}.json
```

**Acceptance Criteria**:

- [ ] Test file created: `src/features/claude-tasks/types.test.ts`
- [ ] Test covers: Task 스키마 파싱, status enum 검증, blocks/blockedBy 배열
- [ ] `bun test src/features/claude-tasks/types.test.ts` → PASS

- [ ] Test file created: `src/features/claude-tasks/storage.test.ts`
- [ ] Test covers: getTaskDir returns `.sisyphus/tasks/{team}`, readJsonSafe, writeJsonAtomic, acquireLock
- [ ] `bun test src/features/claude-tasks/storage.test.ts` → PASS

**Commit**: YES
- Message: `feat(claude-tasks): add Claude Code compatible Task schema and storage`
- Files: `src/features/claude-tasks/types.ts`, `src/features/claude-tasks/storage.ts`, `src/features/claude-tasks/index.ts`, `src/features/claude-tasks/*.test.ts`
- Pre-commit: `bun test src/features/claude-tasks/`

---

### Task 2: TaskCreate 도구 구현

**What to do**:
- `src/tools/claude-tasks/task-create.ts` 생성
- Claude Code description 텍스트 그대로 사용
- 파일 락으로 동시성 제어

**Must NOT do**:
- description 텍스트 수정 금지
- 추가 파라미터 금지 (Claude Code 스펙 외)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: 단일 도구 구현
- **Skills**: [`typescript-programmer`]
  - `typescript-programmer`: TypeScript 도구 구현

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
- **Blocks**: Task 6, 7, 8
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `src/tools/sisyphus-tasks/task-tool.ts:40-72` - create action 패턴 (락 획득, ID 생성, 파일 저장)
- `src/tools/sisyphus-swarm/teammate-tool.ts:1-57` - 도구 정의 패턴 (tool() 사용법)

**Claude Code TaskCreate 스키마 (정확한 정의)**:
```typescript
// Input
{
  subject: string       // required, imperative form
  description: string   // required
  activeForm?: string   // optional, present continuous for spinner
  metadata?: object     // optional
}

// Output
{
  task: {
    id: string
    subject: string
  }
}
```

**Claude Code TaskCreate Description (그대로 사용)**:
```
Create a new task in the team's task list.

**IMPORTANT**: Always provide activeForm when creating tasks. The subject should be imperative ("Run tests") while activeForm should be present continuous ("Running tests"). All tasks are created with status `pending`.
```

**Acceptance Criteria**:

- [ ] Test file created: `src/tools/claude-tasks/task-create.test.ts`
- [ ] Test covers: subject/description 필수, activeForm 선택, metadata 선택, 생성된 task 검증
- [ ] `bun test src/tools/claude-tasks/task-create.test.ts` → PASS

**Manual Verification**:
```typescript
// REPL verification
> const result = await TaskCreate.execute({ subject: "Run tests", description: "Execute test suite" }, ctx)
> result.task.id  // "1"
> result.task.subject  // "Run tests"
```

**Commit**: YES
- Message: `feat(claude-tasks): add TaskCreate tool with Claude Code compatible schema`
- Files: `src/tools/claude-tasks/task-create.ts`, `src/tools/claude-tasks/task-create.test.ts`
- Pre-commit: `bun test src/tools/claude-tasks/task-create.test.ts`

---

### Task 3: TaskGet 도구 구현

**What to do**:
- `src/tools/claude-tasks/task-get.ts` 생성
- Claude Code description 텍스트 그대로 사용
- task가 없으면 `{ task: null }` 반환

**Must NOT do**:
- description 텍스트 수정 금지
- 에러 throw 금지 (null 반환)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: 단일 도구 구현
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 2, 4, 5)
- **Blocks**: Task 6, 7, 8
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `src/tools/sisyphus-tasks/task-tool.ts:119-129` - get action 패턴

**Claude Code TaskGet 스키마 (정확한 정의)**:
```typescript
// Input
{
  taskId: string  // required
}

// Output
{
  task: {
    id: string
    subject: string
    description: string
    status: TaskStatus
    blocks: string[]
    blockedBy: string[]
    owner?: string
    metadata?: object
  } | null
}
```

**Claude Code TaskGet Description (그대로 사용)**:
```
Get a task by ID from the team's task list.

Make sure to read a task's latest state using `TaskGet` before updating it.
- After fetching a task, verify its blockedBy list is empty before beginning work.
```

**Acceptance Criteria**:

- [ ] Test file created: `src/tools/claude-tasks/task-get.test.ts`
- [ ] Test covers: 존재하는 task 조회, 존재하지 않는 task → null, 모든 필드 반환
- [ ] `bun test src/tools/claude-tasks/task-get.test.ts` → PASS

**Commit**: YES
- Message: `feat(claude-tasks): add TaskGet tool with Claude Code compatible schema`
- Files: `src/tools/claude-tasks/task-get.ts`, `src/tools/claude-tasks/task-get.test.ts`
- Pre-commit: `bun test src/tools/claude-tasks/task-get.test.ts`

---

### Task 4: TaskUpdate 도구 구현

**What to do**:
- `src/tools/claude-tasks/task-update.ts` 생성
- Claude Code description 텍스트 그대로 사용
- Claim 검증 로직 구현 (5가지 실패 사유)
- 양방향 의존성 (addBlocks, addBlockedBy) 처리

**Must NOT do**:
- description 텍스트 수정 금지
- 검증 로직 단순화 금지 (5가지 모두 구현)

**Recommended Agent Profile**:
- **Category**: `business-logic`
  - Reason: Claim 검증 로직이 핵심 비즈니스 로직
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 2, 3, 5)
- **Blocks**: Task 6, 7, 8
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `src/tools/sisyphus-tasks/task-tool.ts:131-218` - update action 패턴

**Claude Code TaskUpdate 스키마 (정확한 정의)**:
```typescript
// Input
{
  taskId: string              // required
  subject?: string
  description?: string
  activeForm?: string
  status?: "pending" | "in_progress" | "completed" | "deleted"
  addBlocks?: string[]        // task IDs to add to blocks
  addBlockedBy?: string[]     // task IDs to add to blockedBy
  owner?: string
  metadata?: object
}

// Output
{
  success: boolean
  taskId: string
  updatedFields: string[]
  error?: string              // task_not_found, already_claimed, already_resolved, blocked, agent_busy
  statusChange?: {
    from: TaskStatus
    to: TaskStatus
  }
}
```

**Claim 검증 로직 (5가지 실패 사유)**:
1. `task_not_found`: task가 존재하지 않음
2. `already_claimed`: status를 in_progress로 변경하려는데 이미 다른 owner가 있음
3. `already_resolved`: status가 이미 completed 또는 deleted
4. `blocked`: blockedBy에 아직 완료되지 않은 task가 있음
5. `agent_busy`: owner를 설정하려는데 해당 agent가 이미 다른 task를 in_progress 중

**Claude Code TaskUpdate Description (그대로 사용)**:
```
Update a task in the team's task list.

- Setting status to `deleted` permanently removes the task
- After creating tasks, use TaskUpdate to set up dependencies (blocks/blockedBy) if needed
Tasks are assigned using TaskUpdate with the `owner` parameter. Any agent can set or change task ownership via TaskUpdate.
```

**Acceptance Criteria**:

- [ ] Test file created: `src/tools/claude-tasks/task-update.test.ts`
- [ ] Test covers: 각 필드 업데이트, status 변경, 5가지 실패 사유 각각
- [ ] `bun test src/tools/claude-tasks/task-update.test.ts` → PASS

**Commit**: YES
- Message: `feat(claude-tasks): add TaskUpdate tool with claim validation logic`
- Files: `src/tools/claude-tasks/task-update.ts`, `src/tools/claude-tasks/task-update.test.ts`
- Pre-commit: `bun test src/tools/claude-tasks/task-update.test.ts`

---

### Task 5: TaskList 도구 구현

**What to do**:
- `src/tools/claude-tasks/task-list.ts` 생성
- Claude Code description 텍스트 그대로 사용
- 간결한 요약 형식 반환

**Must NOT do**:
- description 텍스트 수정 금지
- 필터링 로직 추가 금지 (Claude Code 스펙 외)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: 단일 도구 구현
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 2, 3, 4)
- **Blocks**: Task 6, 7, 8
- **Blocked By**: Task 1

**References**:

**Pattern References**:
- `src/tools/sisyphus-tasks/task-tool.ts:75-117` - list action 패턴
- `src/features/sisyphus-tasks/formatters.ts:9-42` - 포맷팅 패턴

**Claude Code TaskList 스키마 (정확한 정의)**:
```typescript
// Input
{}  // 파라미터 없음

// Output
{
  tasks: Array<{
    id: string
    subject: string
    status: TaskStatus
    owner?: string
    blockedBy: string[]
  }>
}
```

**Claude Code TaskList Description (그대로 사용)**:
```
List all tasks in the team's task list.

1. Check TaskList periodically, **especially after completing each task**, to find available work or see newly unblocked tasks
- Check TaskList first to avoid creating duplicate tasks
- Use TaskList to see all tasks in summary form.
- After resolving, call TaskList to find your next task
Task completed. Call TaskList now to find your next available task or see if your work unblocked others.
```

**Acceptance Criteria**:

- [ ] Test file created: `src/tools/claude-tasks/task-list.test.ts`
- [ ] Test covers: 빈 목록, 여러 task 목록, 요약 필드만 반환
- [ ] `bun test src/tools/claude-tasks/task-list.test.ts` → PASS

**Commit**: YES
- Message: `feat(claude-tasks): add TaskList tool with Claude Code compatible schema`
- Files: `src/tools/claude-tasks/task-list.ts`, `src/tools/claude-tasks/task-list.test.ts`
- Pre-commit: `bun test src/tools/claude-tasks/task-list.test.ts`

---

### Task 6: Task Reminder Hook 구현

**What to do**:
- `src/hooks/task-reminder/index.ts` 생성
- 10턴 동안 Task 도구 미사용시 리마인더 주입
- PostToolUse 이벤트에서 카운터 관리

**Must NOT do**:
- 리마인더 텍스트 수정 금지 (Claude Code 그대로)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Hook 구현은 패턴 따르기
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 7)
- **Blocks**: Task 8
- **Blocked By**: Task 2, 3, 4, 5

**References**:

**Pattern References**:
- `src/hooks/agent-usage-reminder/index.ts` - 유사한 리마인더 Hook 패턴
- `src/hooks/index.ts:19` - Hook export 패턴

**Claude Code Task Reminder 텍스트 (그대로 사용)**:
```
The task tools haven't been used recently. If you're working on tasks that would benefit from tracking progress, consider using TaskCreate to add new tasks and TaskUpdate to update task status (set to in_progress when starting, completed when done).
```

**Hook 로직**:
- 세션별 카운터 관리 (Map<sessionID, turnCount>)
- PostToolUse에서: Task 도구 사용시 카운터 리셋, 아니면 +1
- 10턴 도달시: 리마인더 주입 후 카운터 리셋

**Acceptance Criteria**:

- [ ] Test file created: `src/hooks/task-reminder/index.test.ts`
- [ ] Test covers: 9턴까지 무반응, 10턴에 리마인더, Task 도구 사용시 리셋
- [ ] `bun test src/hooks/task-reminder/index.test.ts` → PASS

**Commit**: YES
- Message: `feat(hooks): add Task Reminder hook for 10-turn inactivity`
- Files: `src/hooks/task-reminder/index.ts`, `src/hooks/task-reminder/index.test.ts`
- Pre-commit: `bun test src/hooks/task-reminder/`

---

### Task 7: Idle Notification 구현

**What to do**:
- teammate 종료시 자동으로 idle_notification 메시지 전송
- 기존 send-message-tool 활용
- Stop 이벤트에서 트리거

**Must NOT do**:
- 새로운 메시지 시스템 구현 금지 (기존 mailbox 활용)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: 기존 시스템 연동
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 6)
- **Blocks**: Task 8
- **Blocked By**: Task 2, 3, 4, 5

**References**:

**Pattern References**:
- `src/tools/sisyphus-swarm/send-message-tool.ts:1-41` - 메시지 전송 패턴
- `src/features/sisyphus-swarm/mailbox/types.ts` - ProtocolMessage 타입

**Claude Code Idle Notification 형식 (정확한 정의)**:
```typescript
{
  type: "idle_notification",
  from: agentName,          // teammate name
  timestamp: string,        // ISO format
  completedTaskId?: string, // 완료한 task ID
  completedStatus?: string, // "completed" | "failed"
  failureReason?: string    // 실패 사유
}
```

**구현 위치**:
- `src/hooks/teammate-idle-notification/index.ts` 생성
- Stop 이벤트에서 teammate 여부 확인 후 알림 전송

**Acceptance Criteria**:

- [ ] Test file created: `src/hooks/teammate-idle-notification/index.test.ts`
- [ ] Test covers: teammate 종료시 알림 전송, leader에게만 전송, 메시지 형식 검증
- [ ] `bun test src/hooks/teammate-idle-notification/index.test.ts` → PASS

**Commit**: YES
- Message: `feat(hooks): add teammate idle notification on stop`
- Files: `src/hooks/teammate-idle-notification/index.ts`, `src/hooks/teammate-idle-notification/index.test.ts`
- Pre-commit: `bun test src/hooks/teammate-idle-notification/`

---

### Task 8: 기존 task_tool 제거 및 참조 정리

**What to do**:
- `src/tools/sisyphus-tasks/` 디렉토리 제거
- `src/features/sisyphus-tasks/` 디렉토리 제거
- 모든 import 참조 업데이트
- `src/tools/index.ts`에서 새 도구 export

**Must NOT do**:
- 부분적 제거 금지 (완전 제거)
- 기존 테스트 유지 금지

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: 파일 제거 및 참조 정리
- **Skills**: [`typescript-programmer`, `git-master`]
  - `git-master`: 안전한 파일 제거

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4 (단독)
- **Blocks**: Task 9
- **Blocked By**: Task 6, 7

**References**:

**삭제 대상 파일**:
- `src/tools/sisyphus-tasks/task-tool.ts`
- `src/tools/sisyphus-tasks/task-tool.test.ts`
- `src/tools/sisyphus-tasks/index.ts`
- `src/features/sisyphus-tasks/types.ts`
- `src/features/sisyphus-tasks/types.test.ts`
- `src/features/sisyphus-tasks/storage.ts`
- `src/features/sisyphus-tasks/storage.test.ts`
- `src/features/sisyphus-tasks/formatters.ts`
- `src/features/sisyphus-tasks/formatters.test.ts`
- `src/features/sisyphus-tasks/index.ts`
- `src/features/sisyphus-tasks/AGENTS.md`

**참조 업데이트 대상**:
- `src/tools/index.ts:73` - `taskTool` export 제거, 새 도구 export 추가
- `src/tools/sisyphus-swarm/teammate-tool.ts:3` - storage import 경로 변경

**Acceptance Criteria**:

- [ ] `bun run typecheck` → 에러 없음
- [ ] `bun test` → 모든 테스트 통과 (기존 sisyphus-tasks 테스트 제외)
- [ ] `git status` → sisyphus-tasks 관련 파일 모두 삭제됨

**Commit**: YES
- Message: `refactor(tasks): remove legacy sisyphus-tasks in favor of claude-tasks`
- Files: 삭제된 파일들, `src/tools/index.ts`
- Pre-commit: `bun run typecheck && bun test`

---

### Task 9: 통합 테스트 및 검증

**What to do**:
- 전체 워크플로우 테스트
- Claude Code와 동일한 시나리오 검증
- AGENTS.md 업데이트

**Must NOT do**:
- 단위 테스트 건너뛰기 금지

**Recommended Agent Profile**:
- **Category**: `business-logic`
  - Reason: 전체 시스템 검증
- **Skills**: [`typescript-programmer`]

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4 (최종)
- **Blocks**: None
- **Blocked By**: Task 8

**References**:

**검증 시나리오**:
1. TaskCreate → task 생성 확인
2. TaskGet → task 조회 확인
3. TaskUpdate owner → claim 검증
4. TaskUpdate status=in_progress → 작업 시작
5. TaskUpdate status=completed → 완료
6. TaskList → 목록에서 상태 확인
7. Task Reminder → 10턴 후 리마인더
8. Idle Notification → 종료시 알림

**Acceptance Criteria**:

- [ ] `bun test` → 모든 테스트 통과
- [ ] `bun run typecheck` → 에러 없음
- [ ] `bun run build` → 빌드 성공

**Manual Verification**:
- [ ] 전체 워크플로우 수동 테스트 완료

**Commit**: YES
- Message: `docs(claude-tasks): update AGENTS.md for new task system`
- Files: `src/features/claude-tasks/AGENTS.md`, `src/tools/claude-tasks/AGENTS.md`
- Pre-commit: `bun test && bun run typecheck`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(claude-tasks): add Claude Code compatible Task schema and storage` | features/claude-tasks/* | bun test |
| 2 | `feat(claude-tasks): add TaskCreate tool with Claude Code compatible schema` | tools/claude-tasks/task-create.* | bun test |
| 3 | `feat(claude-tasks): add TaskGet tool with Claude Code compatible schema` | tools/claude-tasks/task-get.* | bun test |
| 4 | `feat(claude-tasks): add TaskUpdate tool with claim validation logic` | tools/claude-tasks/task-update.* | bun test |
| 5 | `feat(claude-tasks): add TaskList tool with Claude Code compatible schema` | tools/claude-tasks/task-list.* | bun test |
| 6 | `feat(hooks): add Task Reminder hook for 10-turn inactivity` | hooks/task-reminder/* | bun test |
| 7 | `feat(hooks): add teammate idle notification on stop` | hooks/teammate-idle-notification/* | bun test |
| 8 | `refactor(tasks): remove legacy sisyphus-tasks in favor of claude-tasks` | 삭제/수정된 파일들 | bun test && typecheck |
| 9 | `docs(claude-tasks): update AGENTS.md for new task system` | AGENTS.md 파일들 | bun test |

---

## Success Criteria

### Verification Commands
```bash
bun test                    # 모든 테스트 통과
bun run typecheck          # 타입 에러 없음
bun run build              # 빌드 성공
```

### Final Checklist
- [ ] 4개 분리 도구 구현 완료 (TaskCreate, TaskGet, TaskUpdate, TaskList)
- [ ] Claude Code 스키마 100% 일치
- [ ] Claude Code description 텍스트 100% 일치
- [ ] Claim 검증 로직 5가지 모두 구현
- [ ] Task Reminder Hook 동작
- [ ] Idle Notification 동작
- [ ] 기존 task_tool 완전 제거
- [ ] 모든 테스트 통과
- [ ] 타입 에러 없음
