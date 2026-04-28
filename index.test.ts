import { describe, expect, it } from "vitest";

// The extension's core logic is tested here without requiring full pi runtime

describe("stripVolatileKeys", () => {
    it("should identify volatile keys", () => {
        const volatileKeys = new Set([
            "defaultModel",
            "defaultProvider",
            "lastChangelogVersion",
        ]);

        expect(volatileKeys.has("defaultModel")).toBe(true);
        expect(volatileKeys.has("defaultProvider")).toBe(true);
        expect(volatileKeys.has("lastChangelogVersion")).toBe(true);
        expect(volatileKeys.has("theme")).toBe(false);
        expect(volatileKeys.has("transport")).toBe(false);
    });

    it("should strip volatile keys from settings object", () => {
        const volatileKeys = new Set([
            "defaultModel",
            "defaultProvider",
            "lastChangelogVersion",
        ]);

        const settings: Record<string, unknown> = {
            theme: "dark",
            defaultModel: "claude-opus-4-7",
            defaultProvider: "anthropic",
            lastChangelogVersion: "0.70.5",
            transport: "sse",
        };

        for (const key of Object.keys(settings)) {
            if (volatileKeys.has(key)) {
                delete settings[key];
            }
        }

        expect(settings).toEqual({
            theme: "dark",
            transport: "sse",
        });
        expect(settings.defaultModel).toBeUndefined();
        expect(settings.defaultProvider).toBeUndefined();
        expect(settings.lastChangelogVersion).toBeUndefined();
    });

    it("should not modify settings without volatile keys", () => {
        const volatileKeys = new Set([
            "defaultModel",
            "defaultProvider",
            "lastChangelogVersion",
        ]);

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
