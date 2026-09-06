/** mammoth ships no types; this covers only the subset used by
 * lib/knowledge/mutations.ts to extract raw text from an uploaded .docx buffer. */
declare module "mammoth" {
  export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }>;
}
