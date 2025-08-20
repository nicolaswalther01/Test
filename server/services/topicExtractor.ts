import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractTopicFromContent(
  content: string,
  filename: string,
): Promise<{ name: string; description?: string }> {
  if (!openai.apiKey) {
    // Fallback to simple filename-based topic
    const simpleName = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    return { name: simpleName };
  }

  try {
    const prompt = `Analysiere den folgenden Text und bestimme das Hauptthema. Gib ein prägnantes, beschreibendes Thema zurück, das für IHK-Lernmaterialien geeignet ist.

WICHTIG: Antworte nur mit JSON im folgenden Format:
{
  "name": "Prägnanter Themenname (max 50 Zeichen)",
  "description": "Kurze Beschreibung des Themas (max 200 Zeichen, optional)"
}

TEXT:
${content.slice(0, 2000)}...

Beispiele für gute Themennamen:
- "Marketing Grundlagen"
- "Buchführung und Bilanzierung"
- "Personalmanagement"
- "Projektmanagement Methoden"

Dateiname als Referenz: ${filename}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Du bist ein Experte für IHK-Lernmaterialien. Bestimme präzise und kurz das Hauptthema des Textes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content_response = response.choices[0].message.content;
    if (!content_response) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content_response);
    return {
      name:
        result.name || filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      description: result.description,
    };
  } catch (error) {
    console.warn("Topic extraction failed, using filename:", error);
    const simpleName = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    return { name: simpleName };
  }
}
