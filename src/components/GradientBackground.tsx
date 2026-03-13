import { motion } from "framer-motion";

interface GradientBackgroundProps {
  mood?: "warm" | "cool" | "dream" | "neutral";
}

const moodGradients = {
  warm: "radial-gradient(ellipse at 20% 50%, hsl(28 100% 55% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, hsl(0 80% 50% / 0.1) 0%, transparent 50%)",
  cool: "radial-gradient(ellipse at 20% 50%, hsl(210 100% 60% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(180 80% 40% / 0.1) 0%, transparent 50%)",
  dream: "radial-gradient(ellipse at 30% 30%, hsl(270 80% 60% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, hsl(320 70% 50% / 0.1) 0%, transparent 50%)",
  neutral: "radial-gradient(ellipse at 50% 50%, hsl(240 6% 14% / 0.5) 0%, transparent 70%)",
};

const GradientBackground = ({ mood = "neutral" }: GradientBackgroundProps) => {
  return (
    <motion.div
      className="fixed inset-0 -z-10 pointer-events-none"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      style={{ backgroundImage: moodGradients[mood] }}
    />
  );
};

export default GradientBackground;
