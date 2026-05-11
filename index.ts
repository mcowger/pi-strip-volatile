/**
 * strip-volatile - A pi extension that prevents volatile runtime data
 * from being persisted to settings.json.
 *
 * Reads the list of keys to strip from the `stripVolatileKeys` array
 * in `extensions/pi-strip-volatile.jsonc`. Falls back to built-in defaults
 * if not configured. The `stripVolatileKeys` key itself is always stripped.
 * Respects the agent dir base (PI_CODING_AGENT_DIR or ~/.pi/agent).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import tinyJsonc from "tiny-jsonc";

/** Default keys to strip when `stripVolatileKeys` is not set in config */
const DEFAULT_VOLATILE_KEYS = [
    "defaultModel",
    "defaultProvider",
    "lastChangelogVersion",
    "defaultThinkingLevel",
];

/** The config key that configures which keys to strip */
const CONFIG_KEY = "stripVolatileKeys";

/** Path to the extension's config file (relative to agent dir) */
const EXTENSION_CONFIG_PATH = "extensions/pi-strip-volatile.jsonc";

/**
 * Resolve the agent directory, matching pi's getAgentDir() behavior.
 * Respects PI_CODING_AGENT_DIR env var if set, otherwise ~/.pi/agent.
 */
function getAgentDir(): string {
    const envDir = process.env.PI_CODING_AGENT_DIR;
    if (envDir) {
        if (envDir === "~") return homedir();
        if (envDir.startsWith("~/")) return join(homedir(), envDir.slice(2));
        return envDir;
    }
    return join(homedir(), ".pi", "agent");
}

function getExtensionConfigPath(): string {
    return join(getAgentDir(), EXTENSION_CONFIG_PATH);
}

export { getAgentDir, getExtensionConfigPath };

/**
 * Ensure the extensions directory exists.
 */
function ensureExtensionsDir(): void {
    const extDir = join(getAgentDir(), "extensions");
    if (!existsSync(extDir)) {
        mkdirSync(extDir, { recursive: true });
    }
}

/**
 * Read the list of volatile keys from the extension config file.
 * Uses the `stripVolatileKeys` array if present, otherwise falls back to defaults.
 */
function readVolatileKeysFromConfig(): Set<string> {
    const configPath = getExtensionConfigPath();

    if (!existsSync(configPath)) {
        return new Set([...DEFAULT_VOLATILE_KEYS, CONFIG_KEY]);
    }

    try {
        const raw = readFileSync(configPath, "utf-8");
        const config = tinyJsonc.parse(raw);
        const configured = config[CONFIG_KEY];

        if (Array.isArray(configured) && configured.length > 0) {
            const keys = configured.filter(
                (k): k is string => typeof k === "string",
            );
            return new Set([...keys, CONFIG_KEY]);
        }
        return new Set([...DEFAULT_VOLATILE_KEYS, CONFIG_KEY]);
    } catch {
        return new Set([...DEFAULT_VOLATILE_KEYS, CONFIG_KEY]);
    }
}

/**
 * Write the config file with the given volatile keys array.
 */
function writeConfig(keys: string[]): void {
    const configPath = getExtensionConfigPath();
    ensureExtensionsDir();

    const config = {
        [CONFIG_KEY]: keys,
    };

    writeFileSync(
        configPath,
        `// Configuration for pi-strip-volatile extension\n${JSON.stringify(config, null, 2)}\n`,
        "utf-8",
    );
}

/**
 * Strip volatile keys from the global settings.json file.
 */
function stripVolatileKeys(): void {
    const settingsPath = join(getAgentDir(), "settings.json");

    if (!existsSync(settingsPath)) {
        return;
    }

    try {
        const raw = readFileSync(settingsPath, "utf-8");
        const settings = JSON.parse(raw);

        const volatileKeys = readVolatileKeysFromConfig();

        let changed = false;
        for (const key of Object.keys(settings)) {
            if (volatileKeys.has(key)) {
                delete settings[key];
                changed = true;
            }
        }

        if (changed) {
            writeFileSync(
                settingsPath,
                `${JSON.stringify(settings, null, 2)}\n`,
                "utf-8",
            );
        }
    } catch {
        // Silently ignore parse/write errors - don't disrupt pi's shutdown
    }
}

/**
 * Initialize the config file if it doesn't exist.
 */
function ensureConfigExists(): void {
    const configPath = getExtensionConfigPath();
    if (!existsSync(configPath)) {
        writeConfig(DEFAULT_VOLATILE_KEYS);
    }
}

export { readVolatileKeysFromConfig };

export default function (pi: ExtensionAPI) {
    // Initialize config file on first run
    ensureConfigExists();

    // Strip on startup to clean any keys that leaked in from a previous session
    pi.on("session_start", async () => {
        stripVolatileKeys();
    });

    // Strip when each agent loop starts and ends (idle boundaries, not per-message)
    pi.on("agent_start", async () => {
        stripVolatileKeys();
    });
    pi.on("agent_end", async () => {
        stripVolatileKeys();
    });

    // Strip on exit to ensure volatile keys never persist across sessions
    pi.on("session_shutdown", async () => {
        stripVolatileKeys();
    });
}
