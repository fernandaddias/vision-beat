import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createGeneration } from './src/db/queries';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
console.log(`Gemini API Key loaded: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING!'}`);
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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

type MoodResult = {
  search_query: string;
  target_energy: number;
  suggested_genres: string[];
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const IMAGE_SEARCH_PROMPT = 'Analise esta imagem e me retorne apenas uma string de busca perfeita (ex: relaxing rainy acoustic guitar) para eu pesquisar no YouTube Music e encontrar musicas que combinem com a vibe desta foto.';
const TEXT_SEARCH_PROMPT = 'Receba o mood/descricao do usuario e retorne apenas uma string de busca curta e eficaz para YouTube Music, sem explicacoes e sem pontuacao extra.';

function normalizeSearchQuery(text: string): string {
  return text
    .replace(/```/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^"|"$/g, '')
    .trim();
}

function normalizeImagePayload(imageData: any): { base64: string; mimeType: string } | null {
  const stripDataUri = (value: string): { base64: string; mimeType: string | null } => {
    const trimmed = value.trim();
    const match = trimmed.match(/^data:(.+?);base64,(.+)$/i);

    if (match) {
      return { base64: match[2], mimeType: match[1] };
    }

    return { base64: trimmed, mimeType: null };
  };

  if (!imageData) return null;

  if (typeof imageData === 'string') {
    const parsed = stripDataUri(imageData);
    return { base64: parsed.base64, mimeType: parsed.mimeType || 'image/jpeg' };
  }

  if (imageData?.base64 && imageData?.mimeType) {
    const parsed = stripDataUri(imageData.base64);
    return { base64: parsed.base64, mimeType: parsed.mimeType || imageData.mimeType };
  }

  if (imageData?.buffer && Array.isArray(imageData.buffer)) {
    return {
      base64: Buffer.from(imageData.buffer).toString('base64'),
      mimeType: imageData?.mimeType || 'image/jpeg',
    };
  }

  return null;
}

async function interpretImageMood(image: { base64: string; mimeType: string }, promptText: string): Promise<MoodResult> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY ausente');
  }

  const model = genAI.getGenerativeModel({
    // In @google/generative-ai, the SDK expects the model id directly (without "models/").
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.3,
    },
  });

  const imagePrompt = promptText
    ? `${IMAGE_SEARCH_PROMPT} Contexto adicional do usuario: ${promptText}`
    : IMAGE_SEARCH_PROMPT;

  const response = await model.generateContent([
    { text: imagePrompt },
    {
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    },
  ]);

  const rawText = response.response.text() || '';
  const searchQuery = normalizeSearchQuery(rawText);

  if (!searchQuery) {
    throw new Error('Gemini returned an empty search query for image mood interpretation.');
  }

  return {
    search_query: searchQuery,
    target_energy: 0.5,
    suggested_genres: ['image-vibe'],
  };
}

async function interpretTextMood(promptText: string): Promise<MoodResult> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY ausente');
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.3,
    },
  });

  const response = await model.generateContent([
    { text: TEXT_SEARCH_PROMPT },
    { text: `Mood do usuario: ${promptText}` },
  ]);

  const rawText = response.response.text() || '';
  const searchQuery = normalizeSearchQuery(rawText);

  if (!searchQuery) {
    throw new Error('Gemini returned an empty search query for text mood interpretation.');
  }

  return {
    search_query: searchQuery,
    target_energy: 0.5,
    suggested_genres: ['text-vibe'],
  };
}

/**
 * Route: POST /api/interpret-mood
 * Interprets a user's prompt into a musical mood query and saves the history.
 */
app.post('/api/interpret-mood', async (req, res) => {
  try {
    const { prompt, imageData } = req.body;
    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    const normalizedImage = normalizeImagePayload(imageData);
    console.log('--- New Mood Request ---');
    console.log('Prompt:', promptText);
    console.log('Has image:', !!normalizedImage);

    // Require either a text prompt or an image
    if (!promptText && !normalizedImage) {
      return res.status(400).json({ error: 'A text prompt or an image is required.' });
    }

    let result: MoodResult;

    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini indisponivel: GEMINI_API_KEY ausente. Usando fallback local.');
      result = localMoodInterpreter(promptText || 'image vibe instrumental chill');
    } else {
      console.log(`Calling Gemini model: ${GEMINI_MODEL}`);

      try {
        result = normalizedImage
          ? await interpretImageMood(normalizedImage, promptText)
          : await interpretTextMood(promptText);
      } catch (aiError: any) {
        const message = aiError?.message || 'Falha desconhecida ao chamar Gemini';
        console.error('Gemini Error:', message);

        if (message.includes('400') || message.toLowerCase().includes('unable to process input image')) {
          return res.status(400).json({
            error: 'Imagem invalida para analise da IA',
            details: message,
          });
        }

        if (message.includes('429') || message.toLowerCase().includes('too many requests') || message.toLowerCase().includes('quota')) {
          return res.status(429).json({
            error: 'Ops! Muitos curadores musicais acessando agora. Aguarde 1 minuto e tente novamente.',
            details: message,
          });
        }

        const messageLower = message.toLowerCase();
        const isForbidden = message.includes('403') || messageLower.includes('forbidden');
        const isLeakedKey = messageLower.includes('api key was reported as leaked');
        const isAuthIssue = messageLower.includes('api key') || messageLower.includes('permission denied');

        if (isForbidden || isLeakedKey || isAuthIssue) {
          console.warn('Gemini com problema de autenticacao/chave. Usando fallback local.');
          result = localMoodInterpreter(promptText || 'image vibe instrumental chill');
        } else {
          return res.status(500).json({
            error: 'Erro na comunicacao com a IA',
            details: message,
          });
        }
      }
    }

    console.log('Gemini Result:', result);

    // Save generation to the Neon Postgres database
    try {
      await createGeneration({
        user_input: promptText || '[image-only request]',
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

// Friendly error for oversized request bodies
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Imagem muito grande para envio. Tente uma imagem menor.',
      details: 'Payload Too Large',
    });
  }

  next(err);
});

// Start the Express server
app.listen(port, () => {
  console.log(`Backend API server running on http://localhost:${port}`);
});
