import { motion } from "framer-motion";
import { Play, ExternalLink } from "lucide-react";

interface Track {
  id: string;
  title: string;
  artist: string;
  album_art?: string;
  preview_url?: string;
  music_url?: string;
}

interface PlaylistCardProps {
  tracks: Track[];
  mood: string;
}

const PlaylistCard = ({ tracks, mood }: PlaylistCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-body">Playlist gerada para</p>
              <h3 className="text-lg font-display font-semibold text-foreground mt-1">"{mood}"</h3>
            </div>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
              <ExternalLink className="h-4 w-4" />
              Abrir no Spotify
            </button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {tracks.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors group cursor-pointer"
            >
              <span className="text-sm text-muted-foreground w-6 text-right font-body">
                {i + 1}
              </span>
              <div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                <img
                  src={track.album_art || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop"}
                  alt={track.title}
                  className="h-full w-full object-cover"
                />
                {track.preview_url && (
                  <a href={track.preview_url} target="_blank" rel="noopener noreferrer">
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-5 w-5 text-foreground fill-foreground" />
                    </div>
                  </a>
                )}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between pr-4">
                <div>
                  <p className="text-sm font-medium text-foreground truncate font-body">
                    {track.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate font-body">
                    {track.artist}
                  </p>
                </div>
                {track.music_url && (
                  <a
                    href={track.music_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-primary"
                    title="Ouvir no YouTube Music"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PlaylistCard;
