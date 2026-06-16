const SYSTEM_PROMPT = `You are MedExplain, an AI medical assistant. Read the OCR-extracted medical report text and explain it to a layperson. Clearly state what test was done, why it was likely done, what the results indicate (what is normal and abnormal), and what actionable steps they can take. Crucially, based on the report, identify and explicitly list any potential medical conditions that can be determined from the findings. Avoid jargon; when a medical term must be used, explain it. Never fabricate values that aren't in the report. Always include a disclaimer that this is informational and not medical advice.`;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    simplified_summary: { type: "string", description: "Plain-English overview, 2-4 sentences." },
    key_findings: { type: "array", items: { type: "string" } },
    abnormal_values: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          value: { type: "string" },
          reference_range: { type: "string" },
          severity: { type: "string", enum: ["low", "high", "critical", "borderline"] },
          explanation: { type: "string" },
        },
        required: ["name", "value", "severity", "explanation"],
      },
    },
    test_explanation: {
      type: "object",
      additionalProperties: false,
      properties: {
        tests_performed: { type: "string", description: "What test was done" },
        reason_for_test: { type: "string", description: "Why it was likely done" },
        overall_indication: {
          type: "string",
          description: "What the results indicate (is everything normal or what is abnormal)",
        },
        actionable_advice: {
          type: "string",
          description:
            "What the user can do to address abnormalities or general health advice based on the report",
        },
      },
      required: ["tests_performed", "reason_for_test", "overall_indication", "actionable_advice"],
    },
    medical_conditions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          condition: { type: "string", description: "Name of the medical condition" },
          explanation: {
            type: "string",
            description: "Why this condition is indicated by the report",
          },
          likelihood: { type: "string", enum: ["confirmed", "likely", "possible", "ruled out"] },
        },
        required: ["condition", "explanation", "likelihood"],
      },
    },
    term_explanations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { term: { type: "string" }, meaning: { type: "string" } },
        required: ["term", "meaning"],
      },
    },
    suggested_followup: { type: "array", items: { type: "string" } },
    emergency_alert: {
      type: "object",
      additionalProperties: false,
      properties: {
        present: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["present"],
    },
    disclaimer: { type: "string" },
  },
  required: [
    "simplified_summary",
    "test_explanation",
    "key_findings",
    "abnormal_values",
    "medical_conditions",
    "term_explanations",
    "suggested_followup",
    "emergency_alert",
    "disclaimer",
  ],
};

export async function summarizeReport(text: string) {
  if (!text || typeof text !== "string" || text.trim().length < 20) {
    throw new Error("Text too short to summarize.");
  }

  const trimmed = text.length > 30000 ? text.slice(0, 30000) : text;
  const url = "/api/nvidia/v1/chat/completions";
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  const model = "meta/llama-3.1-70b-instruct";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this medical report:\n\n${trimmed}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_medical_summary",
            description: "Return the structured patient-friendly summary.",
            parameters: schema,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_medical_summary" } },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("AI gateway error", res.status, errText);
    throw new Error(`AI service error: ${res.status}`);
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("No structured output returned.");
  }
  return JSON.parse(toolCall.function.arguments);
}

export async function chatWithReport(
  reportText: string,
  messages: { role: "user" | "assistant" | "system"; content: string }[],
) {
  if (!reportText || typeof reportText !== "string") {
    throw new Error("Report text missing.");
  }

  const trimmed = reportText.length > 30000 ? reportText.slice(0, 30000) : reportText;
  const url = "/api/nvidia/v1/chat/completions";
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  const model = "meta/llama-3.1-70b-instruct";

  const systemPrompt = `You are MedExplain, an AI medical assistant. Answer the user's questions about the following medical report. Be concise, clear, and helpful. Always remind the user that you are an AI and your advice should not replace professional medical consultation if appropriate.\n\nMedical Report Context:\n${trimmed}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("AI gateway error", res.status, errText);
    throw new Error(`AI service error: ${res.status}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message?.content;
  if (!message) {
    throw new Error("No response from AI.");
  }
  return message;
}
