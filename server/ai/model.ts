import { GoogleGenAI } from '@google/genai';

/** A photo sent to the model as inline bytes. */
interface InlineImage {
  readonly mimeType: string;
  readonly base64: string;
}

export interface TriageRequest {
  readonly system: string;
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly image?: InlineImage;
}

/** One model in the cascade. Tests inject fakes; production uses Gemini. */
export interface TriageModel {
  readonly name: string;
  generate(request: TriageRequest, signal: AbortSignal): Promise<string>;
}

/** Low temperature: triage should be consistent, not creative. */
const TEMPERATURE = 0.1;
const MAX_OUTPUT_TOKENS = 512;

/**
 * Creates one TriageModel per Gemini model name, sharing a single SDK client.
 *
 * @param apiKey - Google AI Studio API key.
 * @param models - Gemini model names, tried in order by the cascade.
 * @returns Gemini-backed triage models.
 */
export function geminiTriageModels(apiKey: string, models: readonly string[]): TriageModel[] {
  const client = new GoogleGenAI({ apiKey });
  return models.map((model) => ({
    name: model,
    async generate(request, signal) {
      const imagePart = request.image
        ? [{ inlineData: { mimeType: request.image.mimeType, data: request.image.base64 } }]
        : [];
      const response = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: request.prompt }, ...imagePart] }],
        config: {
          systemInstruction: request.system,
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
          responseJsonSchema: request.schema,
          abortSignal: signal,
        },
      });
      return response.text ?? '';
    },
  }));
}
