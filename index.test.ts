import { beforeEach, describe, expect, it, vi } from "vitest";

// The extension's core logic is tested here without requiring full pi runtime

const CONFIG_KEY = "stripVolatileKeys";
const EXTENSION_CONFIG_PATH = "extensions/pi-strip-volatile.jsonc";

// Mock fs module for testing
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock("node:fs", () => ({
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
}));

vi.mock("node:os", () => ({
    homedir: () => "/home/testuser",
}));

// Import after mocks are set up
import { getExtensionConfigPath, readVolatileKeysFromConfig } from "./index";

describe("getExtensionConfigPath", () => {
    it("returns path in agent dir", () => {
        const path = getExtensionConfigPath();
        expect(path).toContain(EXTENSION_CONFIG_PATH);
    });
});

describe("readVolatileKeysFromConfig", () => {
    beforeEach(() => {
        mockExistsSync.mockReset();
        mockReadFileSync.mockReset();
    });

    it("returns default keys when config file does not exist", () => {
        mockExistsSync.mockReturnValue(false);

        const keys = readVolatileKeysFromConfig();

        expect(keys.has("defaultModel")).toBe(true);
        expect(keys.has("defaultProvider")).toBe(true);
        expect(keys.has("lastChangelogVersion")).toBe(true);
        expect(keys.has("defaultThinkingLevel")).toBe(true);
        expect(keys.has(CONFIG_KEY)).toBe(true);
        expect(keys.has("theme")).toBe(false);
    });

    it("returns default keys when config file exists but key is absent", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{"otherKey": "value"}');

        const keys = readVolatileKeysFromConfig();

        expect(keys.has("defaultModel")).toBe(true);
        expect(keys.has(CONFIG_KEY)).toBe(true);
    });

    it("returns default keys when stripVolatileKeys is an empty array", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{"stripVolatileKeys": []}');

        const keys = readVolatileKeysFromConfig();

        expect(keys.has("defaultModel")).toBe(true);
        expect(keys.has(CONFIG_KEY)).toBe(true);
    });

    it("uses configured keys when provided", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
            '{"stripVolatileKeys": ["myCustomKey", "anotherKey"]}',
        );

        const keys = readVolatileKeysFromConfig();

        expect(keys.has("myCustomKey")).toBe(true);
        expect(keys.has("anotherKey")).toBe(true);
        expect(keys.has(CONFIG_KEY)).toBe(true);
        // Defaults should NOT be included when config is explicit
        expect(keys.has("defaultModel")).toBe(false);
    });

    it("ignores non-string entries in config array", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
            '{"stripVolatileKeys": ["validKey", 42, null, "alsoValid"]}',
        );

        const keys = readVolatileKeysFromConfig();

        expect(keys.has("validKey")).toBe(true);
        expect(keys.has("alsoValid")).toBe(true);
        expect(keys.has("42")).toBe(false);
    });

    it("always includes the config key itself so it gets cleaned up", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
            '{"stripVolatileKeys": ["something"]}',
        );

        const keys = readVolatileKeysFromConfig();

        expect(keys.has(CONFIG_KEY)).toBe(true);
    });

    it("handles JSONC with comments", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(`// Configuration comment
        {
            "stripVolatileKeys": ["customKey"]
        }`);

        const keys = readVolatileKeysFromConfig();

        expect(keys.has("customKey")).toBe(true);
        expect(keys.has(CONFIG_KEY)).toBe(true);
    });

    it("returns defaults on parse error", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue("not valid json{");

        const keys = readVolatileKeysFromConfig();

        expect(keys.has("defaultModel")).toBe(true);
        expect(keys.has(CONFIG_KEY)).toBe(true);
    });
});

describe("stripVolatileKeys logic", () => {
    beforeEach(() => {
        mockExistsSync.mockReset();
        mockReadFileSync.mockReset();
        mockWriteFileSync.mockReset();
    });

    it("strips default volatile keys from settings object", () => {
        mockExistsSync.mockReturnValue(false);
        const volatileKeys = readVolatileKeysFromConfig();
        const settings: Record<string, unknown> = {
            theme: "dark",
            defaultModel: "claude-opus-4-7",
            defaultProvider: "anthropic",
            lastChangelogVersion: "0.70.5",
            defaultThinkingLevel: "medium",
            transport: "sse",
        };

        let changed = false;
        for (const key of Object.keys(settings)) {
            if (volatileKeys.has(key)) {
                delete settings[key];
                changed = true;
            }
        }

        expect(changed).toBe(true);
        expect(settings).toEqual({ theme: "dark", transport: "sse" });
    });

    it("strips configured keys plus the config key itself", () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
            '{"stripVolatileKeys": ["myCustomKey"]}',
        );

        const settings: Record<string, unknown> = {
            theme: "dark",
            myCustomKey: "should-be-removed",
            stripVolatileKeys: ["myCustomKey"],
        };

        const volatileKeys = readVolatileKeysFromConfig();
        for (const key of Object.keys(settings)) {
            if (volatileKeys.has(key)) {
                delete settings[key];
            }
        }

        expect(settings).toEqual({ theme: "dark" });
        expect(settings.myCustomKey).toBeUndefined();
        expect(settings.stripVolatileKeys).toBeUndefined();
    });

    it("does not modify settings without volatile or configured keys", () => {
        mockExistsSync.mockReturnValue(false);
        const volatileKeys = readVolatileKeysFromConfig();
        const settings: Record<string, unknown> = {
            theme: "dark",
            transport: "sse",
        };

        for (const key of Object.keys(settings)) {
            if (volatileKeys.has(key)) {
                delete settings[key];
            }
        }

        expect(settings).toEqual({ theme: "dark", transport: "sse" });
    });
});
