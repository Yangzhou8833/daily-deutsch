// Supabase Edge Function: textbook photos / pasted text → vocabulary cards, via Claude.
//
// POST JSON { images?: {media_type, data}[], text?, level?, title?, instructions?, known?: string[] }
// Only signed-in editors may call it (profiles.is_editor). The response is a stream of
// newline-delimited JSON events so the connection stays alive while Claude works:
//   {"t":"ping"}  {"t":"delta","text":"..."}  {"t":"done","stop_reason":..., "usage":...}  {"t":"error","message":...}
// The concatenated "delta" texts form one JSON document matching OUTPUT_SCHEMA.
//
// Secrets (Dashboard → Edge Functions → Secrets): ANTHROPIC_API_KEY.
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.

import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const MODEL = "claude-opus-5-5";
// Extraction + translation needs little deliberation; low effort keeps each call well inside
// the Edge Function time limit. Raise to "medium" if card quality ever falls short.
const EFFORT = "low";
const MAX_IMAGES = 5;
const MAX_IMAGE_BASE64 = 5_000_000;
const MAX_TEXT = 20_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const translated = {
  type: "object",
  properties: { zh: { type: "string" }, en: { type: "string" }, tr: { type: "string" } },
  required: ["zh", "en", "tr"],
  additionalProperties: false,
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title_suggestion: { type: "string" },
    note: { type: "string" },
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          article: { type: "string", enum: ["der", "die", "das", ""] },
          plural: { type: "string" },
          info: { type: "string" },
          level: { type: "string", enum: ["A1", "A2", "B1", "B2", ""] },
          meaning: translated,
          example: { type: "string" },
          example_tr: translated,
          cloze: { type: "string" },
          answer: { type: "string" },
        },
        required: ["word", "article", "plural", "info", "level", "meaning", "example", "example_tr", "cloze", "answer"],
        additionalProperties: false,
      },
    },
    grammar: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, hint: translated },
        required: ["text", "hint"],
        additionalProperties: false,
      },
    },
  },
  required: ["title_suggestion", "note", "words", "grammar"],
  additionalProperties: false,
};

const SYSTEM = `You turn German course material (textbook photos or pasted text) into vocabulary cards for an adult German class in Germany. Learners come from many countries; every explanation is given in simplified Chinese (zh), English (en) and Turkish (tr).

What to extract
- The words and expressions a learner at the stated level should learn from this material: content words, useful fixed phrases, and verbs with their typical preposition. Skip proper names, numbers, and words that are trivial at this level. If a list of already-learned words is given, skip those unless the material uses them with a new meaning.
- Keep the order in which the words appear in the material.
- Grammar cards: up to 10 short practice sentences for grammar points that the material actually focuses on (tables, rule boxes, exercises). Return an empty list when there is no clear grammar focus.

Field rules
- word: dictionary form without article. Nouns in the singular (plural-only nouns as they are), verbs in the infinitive, reflexive verbs with "sich".
- article: der / die / das for nouns, "" for everything else.
- plural: nouns only, written with the article, e.g. "die Häuser". "" if the noun has no plural, and for non-nouns.
- info: "" for nouns. Otherwise a short grammar note in German grammar terms only, for example "trennbar · fuhr ab · ist abgefahren" (mark trennbar, give Präteritum and Perfekt, add "du fährst" when the stem changes), "größer – am größten" or "keine Steigerung" for adjectives, "+ Dativ" for case government, or the word class such as "Adverb" or "Konjunktion".
- level: CEFR level of the word (A1–B2), "" if unsure.
- meaning: short, natural glosses in each language, 1–3 equivalents; separate different senses with ";".
- example: one natural sentence at the learner's level, at most about 12 words, taken from the material when it has a good one. example_tr: faithful translations.
- cloze: the example with exactly one "___" replacing the word as it appears in that sentence; answer: exactly the replaced text, inflected as in the sentence. Choose an example in which the word appears as one contiguous form (for separable verbs use the Perfekt, the infinitive after a modal verb, or a subordinate clause).
- grammar text: Anki cloze syntax, e.g. "Ich {{c1::hätte}} gern mehr Zeit." (c1, c2 … for several gaps). hint: the rule in one short line per language.
- title_suggestion: a short lesson title in German, e.g. "Lektion 5 · Wohnen".
- note: "" normally; if the input is unreadable or contains no German learning material, say so here (in English) and return empty lists.`;

interface Input {
  images?: { media_type: "image/jpeg" | "image/png" | "image/webp"; data: string }[];
  text?: string;
  level?: string;
  title?: string;
  instructions?: string;
  known?: string[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function buildContent(input: Input): Anthropic.Beta.BetaContentBlockParam[] {
  const content: Anthropic.Beta.BetaContentBlockParam[] = (input.images ?? []).map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.media_type, data: img.data },
  }));
  const parts = [
    `Learner level: ${input.level || "A2"}`,
    input.title ? `Lesson: ${input.title}` : "",
    input.instructions ? `Instructions from the teacher: ${input.instructions}` : "",
    input.known?.length ? `Already learned (skip these): ${input.known.join(", ")}` : "",
    input.text ? `Material:\n${input.text}` : "The material is in the image(s) above.",
  ];
  content.push({ type: "text", text: parts.filter(Boolean).join("\n\n") });
  return content;
}

function validate(input: Input): string | null {
  const images = input.images ?? [];
  if (!images.length && !input.text?.trim()) return "Send at least one image or some text.";
  if (images.length > MAX_IMAGES) return `At most ${MAX_IMAGES} images per request.`;
  if (images.some((i) => !["image/jpeg", "image/png", "image/webp"].includes(i.media_type) || i.data.length > MAX_IMAGE_BASE64))
    return "Images must be JPEG/PNG/WebP and smaller than about 3.5 MB.";
  if ((input.text?.length ?? 0) > MAX_TEXT) return `Text is limited to ${MAX_TEXT} characters.`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Only signed-in editors: checked with the caller's own token, so RLS applies.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: "Please sign in." }, 401);
  const { data: isEditor } = await supabase.rpc("is_editor");
  if (!isEditor) return json({ error: "Only editors can generate lessons." }, 403);

  let input: Input;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const problem = validate(input);
  if (problem) return json({ error: problem }, 400);

  const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      // Thinking produces no visible deltas; keep proxies from closing an idle connection.
      const ping = setInterval(() => send({ t: "ping" }), 10_000);
      try {
        const stream = anthropic.beta.messages.stream({
          model: MODEL,
          max_tokens: 64000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: EFFORT, format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: buildContent(input) }],
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ t: "delta", text: event.delta.text });
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ t: "error", message: "Claude declined this request." });
        } else if (final.stop_reason === "max_tokens") {
          send({ t: "error", message: "The output was cut off. Try fewer pages per request." });
        } else {
          send({ t: "done", stop_reason: final.stop_reason, usage: final.usage });
        }
      } catch (e) {
        let message = "Generation failed.";
        if (e instanceof Anthropic.AuthenticationError) message = "The Anthropic API key is missing or invalid.";
        else if (e instanceof Anthropic.RateLimitError) message = "Rate limited by the Anthropic API — try again in a minute.";
        else if (e instanceof Anthropic.APIError) message = `Anthropic API error ${e.status}: ${e.message}`;
        else if (e instanceof Error) message = e.message;
        send({ t: "error", message });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { ...CORS, "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" } });
});
