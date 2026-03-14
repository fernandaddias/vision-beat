import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_input: text('user_input').notNull(),
  ai_keywords: text('ai_keywords').array().notNull(),
  music_url: text('music_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
