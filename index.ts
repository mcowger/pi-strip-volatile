import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	// Fires once when a session starts
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.notify("my-extension loaded", "info");
	});

	// Slash command: /hello [name]
	pi.registerCommand("hello", {
		description: "Say hello",
		handler: async (args, ctx) => {
			const name = args?.trim() || "world";
			ctx.ui.notify(`Hello, ${name}!`, "info");
		},
	});

	// LLM-callable tool with a TypeBox-schema parameter
	pi.registerTool({
		name: "greet",
		label: "Greet",
		description: "Greet someone by name",
		parameters: Type.Object({
			name: Type.String({ description: "Name to greet" }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			return {
				content: [{ type: "text", text: `Hello, ${params.name}!` }],
				details: {},
			};
		},
	});
}
