import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Cpu, UserPlus, CheckCircle2 } from "lucide-react";
import { authApi, schoolYearsApi } from "../lib/api";
import { Button, Field, ThemeToggle, inputClass } from "../components/ui";
import { flattenErrors } from "../lib/names";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const darkInputClass = inputClass;

const EMPTY_FORM = {
  role: "student",
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
  const [fieldErrors, setFieldErrors] = useState({});
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
    setFieldErrors({});
    setLoading(true);
    try {
      await authApi.register({ ...form, email: form.email.trim().toLowerCase(), role: "student" });
      setDone(true);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        // Errors for the Email and Full name inputs (duplicate email, name already
        // listed as a capstone partner) go under those fields; the rest stay in the banner.
        const { full_name: nameError, email: emailError, ...rest } = data;
        const nextFieldErrors = {};
        if (nameError !== undefined) nextFieldErrors.full_name = flattenErrors(nameError).join(" ");
        if (emailError !== undefined) nextFieldErrors.email = flattenErrors(emailError).join(" ");
        setFieldErrors(nextFieldErrors);
        const other = flattenErrors(rest);
        if (other.length > 0) setError(other.join(" "));
        else if (Object.keys(nextFieldErrors).length === 0) setError("Couldn't submit that registration.");
      } else {
        setError("Couldn't submit that registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="relative w-full max-w-md glass-strong rounded-3xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 360, damping: 16 }}
            className="h-14 w-14 rounded-full bg-cyan-500/15 ring-8 ring-cyan-500/10 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 size={26} className="text-cyan" />
          </motion.div>
          <h1 className="font-display text-xl font-semibold text-fg mb-2">Registration submitted</h1>
          <p className="text-fg/62 text-sm mb-6">
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="relative w-full max-w-lg">
        <motion.div variants={item} className="flex flex-col items-center mb-7">
          <div className="h-14 w-14 rounded-2xl bg-brand-gradient flex items-center justify-center mb-4 shadow-[0_14px_32px_-8px_rgba(61,109,245,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]">
            <Cpu size={26} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-fg text-center">Create a student account</h1>
          <p className="text-fg/55 text-sm mt-1 text-center">Information Technology Education</p>
        </motion.div>

        <motion.form variants={item} onSubmit={handleSubmit} className="glass-strong rounded-3xl p-7 sm:p-8">
          <Field label="Full name">
            <input
              className={`${darkInputClass} ${fieldErrors.full_name ? "!border-danger-500" : ""}`}
              value={form.full_name}
              onChange={(e) => {
                set("full_name")(e);
                if (fieldErrors.full_name) setFieldErrors((f) => ({ ...f, full_name: "" }));
              }}
              aria-invalid={Boolean(fieldErrors.full_name)}
              aria-describedby={fieldErrors.full_name ? "full-name-error" : "full-name-hint"}
              required
            />
            {fieldErrors.full_name ? (
              <span id="full-name-error" role="alert" className="block text-xs text-danger mt-1.5">
                {fieldErrors.full_name}
              </span>
            ) : (
              <span id="full-name-hint" className="block text-xs text-fg/55 mt-1.5">
                Registering as someone else's partner? If your representative already listed you in
                a capstone request, you don't need an account.
              </span>
            )}
          </Field>

          <Field label="Email address">
            <input
              type="email"
              inputMode="email"
              className={`${darkInputClass} ${fieldErrors.email ? "!border-danger-500" : ""}`}
              value={form.email}
              onChange={(e) => {
                set("email")(e);
                if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: "" }));
              }}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : "email-hint"}
              required
            />
            {fieldErrors.email ? (
              <span id="email-error" role="alert" className="block text-xs text-danger mt-1.5">
                {fieldErrors.email}
              </span>
            ) : (
              <span id="email-hint" className="block text-xs text-fg/55 mt-1.5">
                You will use this email to sign in.
              </span>
            )}
          </Field>

          <div className="grid sm:grid-cols-2 sm:gap-3">
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
          <label className="flex items-center gap-2 text-sm text-fg/62 mb-4 -mt-1 cursor-pointer select-none">
            <input type="checkbox" className="h-4 w-4 accent-accent-500" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
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
              <option value="" disabled>
                Select your capstone term
              </option>
              {schoolYears.map((sy) => (
                <option key={sy.id} value={sy.id}>
                  {sy.label}
                  {sy.is_active ? " (current)" : ""}
                </option>
              ))}
            </select>
          </Field>
          {schoolYears.length === 0 && (
            <p className="text-xs text-fg/50 -mt-2 mb-4">
              No capstone terms are configured yet -- contact your administrator.
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-danger-500/10 px-3 py-2 text-danger text-sm mt-1 mb-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} icon={UserPlus} className="w-full mt-4">
            Create account
          </Button>
        </motion.form>

        <motion.p variants={item} className="text-center text-fg/62 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
