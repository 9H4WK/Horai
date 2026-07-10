import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import { register } from "../../utilities/api/authApi";
import { API_BASE_URL } from "../../utilities/api/client";
import GoogleIcon from "../../assets/images/Google__G__logo.svg.png";
import AuthHero from "../../assets/images/72be0103c7bc9699eb45bcda9cc0d1c0fd2b75fa.jpg";

const parseJwtPayload = (token) => {
  try {
    const payloadPart = String(token || "").split(".")[1];

    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const persistUserRole = (responseData) => {
  const token = responseData?.token;
  const payload = parseJwtPayload(token);

  const userType =
    responseData?.userType ||
    responseData?.UserType ||
    responseData?.role ||
    responseData?.Role ||
    payload?.userType ||
    payload?.role ||
    payload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"];

  if (userType) {
    localStorage.setItem("userType", String(userType));
    localStorage.setItem("role", String(userType));
    localStorage.setItem("isAdmin", String(String(userType).toLowerCase() === "admin"));
  }
};

// ── password strength checker ─────────────────────────────────────────────
const passwordRules = [
  { id: "length", label: "At least 6 characters", test: (p) => p.length >= 6 },
  {
    id: "upper",
    label: "At least one uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "At least one lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  { id: "digit", label: "At least one number", test: (p) => /\d/.test(p) },
  {
    id: "special",
    label: "At least one special character (@$!%*?&#…)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const passed = passwordRules.filter((r) => r.test(password)).length;
  const colors = [
    "bg-red-400",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
  ];
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return (
    <div className="mt-2 space-y-1.5">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= passed ? colors[passed - 1] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-[11px] font-poppins-medium ${passed <= 2 ? "text-red-500" : passed <= 3 ? "text-yellow-600" : "text-green-600"}`}
      >
        {labels[passed - 1] ?? ""}
      </p>
      {/* Rule checklist */}
      <ul className="space-y-0.5">
        {passwordRules.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-1.5 text-[11px] font-poppins ${ok ? "text-green-600" : "text-gray-400"}`}
            >
              <span>{ok ? "✓" : "○"}</span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ── parse API error into a human-readable string ──────────────────────────
const parseApiError = (err) => {
  const status = err.response?.status;
  const resp = err.response?.data;

  // ── known status codes ──
  if (status === 409)
    return "An account with this email already exists. Please log in or use a different email.";

  // ── ASP.NET Identity array: [{ code, description }] ──
  if (Array.isArray(resp)) {
    const messages = resp
      .map((e) => {
        // map common Identity error codes to friendly messages
        if (e?.code === "DuplicateUserName" || e?.code === "DuplicateEmail")
          return "This email is already registered. Please log in or use a different email.";
        if (e?.code === "PasswordTooShort")
          return "Password is too short (minimum 6 characters).";
        if (e?.code === "PasswordRequiresUpper")
          return "Password must contain at least one uppercase letter.";
        if (e?.code === "PasswordRequiresLower")
          return "Password must contain at least one lowercase letter.";
        if (e?.code === "PasswordRequiresDigit")
          return "Password must contain at least one number.";
        if (e?.code === "PasswordRequiresNonAlphanumeric")
          return "Password must contain at least one special character (e.g. @$!%*?&).";
        if (e?.code === "InvalidUserName")
          return "The email address format is invalid.";
        return e?.description ?? e?.message ?? null;
      })
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }

  // ── ASP.NET ModelState: { errors: { Field: ["msg"] } } ──
  if (resp?.errors && typeof resp.errors === "object") {
    const lines = Object.entries(resp.errors).flatMap(([, msgs]) =>
      Array.isArray(msgs) ? msgs : [msgs],
    );
    if (lines.length) return lines.join(" ");
  }

  // ── plain message / title ──
  if (typeof resp === "string" && resp.trim()) return resp.trim();
  if (resp?.message) return resp.message;
  if (resp?.title) return resp.title;

  // ── generic fallback with hint ──
  if (status === 400)
    return "Registration failed. Please check your details — the email may already be registered, or the password doesn't meet the requirements.";
  return err.message ?? "Something went wrong. Please try again.";
};

// ── field-level validation (runs before hitting the API) ─────────────────
const validateForm = (form) => {
  const errs = {};
  if (!form.firstName.trim()) errs.firstName = "First name is required.";
  if (!form.lastName.trim()) errs.lastName = "Last name is required.";
  if (!form.email.trim()) errs.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = "Please enter a valid email address.";

  const failedRules = passwordRules.filter((r) => !r.test(form.password));
  if (!form.password) errs.password = "Password is required.";
  else if (failedRules.length)
    errs.password = `Password must include: ${failedRules.map((r) => r.label.toLowerCase()).join(", ")}.`;

  if (!form.confirmPassword)
    errs.confirmPassword = "Please confirm your password.";
  else if (form.confirmPassword !== form.password)
    errs.confirmPassword = "Passwords do not match.";

  if (form.phoneNumber.trim()) {
    if (!/^\+[1-9]\d{6,14}$/.test(form.phoneNumber.trim()))
      errs.phoneNumber =
        "Phone must be in international format, e.g. +201234567890.";
  }

  return errs;
};

// ── input component ───────────────────────────────────────────────────────
const FormField = ({ label, error, children }) => (
  <div className="form-group">
    <label className="block text-sm font-medium font-poppins text-primary">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500 font-poppins">{error}</p>}
  </div>
);

const inputCls = (hasError) =>
  `mt-1 w-full rounded-xl border px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? "border-red-300 focus:ring-red-300 bg-red-50"
      : "border-gray-200 focus:ring-primary-accent"
  }`;

// ── main component ────────────────────────────────────────────────────────
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    userType: "JobSeeker",
    currentStatus: 0,
    termsAccepted: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("JobSeeker");
  const [pendingProvider, setPendingProvider] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear field error on change
    if (fieldErrors[name])
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    if (apiError) setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    // ── client-side validation first ──
    const errs = validateForm(formData);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        userType: formData.userType,
        currentStatus: Number(formData.currentStatus),
      };
      if (formData.phoneNumber.trim())
        payload.phoneNumber = formData.phoneNumber.trim();

      const data = await register(payload);

      if (data?.token) {
        localStorage.setItem("token", data.token);
        persistUserRole(data);
        const userRole = localStorage.getItem("userType") || localStorage.getItem("role");
        const normalizedRole = String(userRole || "").toLowerCase();

        if (normalizedRole === "admin") {
          window.location.href = "/admin";
        } else if (normalizedRole.includes("employer") || normalizedRole.includes("company")) {
          window.location.href = "/for-employers";
        } else {
          window.location.href = "/jobs";
        }
      } else {
        // Email confirmation required
        window.location.href = "/login?registered=1";
      }
    } catch (err) {
      setApiError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExternalLogin = (provider) => {
    setPendingProvider(provider);
    setShowRoleModal(true);
  };
  const confirmExternalLogin = () => {
    if (pendingProvider && selectedRole)
      window.location.href = `${API_BASE_URL}/api/Account/ExternalLogin?provider=${pendingProvider}&role=${selectedRole}`;
  };

  return (
    <div className="register-page grid grid-cols-1 md:grid-cols-2">
      {/* ── LEFT ── */}
      <div className="register-left relative flex flex-col justify-start items-center px-8 md:px-28 bg-white pt-10 pb-8 min-h-screen overflow-y-auto">
        <Link
          to="/"
          className="logo absolute top-8 left-8 md:left-28 font-alatsi text-primary text-[17px] hover:text-[#FF996C] transition-colors tracking-widest font-medium text-xl"
        >
          Horai
        </Link>

        <div className="auth-content max-w-lg w-full mt-14">
          <h2 className="text-3xl font-semibold text-primary font-poppins">
            Get Started Now
          </h2>
          <p className="mt-1 text-sm text-gray-500 font-poppins">
            Create your free account in seconds.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {/* ── API error banner ── */}
            {apiError && (
              <div className="flex gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-poppins leading-relaxed">
                <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
                <span>{apiError}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium font-poppins text-primary mb-1">
                Name
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    className={inputCls(!!fieldErrors.firstName)}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-xs text-red-500 font-poppins">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    className={inputCls(!!fieldErrors.lastName)}
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-xs text-red-500 font-poppins">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Email */}
            <FormField label="Email address" error={fieldErrors.email}>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={inputCls(!!fieldErrors.email)}
              />
            </FormField>

            {/* Password */}
            <FormField label="Password" error={fieldErrors.password}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className={`${inputCls(!!fieldErrors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-poppins select-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <PasswordStrength password={formData.password} />
            </FormField>

            {/* Confirm Password */}
            <FormField
              label="Confirm Password"
              error={fieldErrors.confirmPassword}
            >
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className={`${inputCls(!!fieldErrors.confirmPassword)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-poppins select-none"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {/* Inline match indicator */}
              {formData.confirmPassword && !fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-green-600 font-poppins">
                  ✓ Passwords match
                </p>
              )}
            </FormField>

            {/* Phone */}
            <FormField
              label="Phone number (optional)"
              error={fieldErrors.phoneNumber}
            >
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+254234567890"
                className={inputCls(!!fieldErrors.phoneNumber)}
              />
              <p className="mt-1 text-[11px] text-gray-400 font-poppins">
                Include country code, e.g. +254 for Kenya.
              </p>
            </FormField>

            {/* User Type */}
            <FormField label="User type">
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins focus:outline-none focus:ring-2 focus:ring-primary-accent bg-white"
              >
                <option value="JobSeeker">Job Seeker</option>
                <option value="Employer">HR</option>
              </select>
            </FormField>

            {/* Current Status - only for Job Seekers */}
            {formData.userType === "JobSeeker" && (
              <FormField label="Current status">
                <select
                  name="currentStatus"
                  value={formData.currentStatus}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentStatus: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-poppins focus:outline-none focus:ring-2 focus:ring-primary-accent bg-white"
                >
                  <option value={0}>Open to work</option>
                  <option value={1}>Actively applying</option>
                  <option value={2}>Employed — open to offers</option>
                  <option value={3}>Employed — not looking</option>
                  <option value={4}>Freelancing</option>
                  <option value={5}>Student</option>
                </select>
              </FormField>
            )}

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                name="termsAccepted"
                id="terms"
                checked={formData.termsAccepted}
                onChange={handleChange}
                required
                className="h-4 w-4 mt-0.5 flex-shrink-0"
              />
              <label
                htmlFor="terms"
                className="text-xs text-primary font-poppins cursor-pointer"
              >
                I agree to the{" "}
                <span className="text-blue-600 hover:underline cursor-pointer">
                  terms & policy
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !formData.termsAccepted}
              className="w-full rounded-xl bg-[#D3571F] py-3 text-sm font-poppins-medium text-white hover:bg-[#B8461A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing up…
                </span>
              ) : (
                "Sign up"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="px-3 text-xs text-gray-400">Or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleExternalLogin("Google")}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2 font-poppins"
            >
              <img src={GoogleIcon} alt="Google" className="w-4 h-4" />
              Google
            </button>
            <button
              type="button"
              onClick={() => handleExternalLogin("GitHub")}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2 font-poppins"
            >
              <Github className="w-4 h-4" />
              GitHub
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-primary font-poppins">
            Have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="right-section h-full bg-gray-100 hidden md:block overflow-hidden sticky top-0 max-h-screen">
        <img
          src={AuthHero}
          alt="Decorative"
          className="absolute inset-0 w-full h-full object-cover object-[center_95%]"
        />
        <div className="absolute inset-0 bg-white/10" />
      </div>

      {/* ── Role Modal ── */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-semibold text-primary font-poppins mb-1">
              Choose Your Role
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-poppins">
              Select how you want to continue
            </p>
            <div className="space-y-3">
              {[
                {
                  val: "JobSeeker",
                  label: "Job Seeker",
                  sub: "Looking for opportunities",
                },
                { val: "Employer", label: "Employer", sub: "Hiring talent" },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition hover:bg-gray-50 ${selectedRole === opt.val ? "border-[#D3571F]/40 bg-orange-50" : "border-gray-100"}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.val}
                    checked={selectedRole === opt.val}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-5 h-5 cursor-pointer"
                    style={{ accentColor: "#D3571F" }}
                  />
                  <div>
                    <div className="font-medium text-primary font-poppins">
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-500 font-poppins">
                      {opt.sub}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-primary font-poppins-medium text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmExternalLogin}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-accent text-white font-poppins-medium text-sm hover:bg-[#B8461A] transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
