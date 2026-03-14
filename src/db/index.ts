import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Usa process.env no Node, ou import.meta.env em um client Vite se for estritamente necessário
// Note que expor um banco de dados relacional diretamente no client side não é recomendado por questões de segurança.
const connectionString = 
  (typeof process !== 'undefined' && process.env.DATABASE_URL) ||
  // @ts-ignore
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DATABASE_URL) || 
  '';

if (!connectionString) {
  console.warn('The DATABASE_URL environment variable is not set. Database connection may fail.');
}

// Inicializa o driver serverless do Neon
const sql = neon(connectionString || 'postgresql://user:password@placeholder.com/db');

// Instancia o Drizzle ORM
export const db = drizzle(sql, { schema });
