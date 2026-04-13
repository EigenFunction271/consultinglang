import { run } from "../dist/runtime.js";

const maxSourceBytes = 12000;

export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    response.status(405).json({ ok: false, error: "Please socialise this deck with POST." });
    return;
  }

  const source = request.body?.source;
  if (typeof source !== "string") {
    response.status(400).json({ ok: false, error: "No deck was socialised." });
    return;
  }

  if (Buffer.byteLength(source, "utf8") > maxSourceBytes) {
    response.status(413).json({ ok: false, error: "This deck exceeds the room capacity." });
    return;
  }

  try {
    const result = run(source);
    response.status(200).json({ ok: true, output: result.output, js: result.js });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
