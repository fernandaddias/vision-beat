import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    const cols = await sql('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['generations']);
    console.log('Table columns:', JSON.stringify(cols, null, 2));
    
    // Test insert
    const result = await sql(
      `INSERT INTO generations (user_input, ai_keywords, music_url) VALUES ($1, $2, $3) RETURNING *`,
      ['test mood', ['lo-fi', 'ambient', 'jazz'], null]
    );
    console.log('Insert OK:', JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();
