import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Cpu, LogIn, Eye, EyeOff, ListChecks, FileCheck2, MessagesSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, ThemeToggle, inputClass } from "../components/ui";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const HIGHLIGHTS = [
  { icon: ListChecks, title: "Track every milestone", text: "From proposal to final defense, with clear deadlines." },
  { icon: FileCheck2, title: "Submit and get reviewed", text: "Upload deliverables and receive adviser feedback." },
  { icon: MessagesSquare, title: "Stay in the loop", text: "Announcements and notifications in one place." },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
      const user = await login(email.trim().toLowerCase(), password);
      navigate(`/${user.role}`);
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-5xl grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
      >
        {/* Brand / pitch (desktop) */}
        <div className="hidden lg:block">
          <motion.div variants={item} className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-[0_14px_32px_-8px_rgba(61,109,245,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]">
              <Cpu size={24} className="text-white" />
            </div>
            <p className="text-sm text-fg/60">Information Technology Education</p>
          </motion.div>
          <motion.h1
            variants={item}
            className="font-display text-5xl font-semibold leading-[1.08] text-fg"
          >
            Guide every capstone from <span className="text-gradient">idea to defense.</span>
          </motion.h1>
          <motion.p variants={item} className="mt-5 max-w-md text-fg/65">
            One workspace for students, advisers and administrators to plan, review and
            celebrate capstone progress.
          </motion.p>
          <motion.ul variants={item} className="mt-9 space-y-3 max-w-md">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="glass flex items-start gap-3.5 rounded-2xl p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-fg">{title}</span>
                  <span className="block text-sm text-fg/60">{text}</span>
                </span>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Sign-in card */}
        <div className="w-full max-w-md mx-auto">
          <motion.div variants={item} className="flex flex-col items-center mb-7 lg:hidden">
            <div className="h-14 w-14 rounded-2xl bg-brand-gradient flex items-center justify-center mb-4 shadow-[0_14px_32px_-8px_rgba(61,109,245,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]">
              <Cpu size={26} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-fg text-center">
              Capstone Project Monitor
            </h1>
            <p className="text-fg/55 text-sm mt-1 text-center">Information Technology Education</p>
          </motion.div>

          <motion.form
            variants={item}
            onSubmit={handleSubmit}
            className="glass-strong rounded-3xl p-7 sm:p-8"
          >
            <h2 className="font-display text-xl font-semibold text-fg">Welcome back</h2>
            <p className="text-sm text-fg/60 mt-1 mb-6">Sign in to continue to your workspace.</p>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-fg/75 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-fg/75 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  className={`${inputClass} pr-11`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-fg/50 hover:bg-fg/[0.08] hover:text-fg"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 rounded-xl bg-danger-500/10 px-3 py-2 text-sm text-danger"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" loading={loading} icon={LogIn} className="w-full mt-6 py-3">
              Sign in
            </Button>
          </motion.form>

          <motion.p variants={item} className="text-center text-fg/62 text-sm mt-6">
            New student?{" "}
            <Link to="/register" className="text-accent hover:underline font-medium">
              Create an account
            </Link>
          </motion.p>
          <motion.p variants={item} className="text-center text-fg/50 text-xs mt-2">
            Student registrations are reviewed by an administrator before sign-in is enabled.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
