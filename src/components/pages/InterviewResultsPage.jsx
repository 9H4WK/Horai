import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { normalizeInterviewResult } from "../../utilities/api/interviewApi";

const InterviewResultsPage = () => {
  const { sessionId } = useParams();
  const location = useLocation();

  const initialResult = useMemo(() => {
    if (location.state?.result) {
      return normalizeInterviewResult(location.state.result);
    }

    return null;
  }, [location.state?.result]);

  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialResult) {
      setLoading(false);
      return;
    }

    if (!sessionId) {
      setError(
        "Interview result unavailable. Please go back to your applications and try again.",
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    setError(
      "Interview result data was not properly passed. Please refresh or go back to your applications.",
    );
  }, [initialResult, sessionId]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,213,188,0.45),transparent_30%),linear-gradient(180deg,#FFF9F5_0%,#FFFFFF_35%,#FFFDFC_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <Link
          to="/applications"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D] transition hover:text-[#5E2F15]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </Link>

        <div className="mt-5 rounded-4xl border border-[#F1DED3] bg-white p-6 shadow-[0_22px_70px_rgba(122,62,29,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 border-b border-[#F2E4DA] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-poppins-semibold uppercase tracking-[0.22em] text-[#C26A42]">
                Assessment complete
              </p>
              <h1 className="mt-2 text-3xl font-poppins-semibold text-[#1B1B1B] sm:text-4xl">
                Your assessment summary
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Session {sessionId ? `#${String(sessionId).slice(0, 8)}` : "unavailable"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-3 rounded-3xl border border-dashed border-[#F1DED3] bg-[#FFF8F4] px-5 py-8 text-sm text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin text-[#C26A42]" />
              Loading your interview summary...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : result ? (
            <div className="mt-6 rounded-3xl border border-[#F1DED3] bg-[#FFF8F4] p-5 shadow-sm">
              <h3 className="text-lg font-poppins-semibold text-[#1B1B1B]">
                Continue from here
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Use this result to decide whether to keep applying, review your profile, or move to other roles.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/applications"
                      className="inline-flex items-center justify-center rounded-xl bg-[#7A3E1D] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      My applications
                    </Link>
                    <Link
                      to="/jobs"
                      className="inline-flex items-center justify-center rounded-xl border border-[#E7D9D0] bg-white px-4 py-2.5 text-sm font-medium text-[#7A3E1D] transition hover:bg-[#FFF6F1]"
                    >
                      Browse jobs
                    </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-[#F1DED3] bg-[#FFF8F4] px-5 py-8 text-sm text-gray-600">
              No interview result was returned for this session yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default InterviewResultsPage;