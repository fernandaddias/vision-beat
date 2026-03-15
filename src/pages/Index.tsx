import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2 } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import MoodInput, { ImageData } from "@/components/MoodInput";
import PlaylistCard from "@/components/PlaylistCard";
import { toast } from "sonner";

type Mood = "warm" | "cool" | "dream" | "neutral";

type Track = {
  id: string;
  title: string;
  artist: string;
  album_art?: string;
  preview_url?: string;
  music_url?: string;
};

const Index = () => {
  const [mood, setMood] = useState<Mood>("neutral");
  const [isLoading, setIsLoading] = useState(false);
  const [submittedMood, setSubmittedMood] = useState<string | null>(null);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);

  const handleSubmit = async (text: string, imageData?: ImageData) => {
    setIsLoading(true);
    setSubmittedMood(text || "Análise de imagem");
    setShowPlaylist(false);

    // Basic frontend decoration for the background
    const lower = text.toLowerCase();
    if (imageData && !text) {
      setMood("dream");
    } else if (text.toLowerCase().includes("energia") || text.toLowerCase().includes("vibrante") || text.toLowerCase().includes("festa")) {
      setMood("warm");
    } else if (text.toLowerCase().includes("chuva") || text.toLowerCase().includes("calmo") || text.toLowerCase().includes("biblioteca")) {
      setMood("cool");
    } else if (text.toLowerCase().includes("nostalgia") || text.toLowerCase().includes("sonho") || text.toLowerCase().includes("verão")) {
      setMood("dream");
    } else {
      setMood("warm");
    }

    try {
      // 1. Interpret Mood -> AI
      const aiResponse = await fetch('/api/interpret-mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: text, imageData })
      });

      if (!aiResponse.ok) {
        let details = `Falha ao interpretar seu mood. (HTTP ${aiResponse.status})`;
        try {
          const errorPayload = await aiResponse.json();
          details = errorPayload?.error || errorPayload?.details || details;
        } catch {
          try {
            const textPayload = await aiResponse.text();
            if (textPayload) details = textPayload;
          } catch {
            // Keep default message when no body is returned
          }
        }
        const aiError = new Error(details) as Error & { status?: number; source?: string };
        aiError.status = aiResponse.status;
        aiError.source = 'ai';
        throw aiError;
      }
      
      const aiData = await aiResponse.json();

      // 2. Fetch from Music Service (YouTube Music) using AI output
      const musicResponse = await fetch('/api/fetch-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiData)
      });

      if (!musicResponse.ok) throw new Error("Falha ao buscar músicas.");

      const tracksData: Track[] = await musicResponse.json();
      
      if (!tracksData || tracksData.length === 0) {
        toast.error("Nenhuma música encontrada", { description: "Tente um mood diferente!" });
        return;
      }

      setTracks(tracksData);
      setShowPlaylist(true);

    } catch (error: any) {
      console.error(error);

      if (error?.source === 'ai') {
        if (error?.status === 429) {
          toast.error("Ops! Muitos curadores musicais acessando agora.", {
            description: "Aguarde 1 minuto e tente novamente.",
          });
          return;
        }

        toast.error("Erro na comunicação com a IA", {
          description: "Tente novamente em instantes.",
        });
        return;
      }

      toast.error("Ops! Algo deu errado", {
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <GradientBackground mood={mood} />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#2A1808] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#FF980F]"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M6.5 15a5.5 5.5 0 0 1 11 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M9.8 10.9L12 12.9L14.2 10.9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 15l2.3-2.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="15" r="1" fill="currentColor" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            VisionBeat
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
            Como funciona
          </button>
          <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
            Conectar YouTube Music
          </button>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-12">
        <AnimatePresence mode="wait">
          {!showPlaylist ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-center gap-2 text-primary/80"
              >
                <Music2 className="h-5 w-5" />
                <span className="text-sm font-body font-medium tracking-wide uppercase">
                  Transforme emoções em música
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-[1.1]"
              >
                Qual é o seu{" "}
                <span className="text-gradient">mood</span>
                <br />
                agora?
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-muted-foreground text-lg max-w-md mx-auto font-body"
              >
                Descreva um cenário, emoção ou atmosfera e receba uma playlist personalizada.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="result-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <button
                onClick={() => {
                  setShowPlaylist(false);
                  setSubmittedMood(null);
                  setMood("neutral");
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors font-body"
              >
                ← Novo mood
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!showPlaylist && <MoodInput onSubmit={handleSubmit} isLoading={isLoading} />}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-8 rounded-full bg-primary/60"
                  animate={{ scaleY: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-body">Analisando o mood...</p>
          </motion.div>
        )}

        {showPlaylist && submittedMood && (
          <PlaylistCard tracks={tracks} mood={submittedMood} />
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground font-body">
          VisionBeat · Powered by IA + YouTube Music
        </p>
      </footer>
    </div>
  );
};

export default Index;
