import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Image, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MoodInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const MoodInput = ({ onSubmit, isLoading }: MoodInputProps) => {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim() && !isLoading) {
      onSubmit(text.trim());
    }
  };

  const suggestions = [
    "Um dia chuvoso em uma biblioteca antiga",
    "Energia vibrante de uma cidade à noite",
    "Nostalgia de um verão passado",
    "Pôr do sol na praia com brisa leve",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      <div className="glass rounded-2xl p-1.5">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Descreva um cenário, emoção ou atmosfera..."
            className="w-full min-h-[120px] bg-transparent resize-none p-5 pr-14 text-foreground placeholder:text-muted-foreground font-body focus:outline-none text-base"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              title="Upload de imagem"
            >
              <Image className="h-5 w-5" />
            </Button>
            <Button
              variant="glow"
              size="icon"
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              className="rounded-xl"
            >
              {isLoading ? (
                <Sparkles className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setText(s)}
            className="px-4 py-2 rounded-full text-sm glass text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default MoodInput;
