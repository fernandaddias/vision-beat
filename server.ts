import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createGeneration } from './src/db/queries';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
console.log(`Gemini API Key loaded: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING!'}`);
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Local fallback mood interpreter when Gemini is unavailable
 */
function localMoodInterpreter(prompt: string) {
  const lower = prompt.toLowerCase();

  // Each entry: [keywords to match, result]
  const moodEntries: [string[], { search_query: string; target_energy: number; suggested_genres: string[] }][] = [
    [['chuv', 'rain'],            { search_query: 'rainy day lofi chill', target_energy: 0.3, suggested_genres: ['lo-fi', 'ambient', 'jazz'] }],
    [['trist', 'melan', 'sad'],   { search_query: 'sad melancholic piano', target_energy: 0.2, suggested_genres: ['indie', 'classical', 'ambient'] }],
    [['feliz', 'alegr', 'happy'], { search_query: 'happy upbeat feel good', target_energy: 0.8, suggested_genres: ['pop', 'dance', 'funk'] }],
    [['fest', 'party', 'balad'],  { search_query: 'party dance electronic', target_energy: 0.9, suggested_genres: ['electronic', 'dance', 'pop'] }],
    [['calm', 'tranquil', 'paz'], { search_query: 'calm peaceful relaxing', target_energy: 0.2, suggested_genres: ['ambient', 'classical', 'new age'] }],
    [['energi', 'anim', 'pump'],  { search_query: 'energetic workout motivation', target_energy: 0.95, suggested_genres: ['electronic', 'hip-hop', 'rock'] }],
    [['nostalg', 'lembran'],      { search_query: 'nostalgic retro throwback', target_energy: 0.5, suggested_genres: ['classic rock', 'soul', 'r&b'] }],
    [['roman', 'amor', 'love'],   { search_query: 'romantic love songs', target_energy: 0.4, suggested_genres: ['r&b', 'soul', 'pop'] }],
    [['noit', 'night'],           { search_query: 'late night vibes chill', target_energy: 0.4, suggested_genres: ['r&b', 'lo-fi', 'jazz'] }],
    [['ver', 'summer'],           { search_query: 'summer vibes tropical', target_energy: 0.7, suggested_genres: ['reggaeton', 'pop', 'tropical house'] }],
    [['biblio', 'estud', 'study'],{ search_query: 'study focus concentration instrumental', target_energy: 0.3, suggested_genres: ['classical', 'lo-fi', 'ambient'] }],
    [['vibrant'],                 { search_query: 'vibrant colorful upbeat', target_energy: 0.8, suggested_genres: ['pop', 'funk', 'latin'] }],
    [['sonh', 'dream'],           { search_query: 'dreamy ethereal floating', target_energy: 0.3, suggested_genres: ['dream pop', 'shoegaze', 'ambient'] }],
    [['prai', 'beach'],           { search_query: 'beach sunset chill summer', target_energy: 0.5, suggested_genres: ['reggae', 'bossa nova', 'surf rock'] }],
    [['rock', 'guitar'],          { search_query: 'rock guitar powerful', target_energy: 0.8, suggested_genres: ['rock', 'alternative', 'indie rock'] }],
  ];

  for (const [keywords, result] of moodEntries) {
    if (keywords.some(kw => lower.includes(kw))) {
      return result;
    }
  }

  // Default fallback: use the prompt itself as search query
  return {
    search_query: prompt,
    target_energy: 0.5,
    suggested_genres: ['pop', 'indie', 'electronic'],
  };
}

/**
 * Route: POST /api/interpret-mood
 * Interprets a user's prompt into a musical mood query and saves the history.
 */
app.post('/api/interpret-mood', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('--- New Mood Request ---');
    console.log('Prompt:', prompt);

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A valid text prompt is required.' });
    }

    let result: { search_query: string; target_energy: number; suggested_genres: string[] };

    // Try Gemini first, fall back to local interpreter
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error('No API key');

      console.log('Calling Gemini...');
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: 'You are an expert music curator. Return exactly a strict JSON object with: "search_query" (a concise string optimized to search for tracks on Spotify), "target_energy" (a float from 0.0 to 1.0 representing the musical intensity), and "suggested_genres" (an array of exactly 3 highly relevant musical genres). Output ONLY the JSON string without code blocks or extra text.',
      });

      const resultResponse = await model.generateContent(`Mood/Scenario: ${prompt}`);
      const aiResponseText = resultResponse.response.text();
      console.log('Gemini Response:', aiResponseText);

      const cleanJsonText = aiResponseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      result = JSON.parse(cleanJsonText);
    } catch (aiError: any) {
      console.warn('Gemini unavailable, using local fallback:', aiError.message?.substring(0, 80));
      result = localMoodInterpreter(prompt);
      console.log('Local fallback result:', result);
    }

    // Save generation to the Neon Postgres database
    try {
      await createGeneration({
        user_input: prompt,
        ai_keywords: [...result.suggested_genres, result.search_query],
        music_url: null,
      });
      console.log('Database save successful');
    } catch (dbError: any) {
      console.error('Database Insertion Error (non-fatal):', dbError.message);
      // Continue even if DB fails — don't block the user
    }

    // Return the JSON to the client
    res.json(result);
  } catch (error: any) {
    console.error('API Error (/api/interpret-mood):', error.message || error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
// We'll initialize it when the server starts or lazily
let isYTMusicInitialized = false;

async function ensureYTMusic() {
  if (!isYTMusicInitialized) {
    await ytmusic.initialize();
    isYTMusicInitialized = true;
  }
}

/**
 * Route: POST /api/fetch-music
 * Fetches tracks from YouTube Music using a search query.
 */
app.post('/api/fetch-music', async (req, res) => {
  try {
    const { search_query, suggested_genres, target_energy } = req.body;

    if (!search_query) {
      return res.status(400).json({ error: 'search_query is required.' });
    }

    await ensureYTMusic();

    // Search for songs on YouTube Music
    const results = await ytmusic.searchSongs(search_query);
    console.log(`YouTube Music returned ${results.length} results`);

    // Filter and limit to 10 tracks
    // ytmusic-api SongDetailed has: artist (singular object with .name), not artists (array)
    const formattedTracks = results.slice(0, 10).map((track: any) => ({
      id: track.videoId,
      title: track.name,
      artist: track.artist?.name || 'Unknown Artist',
      album_art: track.thumbnails?.[track.thumbnails.length - 1]?.url || null,
      preview_url: null,
      music_url: `https://music.youtube.com/watch?v=${track.videoId}`,
    }));

    res.json(formattedTracks);
  } catch (error) {
    console.error('API Error (/api/fetch-music):', error);
    res.status(500).json({ error: 'Internal Server Error fetching YouTube Music tracks.' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Backend API server running on http://localhost:${port}`);
});
