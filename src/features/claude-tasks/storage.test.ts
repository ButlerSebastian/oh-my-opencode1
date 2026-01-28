import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs"
import { join } from "path"
import { z } from "zod"
import { getTaskDir, readJsonSafe, writeJsonAtomic, acquireLock } from "./storage"
import type { OhMyOpenCodeConfig } from "../../config/schema"

const TEST_TEAM = "test-team"
const TEST_DIR = join(process.cwd(), ".test-claude-tasks")

describe("getTaskDir", () => {
  test("returns correct path for default config", () => {
    //#given
    const config: Partial<OhMyOpenCodeConfig> = {}

    //#when
    const result = getTaskDir(TEST_TEAM, config)

    //#then
    expect(result).toBe(join(process.cwd(), ".sisyphus/tasks", TEST_TEAM))
  })

  test("returns correct path with custom storage_path", () => {
    //#given
    const config: Partial<OhMyOpenCodeConfig> = {
      sisyphus: {
        tasks: {
          storage_path: ".custom/tasks",
        },
      },
    }

    //#when
    const result = getTaskDir(TEST_TEAM, config)

    //#then
    expect(result).toBe(join(process.cwd(), ".custom/tasks", TEST_TEAM))
  })
})

describe("readJsonSafe", () => {
  const testSchema = z.object({
    id: z.string(),
    value: z.number(),
  })

  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  test("returns null for non-existent file", () => {
    //#given
    const filePath = join(TEST_DIR, "nonexistent.json")

    //#when
    const result = readJsonSafe(filePath, testSchema)

    //#then
    expect(result).toBeNull()
  })

  test("returns parsed data for valid file", () => {
    //#given
    const filePath = join(TEST_DIR, "valid.json")
    const data = { id: "test", value: 42 }
    writeFileSync(filePath, JSON.stringify(data), "utf-8")

    //#when
    const result = readJsonSafe(filePath, testSchema)

    //#then
    expect(result).toEqual(data)
  })

  test("returns null for invalid JSON", () => {
    //#given
    const filePath = join(TEST_DIR, "invalid.json")
    writeFileSync(filePath, "{ invalid json", "utf-8")

    //#when
    const result = readJsonSafe(filePath, testSchema)

    //#then
    expect(result).toBeNull()
  })

  test("returns null for data that fails schema validation", () => {
    //#given
    const filePath = join(TEST_DIR, "invalid-schema.json")
    const data = { id: "test", value: "not-a-number" }
    writeFileSync(filePath, JSON.stringify(data), "utf-8")

    //#when
    const result = readJsonSafe(filePath, testSchema)

    //#then
    expect(result).toBeNull()
  })
})

describe("writeJsonAtomic", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  test("creates directory if it does not exist", () => {
    //#given
    const filePath = join(TEST_DIR, "nested", "dir", "file.json")
    const data = { test: "data" }

    //#when
    writeJsonAtomic(filePath, data)

    //#then
    expect(existsSync(filePath)).toBe(true)
  })

  test("writes data atomically", async () => {
    //#given
    const filePath = join(TEST_DIR, "atomic.json")
    const data = { id: "test", value: 123 }

    //#when
    writeJsonAtomic(filePath, data)

    //#then
    expect(existsSync(filePath)).toBe(true)
    const content = await Bun.file(filePath).text()
    expect(JSON.parse(content)).toEqual(data)
  })

  test("overwrites existing file", async () => {
    //#given
    const filePath = join(TEST_DIR, "overwrite.json")
    mkdirSync(TEST_DIR, { recursive: true })
    writeFileSync(filePath, JSON.stringify({ old: "data" }), "utf-8")

    //#when
    const newData = { new: "data" }
    writeJsonAtomic(filePath, newData)

    //#then
    const content = await Bun.file(filePath).text()
    expect(JSON.parse(content)).toEqual(newData)
  })
})

describe("acquireLock", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  test("acquires lock when no lock exists", () => {
    //#given
    const dirPath = TEST_DIR

    //#when
    const lock = acquireLock(dirPath)

    //#then
    expect(lock.acquired).toBe(true)
    expect(existsSync(join(dirPath, ".lock"))).toBe(true)

    //#cleanup
    lock.release()
  })

  test("fails to acquire lock when fresh lock exists", () => {
    //#given
    const dirPath = TEST_DIR
    const firstLock = acquireLock(dirPath)

    //#when
    const secondLock = acquireLock(dirPath)

    //#then
    expect(secondLock.acquired).toBe(false)

    //#cleanup
    firstLock.release()
  })

  test("acquires lock when stale lock exists (>30s)", () => {
    //#given
    const dirPath = TEST_DIR
    const lockPath = join(dirPath, ".lock")
    const staleTimestamp = Date.now() - 31000 // 31 seconds ago
    writeFileSync(lockPath, JSON.stringify({ timestamp: staleTimestamp }), "utf-8")

    //#when
    const lock = acquireLock(dirPath)

    //#then
    expect(lock.acquired).toBe(true)

    //#cleanup
    lock.release()
  })

  test("release removes lock file", () => {
    //#given
    const dirPath = TEST_DIR
    const lock = acquireLock(dirPath)
    const lockPath = join(dirPath, ".lock")

    //#when
    lock.release()

    //#then
    expect(existsSync(lockPath)).toBe(false)
  })

  test("release is safe to call multiple times", () => {
    //#given
    const dirPath = TEST_DIR
    const lock = acquireLock(dirPath)

    //#when
    lock.release()
    lock.release()

    //#then
    expect(existsSync(join(dirPath, ".lock"))).toBe(false)
  })
})
