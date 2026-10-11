import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Cpu, UserPlus, CheckCircle2 } from "lucide-react";
import { authApi, schoolYearsApi } from "../lib/api";
import { Button, Field, inputClass } from "../components/ui";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const darkInputClass =
  `${inputClass} bg-white/[0.06] border-white/15 text-white ` +
  "placeholder:text-white/30 focus:bg-white/[0.08] focus:text-white selection:bg-accent-400 selection:text-white";

const EMPTY_FORM = {
  role: "student",
  username: "",
  email: "",
  password: "",
  confirm_password: "",
  full_name: "",
  section: "",
  school_year: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [schoolYears, setSchoolYears] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    schoolYearsApi.list().then(({ data }) => {
      const list = data.results ?? data;
      setSchoolYears(list);
      const active = list.find((sy) => sy.is_active);
      if (active) setForm((f) => ({ ...f, school_year: active.id }));
    });
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.register({ ...form, role: "student" });
      setDone(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data ? Object.values(data).flat().join(" ") : "Couldn't submit that registration.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen app-mesh flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md glass rounded-2xl p-8 text-center"
        >
          <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} className="text-cyan-500" />
          </div>
          <h1 className="font-display text-xl text-white mb-2">Registration submitted</h1>
          <p className="text-white/50 text-sm mb-6">
            An administrator needs to review and approve your account before you can sign in.
            This is usually quick -- check back soon.
          </p>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Back to sign in
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-mesh flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent-500/20 blur-[100px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/20 blur-[100px]" />

      <motion.div variants={container} initial="hidden" animate="show" className="relative w-full max-w-md">
        <motion.div variants={item} className="flex flex-col items-center mb-7">
          <div className="h-14 w-14 rounded-2xl bg-accent-500 flex items-center justify-center mb-4 shadow-[0_12px_32px_-8px_rgba(47,111,237,0.5)]">
            <Cpu size={26} className="text-white" />
          </div>
          <h1 className="font-display text-2xl text-white text-center">Create a student account</h1>
          <p className="text-white/40 text-sm mt-1 text-center">Information Technology Education</p>
        </motion.div>

        <motion.form variants={item} onSubmit={handleSubmit} className="glass rounded-2xl p-7">
          <Field label="Full name">
            <input
              className={darkInputClass}
              value={form.full_name}
              onChange={set("full_name")}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Username">
              <input
                className={darkInputClass}
                value={form.username}
                onChange={set("username")}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={darkInputClass}
                value={form.email}
                onChange={set("email")}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className={`${darkInputClass} pr-9`}
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  required
                />
              </div>
            </Field>
            <Field label="Confirm password">
              <input
                type={showPw ? "text" : "password"}
                className={darkInputClass}
                value={form.confirm_password}
                onChange={set("confirm_password")}
                autoComplete="new-password"
                required
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/50 mb-4 -mt-1 cursor-pointer select-none">
            <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
            Show passwords
          </label>
          <Field label="Section">
            <input
              className={darkInputClass}
              value={form.section}
              onChange={set("section")}
              placeholder="e.g. BSIT 4A"
            />
          </Field>
          <Field label="Capstone term (school year)">
            <select
              className={darkInputClass}
              value={form.school_year}
              onChange={set("school_year")}
              required
            >
              <option value="" disabled className="text-ink">
                Select your capstone term
              </option>
              {schoolYears.map((sy) => (
                <option key={sy.id} value={sy.id} className="text-ink">
                  {sy.label}
                  {sy.is_active ? " (current)" : ""}
                </option>
              ))}
            </select>
          </Field>
          {schoolYears.length === 0 && (
            <p className="text-xs text-white/35 -mt-2 mb-4">
              No capstone terms are configured yet -- contact your administrator.
            </p>
          )}

          {error && <p className="text-danger-500 text-sm mt-1 mb-2">{error}</p>}

          <Button type="submit" loading={loading} icon={UserPlus} className="w-full mt-4">
            Create account
          </Button>
        </motion.form>

        <motion.p variants={item} className="text-center text-white/50 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent-400 hover:text-accent-300 font-medium">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
