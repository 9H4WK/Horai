import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Briefcase, ArrowRight, CalendarClock } from "lucide-react";
import { getAllApplications, normalizeApplication } from "../../utilities/api/interviewApi";

const formatDate = (value) => {
  if (!value) {
    return "Recently";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const statusStyles = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  interview: "bg-violet-50 text-violet-700 border-violet-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const getStatusClassName = (status) => {
  const key = String(status || "").toLowerCase();

  if (key.includes("accept") || key.includes("complete") || key.includes("pass")) return statusStyles.accepted;
  if (key.includes("interview") || key.includes("screen")) return statusStyles.interview;
  if (key.includes("reject")) return statusStyles.rejected;
  if (key.includes("pend")) return statusStyles.pending;
  return statusStyles.submitted;
};

const MyApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadApplications = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getAllApplications();
        if (!mounted) {
          return;
        }

        setApplications(data.map((item) => normalizeApplication(item.raw ?? item)));
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.title ||
            err?.message ||
            "Unable to load applications.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadApplications();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedApplications = useMemo(
    () =>
      [...applications].sort((left, right) => {
        const leftDate = left.appliedAt ? new Date(left.appliedAt).getTime() : 0;
        const rightDate = right.appliedAt ? new Date(right.appliedAt).getTime() : 0;
        return rightDate - leftDate;
      }),
    [applications],
  );

  const hasApplications = sortedApplications.length > 0;

  if (!localStorage.getItem("token")) {
    return (
      <main className="min-h-[calc(100vh-8rem)] bg-[#FFF8F4] px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-3xl border border-[#F1DED3] bg-white p-8 shadow-[0_20px_80px_rgba(122,62,29,0.08)]">
          <h1 className="text-3xl font-poppins-semibold text-[#1B1B1B]">My Applications</h1>
          <p className="mt-3 text-sm text-gray-600">
            Sign in to view your applications, screening status, and interview results.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-[#7A3E1D] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              to="/jobs"
              className="rounded-xl border border-[#E7D9D0] bg-white px-5 py-3 text-sm font-medium text-[#7A3E1D] transition hover:bg-[#FFF6F1]"
            >
              Browse jobs
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_left,_rgba(255,214,195,0.45),_transparent_35%),linear-gradient(180deg,_#FFF8F4_0%,_#FFFFFF_42%)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-poppins-semibold uppercase tracking-[0.24em] text-[#C26A42]">
            HORAI Labs applications
          </p>
          <h1 className="mt-2 text-4xl font-poppins-semibold tracking-tight text-[#1B1B1B] sm:text-5xl">
            My Applications
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Track roles you applied for at HORAI Labs, complete assessments when invited, and review outcomes.
          </p>
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="flex items-center gap-3 rounded-3xl border border-[#F1DED3] bg-white px-6 py-8 text-sm text-gray-600 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#C26A42]" />
              Loading your applications...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
              {error}
            </div>
          ) : hasApplications ? (
            <div className="grid gap-4">
              {sortedApplications.map((application) => {
                const applicationId = application.applicationId || application.id;
                const statusClassName = getStatusClassName(application.status);
                const detailsHref = applicationId ? `/applications/${applicationId}` : "/jobs";

                return (
                  <article
                    key={String(applicationId || `${application.jobTitle}-${application.companyName}`)}
                    className="rounded-3xl border border-[#F1DED3] bg-white p-5 shadow-[0_10px_30px_rgba(122,62,29,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(122,62,29,0.09)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF2EA] text-[#C26A42]">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-poppins-semibold text-[#1B1B1B]">
                            {application.jobTitle || "Untitled role"}
                          </h2>
                          <p className="mt-1 text-sm text-gray-600">
                            {application.companyName || "Company not available"}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 font-medium ${statusClassName}`}>
                              {application.status || "Submitted"}
                            </span>
                            {application.matchScore != null && (
                              <span className="inline-flex items-center rounded-full bg-[#FFF2EA] px-3 py-1 font-medium text-[#C26A42]">
                                Match {Math.round(application.matchScore)}
                              </span>
                            )}
                            {application.hrComment && (
                              <span className="inline-flex items-center rounded-full border border-[#E7D9D0] bg-[#FFFBF8] px-3 py-1 font-medium text-[#7A3E1D]">
                                HR message
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {formatDate(application.appliedAt)}
                            </span>
                          </div>
                          {application.hrComment && (
                            <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                              “{application.hrComment}”
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        to={detailsHref}
                        state={{
                          applicationId,
                          jobTitle: application.jobTitle,
                          companyName: application.companyName,
                          status: application.status,
                          appliedAt: application.appliedAt,
                          sessionId: application.sessionId,
                          hrComment: application.hrComment,
                          matchScore: application.matchScore,
                          application,
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A3E1D] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        View details
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#F1DED3] bg-white px-6 py-10 text-center shadow-sm">
              <h2 className="text-2xl font-poppins-semibold text-[#1B1B1B]">No applications yet</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                Once you apply for a job, it will appear here with the current screening status and links to your interview flow.
              </p>
              <Link
                to="/jobs"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#7A3E1D] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Browse jobs
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default MyApplicationsPage;