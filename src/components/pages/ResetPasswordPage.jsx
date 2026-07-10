import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../utilities/api/authApi";
import AuthHero from "../../assets/images/72be0103c7bc9699eb45bcda9cc0d1c0fd2b75fa.jpg";

const passwordRules = [
  { id: "length", label: "At least 6 characters", test: (value) => value.length >= 6 },
  { id: "upper", label: "At least one uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { id: "lower", label: "At least one lowercase letter", test: (value) => /[a-z]/.test(value) },
  { id: "digit", label: "At least one number", test: (value) => /\d/.test(value) },
  { id: "special", label: "At least one special character", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

const getQueryParam = (searchParams, keys) => {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) {
      return value;
    }
  }

  return "";
};

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => getQueryParam(searchParams, ["email", "EmailId"]));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const token = useMemo(() => {
    const rawToken = getQueryParam(searchParams, ["token", "Token"]);
    return rawToken;
  }, [searchParams]);

  const passedRules = useMemo(
    () => passwordRules.filter((rule) => rule.test(newPassword)).length,
    [newPassword],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!token) {
      setError("Reset token is missing from the link.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        email: email.trim(),
        newPassword,
        confirmPassword,
        token,
      });
      setSuccess(true);
    } catch (err) {
      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.response?.data ||
        err.message ||
        "Unable to reset password.";

      setError(String(apiMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="relative flex flex-col justify-center items-center px-8 md:px-28 bg-white py-12 overflow-y-auto">
        <Link
          to="/"
          className="logo absolute top-8 left-8 md:left-28 font-alatsi text-primary text-[17px] hover:text-[#FF996C] transition-colors tracking-widest font-medium text-xl"
        >
          SEARCHERA
        </Link>

        <div className="auth-content max-w-lg w-full">
          <h1 className="text-3xl font-semibold text-primary font-poppins">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Set a new password for your account.
          </p>

          {success ? (
            <div className="mt-8 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Your password has been updated successfully. You can now sign in with the new password.
              <div className="mt-4 flex gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-[#7A3E1D] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
                >
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="block text-sm font-medium font-poppins text-primary">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-accent"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium font-poppins text-primary">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-accent"
                />
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            index <= passedRules
                              ? passedRules <= 2
                                ? "bg-red-400"
                                : passedRules <= 3
                                  ? "bg-yellow-400"
                                  : "bg-green-400"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="space-y-0.5">
                      {passwordRules.map((rule) => {
                        const ok = rule.test(newPassword);
                        return (
                          <li
                            key={rule.id}
                            className={`flex items-center gap-1.5 text-[11px] font-poppins ${
                              ok ? "text-green-600" : "text-gray-400"
                            }`}
                          >
                            <span>{ok ? "✓" : "○"}</span>
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium font-poppins text-primary">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-accent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#7A3E1D] py-3 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating password..." : "Reset password"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-primary">
            Need a new reset link?{" "}
            <Link to="/forgot-password" className="text-blue-600 hover:underline">
              Go back
            </Link>
          </p>
        </div>
      </div>

      <div className="right-section relative h-screen bg-gray-100 hidden md:block">
        <img
          src={AuthHero}
          alt="Decorative"
          className="w-full h-full object-cover object-[center_95%]"
        />
        <div className="absolute inset-0 bg-white/10" />
      </div>
    </div>
  );
};

export default ResetPasswordPage;