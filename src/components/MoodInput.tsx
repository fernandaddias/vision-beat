import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ImageData {
  base64: string;
  mimeType: string;
}

interface MoodInputProps {
  onSubmit: (text: string, imageData?: ImageData) => void;
  isLoading: boolean;
}

const MoodInput = ({ onSubmit, isLoading }: MoodInputProps) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImageToBase64 = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Falha ao carregar imagem"));
        image.src = imageUrl;
      });

      const maxDimension = 896;
      const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponivel");

      ctx.drawImage(img, 0, 0, width, height);

      // JPEG reduz bastante tamanho para upload base64
      const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
      const base64 = dataUrl.split(",")[1];

      return { base64, mimeType: "image/jpeg" };
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const fileToBase64 = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
      reader.readAsDataURL(file);
    });

    const base64 = dataUrl.split(",")[1];
    return { base64, mimeType: file.type || "image/jpeg" };
  };

  const canSubmit = (text.trim() || imageData) && !isLoading && !isImageProcessing;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(text.trim(), imageData ?? undefined);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo invalido", { description: "Selecione uma imagem valida." });
      e.target.value = "";
      return;
    }

    setIsImageProcessing(true);

    // Preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Convert to compressed base64 to avoid 413 payload too large
    try {
      const compressed = await compressImageToBase64(file);
      if (compressed.base64.length > 6_000_000) {
        throw new Error("Imagem ainda muito grande apos compressao");
      }

      setImageData(compressed);
    } catch {
      try {
        const fallback = await fileToBase64(file);
        if (fallback.base64.length > 6_000_000) {
          throw new Error("Imagem muito grande");
        }

        setImageData(fallback);
      } catch {
        setImageData(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        toast.error("Nao foi possivel processar a imagem", {
          description: "Use JPG/PNG/WebP e tente uma imagem menor.",
        });
      }
    } finally {
      setIsImageProcessing(false);
    }

    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageData(null);
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
        {/* Image preview */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative mx-3 mt-3 rounded-xl overflow-hidden"
            >
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-48 object-cover rounded-xl"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                title="Remover imagem"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-3 text-xs text-white/70 bg-black/40 rounded-full px-2 py-0.5">
                Imagem adicionada · a IA vai analisar
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            placeholder={imageData ? "Adicione uma descrição (opcional)..." : "Descreva um cenário, emoção ou atmosfera..."}
            className="w-full min-h-[120px] bg-transparent resize-none p-5 pr-14 text-foreground placeholder:text-muted-foreground font-body focus:outline-none text-base"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className={imageData ? "text-primary" : "text-muted-foreground hover:text-foreground"}
              title="Upload de imagem"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-5 w-5" />
            </Button>
            <Button
              variant="glow"
              size="icon"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-xl"
            >
              {isLoading || isImageProcessing ? (
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
