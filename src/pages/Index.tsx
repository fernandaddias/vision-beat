import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Headphones } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import MoodInput from "@/components/MoodInput";
import PlaylistCard from "@/components/PlaylistCard";

type Mood = "warm" | "cool" | "dream" | "neutral";

const mockTracks = [
  { id: "1", title: "Chet Baker Sings", artist: "Chet Baker", album: "Chet Baker Sings", cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop", duration: "3:42" },
  { id: "2", title: "Blue in Green", artist: "Miles Davis", album: "Kind of Blue", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop", duration: "5:27" },
  { id: "3", title: "Gymnopédie No.1", artist: "Erik Satie", album: "Gymnopédies", cover: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop", duration: "3:05" },
  { id: "4", title: "Moon River", artist: "Frank Sinatra", album: "Moonlight Sinatra", cover: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=100&h=100&fit=crop", duration: "3:34" },
  { id: "5", title: "Rainy Night in Georgia", artist: "Brook Benton", album: "Today", cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop", duration: "4:15" },
  { id: "6", title: "Clair de Lune", artist: "Debussy", album: "Suite bergamasque", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop", duration: "5:00" },
];

const Index = () => {
  const [mood, setMood] = useState<Mood>("neutral");
  const [isLoading, setIsLoading] = useState(false);
  const [submittedMood, setSubmittedMood] = useState<string | null>(null);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const handleSubmit = (text: string) => {
    setIsLoading(true);
    setSubmittedMood(text);

    // Simulate mood detection
    const lower = text.toLowerCase();
    if (lower.includes("energia") || lower.includes("vibrante") || lower.includes("festa")) {
      setMood("warm");
    } else if (lower.includes("chuva") || lower.includes("calmo") || lower.includes("biblioteca")) {
      setMood("cool");
    } else if (lower.includes("nostalgia") || lower.includes("sonho") || lower.includes("verão")) {
      setMood("dream");
    } else {
      setMood("warm");
    }

    setTimeout(() => {
      setIsLoading(false);
      setShowPlaylist(true);
    }, 2000);
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <GradientBackground mood={mood} />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Headphones className="h-5 w-5 text-primary" />
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
            Conectar Spotify
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
          <PlaylistCard tracks={mockTracks} mood={submittedMood} />
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground font-body">
          VisionBeat · Powered by IA + Spotify
        </p>
      </footer>
    </div>
  );
};

export default Index;
