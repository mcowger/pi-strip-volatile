/**
 * strip-volatile - A pi extension that prevents volatile runtime data
 * from being persisted to settings.json.
 *
 * Strips these top-level keys on exit:
 *   - defaultModel
 *   - defaultProvider
 *   - lastChangelogVersion
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const VOLATILE_KEYS = new Set([
    "defaultModel",
    "defaultProvider",
    "lastChangelogVersion",
]);

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

function getGlobalSettingsPath(): string {
    return join(getAgentDir(), "settings.json");
}

/**
 * Strip volatile keys from the global settings.json file.
 */
function stripVolatileKeys(): void {
    const settingsPath = getGlobalSettingsPath();

    if (!existsSync(settingsPath)) {
        return;
    }

    try {
        const raw = readFileSync(settingsPath, "utf-8");
        const settings = JSON.parse(raw);

        let changed = false;
        for (const key of Object.keys(settings)) {
            if (VOLATILE_KEYS.has(key)) {
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

export default function (pi: ExtensionAPI) {
    pi.on("session_shutdown", async (event, _ctx) => {
        if (event.reason === "quit") {
            stripVolatileKeys();
        }
    });
}
