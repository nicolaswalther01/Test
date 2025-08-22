export async function extractTopicFromContent(
  content: string,
  filename: string,
): Promise<{ name: string; description?: string }> {
  // API-Calls sind deaktiviert.
  // Es wird immer "N/A" zurückgegeben.
  return {
    name: "N/A",
    description: "N/A",
  };
}
