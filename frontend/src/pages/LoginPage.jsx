import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, inputClass } from "../components/ui";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(`/${user.role}`);
    } catch {
      setError("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-mesh flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient blurred orbs -- static, decorative only */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-gold-500/20 blur-[100px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-500/20 blur-[100px]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-md"
      >
        <motion.div variants={item} className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gold-500 flex items-center justify-center mb-4 shadow-[0_12px_32px_-8px_rgba(240,180,41,0.5)]">
            <GraduationCap size={26} className="text-base-900" />
          </div>
          <h1 className="font-display text-2xl text-white text-center">
            Capstone Project Monitor
          </h1>
          <p className="text-white/40 text-sm mt-1 text-center">
            ITE Department · Colegio de Kidapawan
          </p>
        </motion.div>

        <motion.form
          variants={item}
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-7"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-white/70 mb-1.5">Username</label>
            <input
              className={`${inputClass} bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 focus:bg-white/10`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jdelacruz"
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                className={`${inputClass} bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 focus:bg-white/10 pr-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-danger-500 text-sm mt-3"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" loading={loading} icon={LogIn} className="w-full mt-6">
            Sign in
          </Button>
        </motion.form>

        <motion.p variants={item} className="text-center text-white/30 text-xs mt-6">
          Accounts are created by your department administrator.
        </motion.p>
      </motion.div>
    </div>
  );
}
