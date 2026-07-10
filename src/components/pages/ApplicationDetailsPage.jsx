import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CalendarClock,
  Building2,
  Briefcase,
  MessageSquareText,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getApplicationById, normalizeApplication } from "../../utilities/api/interviewApi";

const formatDate = (value) => {
  if (!value) {
    return "Recently";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleString();
};

const statusStyles = {
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  interview: "bg-violet-50 text-violet-800 border-violet-200",
  submitted: "bg-sky-50 text-sky-800 border-sky-200",
};

const getStatusClass = (status) => {
  const key = String(status || "").toLowerCase();
  if (key.includes("accept")) return statusStyles.accepted;
  if (key.includes("reject")) return statusStyles.rejected;
  if (key.includes("interview")) return statusStyles.interview;
  return statusStyles.submitted;
};

const ApplicationDetailsPage = () => {
  const { applicationId } = useParams();
  const location = useLocation();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const applicationFromState = useMemo(() => {
    if (!location.state?.applicationId && !location.state?.application) {
      return null;
    }

    if (location.state.application) {
      return normalizeApplication(location.state.application.raw ?? location.state.application);
    }

    return normalizeApplication({
      applicationId: location.state.applicationId,
      jobTitle: location.state.jobTitle,
      companyName: location.state.companyName,
      status: location.state.status,
      appliedAt: location.state.appliedAt,
      sessionId: location.state.sessionId,
      hrComment: location.state.hrComment,
      matchScore: location.state.matchScore,
    });
  }, [location.state]);

  useEffect(() => {
    let mounted = true;

    const loadDetails = async () => {
      if (!applicationId) {
        setError("Missing application id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const found = await getApplicationById(applicationId);

        if (!mounted) {
          return;
        }

        if (!found) {
          if (applicationFromState) {
            setApplication(applicationFromState);
          } else {
            setError("Application not found.");
            setApplication(null);
          }
        } else {
          setApplication(normalizeApplication(found.raw ?? found));
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        if (applicationFromState) {
          setApplication(applicationFromState);
        } else {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.title ||
              err?.message ||
              "Unable to load application details.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      mounted = false;
    };
  }, [applicationFromState, applicationId]);

  const interviewRoute = application?.applicationId
    ? `/interview/${application.applicationId}/disclaimer`
    : "/applications";

  const resultRoute = application?.sessionId
    ? `/interview-results/${application.sessionId}`
    : null;

  const statusKey = String(application?.status || "").toLowerCase();
  const isAccepted = statusKey.includes("accept");
  const isRejected = statusKey.includes("reject");
  const isDecided = isAccepted || isRejected;

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,214,195,0.42),transparent_35%),linear-gradient(180deg,#FFF9F5_0%,#FFFFFF_42%)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl rounded-3xl border border-[#F1DED3] bg-white p-6 shadow-[0_20px_70px_rgba(122,62,29,0.08)] sm:p-8">
        <Link
          to="/applications"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D] transition hover:text-[#5E2F15]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </Link>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#EFD7C9] bg-[#FFF8F4] px-5 py-8 text-sm text-gray-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#C26A42]" />
            Loading application details...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : application ? (
          <div className="mt-6 space-y-5">
            <header>
              <p className="text-xs font-poppins-semibold uppercase tracking-[0.22em] text-[#C26A42]">
                Application details
              </p>
              <h1 className="mt-2 text-3xl font-poppins-semibold text-[#1B1B1B] sm:text-4xl">
                {application.jobTitle || "Untitled role"}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Application #{String(application.applicationId || application.id || "N/A").slice(0, 8)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusClass(
                    application.status,
                  )}`}
                >
                  {application.status || "Submitted"}
                </span>
                {application.matchScore != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF2EA] px-2.5 py-0.5 text-xs font-medium text-[#C26A42]">
                    <Sparkles className="h-3 w-3" />
                    Match {Math.round(application.matchScore)}
                  </span>
                )}
                {application.rankInJob != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    <Trophy className="h-3 w-3" />
                    Rank #{application.rankInJob}
                  </span>
                )}
              </div>
            </header>

            {isDecided && (
              <div
                className={`rounded-2xl border p-5 ${
                  isAccepted
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-red-200 bg-red-50/70"
                }`}
              >
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D]">
                  <MessageSquareText className="h-4 w-4" />
                  Message from the hiring team
                </div>
                {application.hrComment ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                    {application.hrComment}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    {isAccepted
                      ? "Your application was accepted. The employer did not leave an additional comment."
                      : "Your application was not successful this time. The employer did not leave an additional comment."}
                  </p>
                )}
                {application.decidedAt && (
                  <p className="mt-3 text-xs text-gray-500">Decided {formatDate(application.decidedAt)}</p>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#EFD7C9] bg-[#FFF8F4] p-4">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D]">
                  <Building2 className="h-4 w-4" />
                  Company
                </div>
                <p className="text-sm text-gray-700">{application.companyName || "Unknown company"}</p>
              </div>

              <div className="rounded-2xl border border-[#EFD7C9] bg-[#FFF8F4] p-4">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D]">
                  <Briefcase className="h-4 w-4" />
                  Status
                </div>
                <p className="text-sm text-gray-700">{application.status || "Submitted"}</p>
              </div>

              <div className="rounded-2xl border border-[#EFD7C9] bg-[#FFF8F4] p-4 md:col-span-2">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D]">
                  <CalendarClock className="h-4 w-4" />
                  Applied at
                </div>
                <p className="text-sm text-gray-700">{formatDate(application.appliedAt)}</p>
              </div>
            </div>

            {(application.summary || application.recommendation) && (
              <div className="rounded-2xl border border-[#EFD7C9] bg-[#FFF8F4] p-4">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D]">
                  <Sparkles className="h-4 w-4" />
                  Screening snapshot
                </div>
                {application.summary && (
                  <p className="text-sm leading-6 text-gray-700">{application.summary}</p>
                )}
                {application.recommendation && (
                  <p className="mt-2 text-sm font-medium text-[#7A3E1D]">
                    {application.recommendation}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {resultRoute ? (
                <Link
                  to={resultRoute}
                  state={{
                    applicationId: application.applicationId,
                    jobTitle: application.jobTitle,
                    companyName: application.companyName,
                    sessionId: application.sessionId,
                  }}
                  className="rounded-xl bg-[#7A3E1D] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  View interview result
                </Link>
              ) : !isDecided ? (
                <Link
                  to={interviewRoute}
                  state={{
                    applicationId: application.applicationId,
                    jobTitle: application.jobTitle,
                    companyName: application.companyName,
                    sessionId: application.sessionId,
                  }}
                  className="rounded-xl bg-[#7A3E1D] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Start interview
                </Link>
              ) : null}

              <Link
                to="/jobs"
                className="rounded-xl border border-[#E7D9D0] bg-white px-5 py-3 text-sm font-medium text-[#7A3E1D] transition hover:bg-[#FFF6F1]"
              >
                Browse jobs
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default ApplicationDetailsPage;
