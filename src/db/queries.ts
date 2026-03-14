import { db } from './index';
import { generations } from './schema';

export type InsertGenerationParams = {
  user_input: string;
  ai_keywords: string[];
  music_url?: string | null;
};

/**
 * Insere uma nova geração no banco de dados.
 */
export async function createGeneration(data: InsertGenerationParams) {
  const [newGeneration] = await db
    .insert(generations)
    .values({
      user_input: data.user_input,
      ai_keywords: data.ai_keywords,
      music_url: data.music_url || null,
    })
    .returning();

  return newGeneration;
}
