import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../utilities/api/authApi";
import AuthHero from "../../assets/images/72be0103c7bc9699eb45bcda9cc0d1c0fd2b75fa.jpg";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
      setMessage("If an account exists for that email, a password reset link has been sent.");
    } catch (err) {
      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.response?.data ||
        err.message ||
        "Unable to send reset link.";

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
            Forgot password?
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your email and we will send you a reset link.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {submitted && !error && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                {message}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#7A3E1D] py-3 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-primary">
            Remembered your password?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Back to login
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

export default ForgotPasswordPage;