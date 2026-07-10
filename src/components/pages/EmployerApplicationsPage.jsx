import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Loader2,
  ArrowRight,
  Search,
  Filter,
  Trophy,
  Users,
  Sparkles,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { getAllApplications } from "../../utilities/api/interviewApi";

const statusStyles = {
  submitted: "bg-sky-50 text-sky-800 border-sky-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  interview: "bg-violet-50 text-violet-800 border-violet-200",
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const tierStyles = {
  excellent: "bg-[#1B4332] text-white",
  strong: "bg-[#2D6A4F] text-white",
  moderate: "bg-[#C26A42] text-white",
  weak: "bg-amber-600 text-white",
  poor: "bg-gray-500 text-white",
};

const getStatusClass = (status) => {
  const key = String(status || "").toLowerCase();
  if (key.includes("accept")) return statusStyles.accepted;
  if (key.includes("reject")) return statusStyles.rejected;
  if (key.includes("interview") || key.includes("screen")) return statusStyles.interview;
  if (key.includes("pend")) return statusStyles.pending;
  return statusStyles.submitted;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const scoreColor = (score) => {
  if (score == null) return "#9CA3AF";
  if (score >= 85) return "#1B4332";
  if (score >= 70) return "#2D6A4F";
  if (score >= 55) return "#C26A42";
  if (score >= 40) return "#D97706";
  return "#9CA3AF";
};

const MatchRing = ({ score, size = 56 }) => {
  const value = score == null ? null : Math.max(0, Math.min(100, Number(score)));
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = value == null ? c : c - (value / 100) * c;
  const color = scoreColor(value);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1E4DC" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-poppins-semibold leading-none" style={{ color }}>
          {value == null ? "—" : Math.round(value)}
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wide text-gray-400">match</span>
      </div>
    </div>
  );
};

const EmployerApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [groupByJob, setGroupByJob] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const loadApplications = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getAllApplications({ sort: "score" });

        if (!mounted) return;

        const updatedFromNav = location.state?.updatedApplication ?? null;
        if (updatedFromNav) {
          const merged = data.map((a) => {
            const id = String(a.applicationId || a.id || "");
            const updatedId = String(updatedFromNav.applicationId || updatedFromNav.id || "");
            if (id && id === updatedId) return { ...a, ...updatedFromNav };
            return a;
          });
          setApplications(merged);
        } else {
          setApplications(data);
        }
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.title ||
            err?.message ||
            "Unable to load employer application reviews.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadApplications();
    return () => {
      mounted = false;
    };
  }, [location.state]);

  const jobOptions = useMemo(() => {
    const map = new Map();
    for (const app of applications) {
      const key = String(app.jobId || app.jobTitle || "unknown");
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: app.jobTitle || "Untitled role",
          count: 0,
        });
      }
      map.get(key).count += 1;
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [applications]);

  const stats = useMemo(() => {
    const total = applications.length;
    const accepted = applications.filter((a) => String(a.status).toLowerCase().includes("accept")).length;
    const rejected = applications.filter((a) => String(a.status).toLowerCase().includes("reject")).length;
    const pending = total - accepted - rejected;
    const scores = applications.map((a) => Number(a.matchScore)).filter((n) => !Number.isNaN(n) && n != null);
    const avgScore = scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null;
    const excellent = applications.filter((a) => a.fitTier === "excellent" || a.fitTier === "strong").length;
    return { total, accepted, rejected, pending, avgScore, excellent };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    let list = [...applications];

    if (jobFilter !== "all") {
      list = list.filter((a) => String(a.jobId || a.jobTitle || "unknown") === jobFilter);
    }

    if (statusFilter !== "all") {
      list = list.filter((a) => {
        const s = String(a.status || "").toLowerCase();
        if (statusFilter === "pending") {
          return !s.includes("accept") && !s.includes("reject");
        }
        return s.includes(statusFilter);
      });
    }

    if (tierFilter !== "all") {
      list = list.filter((a) => String(a.fitTier || "").toLowerCase() === tierFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => {
        const hay = [
          a.applicantName,
          a.applicantEmail,
          a.jobTitle,
          a.companyName,
          a.summary,
          ...(a.skills || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((left, right) => {
      if (sortBy === "date") {
        return (new Date(right.appliedAt || 0) - new Date(left.appliedAt || 0));
      }
      if (sortBy === "name") {
        return String(left.applicantName || "").localeCompare(String(right.applicantName || ""));
      }
      if (sortBy === "status") {
        return String(left.status || "").localeCompare(String(right.status || ""));
      }
      // score (default)
      return (Number(right.matchScore) || 0) - (Number(left.matchScore) || 0);
    });

    return list;
  }, [applications, jobFilter, statusFilter, tierFilter, search, sortBy]);

  const grouped = useMemo(() => {
    if (!groupByJob) {
      return [{ key: "all", title: "All candidates", items: filteredApplications }];
    }

    const map = new Map();
    for (const app of filteredApplications) {
      const key = String(app.jobId || app.jobTitle || "unknown");
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: app.jobTitle || "Untitled role",
          company: app.companyName || "",
          items: [],
        });
      }
      map.get(key).items.push(app);
    }

    return [...map.values()].map((group) => ({
      ...group,
      items: group.items
        .slice()
        .sort((a, b) => (Number(b.matchScore) || 0) - (Number(a.matchScore) || 0))
        .map((item, index) => ({ ...item, displayRank: index + 1 })),
    }));
  }, [filteredApplications, groupByJob]);

  const renderCard = (application, rankOverride) => {
    const id = application.applicationId || application.id;
    const name = application.applicantName || application.applicantEmail || "Unknown candidate";
    const skills = Array.isArray(application.skills) ? application.skills : [];
    const strengths = Array.isArray(application.strengths) ? application.strengths : [];
    const summary = application.summary || "";
    const rank = rankOverride ?? application.rankInJob ?? application.displayRank;
    const tier = application.fitTier || "";
    const tierLabel = application.fitLabel || (tier ? `${tier} fit` : null);

    return (
      <article
        key={String(id || `${application.jobTitle}-${name}`)}
        className="group relative overflow-hidden rounded-3xl border border-[#F1DED3] bg-white p-5 shadow-[0_10px_30px_rgba(122,62,29,0.05)] transition hover:border-[#E0C4B2] hover:shadow-[0_16px_40px_rgba(122,62,29,0.1)]"
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#C26A42] to-[#7A3E1D] opacity-0 transition group-hover:opacity-100" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <MatchRing score={application.matchScore} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {rank != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF2EA] px-2 py-0.5 text-[11px] font-poppins-semibold text-[#C26A42]">
                    <Trophy className="h-3 w-3" />
                    #{rank}
                    {application.totalInJob ? ` of ${application.totalInJob}` : ""}
                  </span>
                )}
                {tierLabel && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                      tierStyles[tier] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {tierLabel}
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusClass(
                    application.status,
                  )}`}
                >
                  {application.status || "Submitted"}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A3E1D] text-xs font-bold text-white">
                  {getInitials(name)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-poppins-semibold text-[#1B1B1B]">{name}</h2>
                  <p className="truncate text-sm text-gray-500">
                    {application.applicantHeadline || application.applicantEmail || "Candidate"}
                    {application.applicantLocation ? ` · ${application.applicantLocation}` : ""}
                  </p>
                </div>
              </div>

              {!groupByJob && (
                <p className="mt-2 text-sm text-gray-600">
                  {application.jobTitle || "Untitled role"}
                  <span className="mx-1.5 text-gray-300">·</span>
                  {application.companyName || "Company"}
                </p>
              )}

              {summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{summary}</p>}

              {application.recommendation && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#7A3E1D]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI: {application.recommendation}
                </p>
              )}

              {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.slice(0, 8).map((skill, i) => (
                    <span
                      key={`${skill}-${i}`}
                      className="rounded-md bg-[#FAF3EE] px-2 py-0.5 text-[11px] font-medium text-[#5E2F15]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {strengths.length > 0 && (
                <p className="mt-2 text-xs italic text-gray-400">{strengths.slice(0, 3).join(" · ")}</p>
              )}

              <p className="mt-2 text-[11px] text-gray-400">Applied {formatDate(application.appliedAt)}</p>
            </div>
          </div>

          <Link
            to={id ? `/employer/applications/${id}` : "/employer/applications"}
            state={{ application }}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#7A3E1D] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Open dossier
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    );
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,214,195,0.42),transparent_35%),linear-gradient(180deg,#FFF9F5_0%,#FFFFFF_42%)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-poppins-semibold uppercase tracking-[0.22em] text-[#C26A42]">
              Intelligence desk
            </p>
            <h1 className="mt-2 text-4xl font-poppins-semibold text-[#1B1B1B] sm:text-5xl">
              Candidate screening
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              AI-ranked applicants per role — match scores, fit tiers, and profile signals at a glance so HR can
              shortlist with confidence.
            </p>
          </div>
        </div>

        {/* Pipeline stats */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "In pipeline", value: stats.total, icon: Users, accent: "text-[#7A3E1D]" },
            { label: "Pending decision", value: stats.pending, icon: Filter, accent: "text-amber-700" },
            { label: "Strong+ fit", value: stats.excellent, icon: Trophy, accent: "text-emerald-700" },
            { label: "Accepted", value: stats.accepted, icon: Sparkles, accent: "text-emerald-700" },
            {
              label: "Avg match",
              value: stats.avgScore == null ? "—" : `${stats.avgScore}`,
              icon: BarChart3,
              accent: "text-[#C26A42]",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[#F1DED3] bg-white/90 px-4 py-3 shadow-sm backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
                <card.icon className={`h-4 w-4 ${card.accent}`} />
              </div>
              <p className={`mt-1 text-2xl font-poppins-semibold ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-6 rounded-3xl border border-[#F1DED3] bg-white/95 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates, skills, roles…"
                className="w-full rounded-xl border border-[#E7D9D0] bg-[#FFFBF8] py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#C26A42] focus:outline-none focus:ring-2 focus:ring-[#C26A42]/20"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-[#E7D9D0] bg-white py-2.5 pl-3 pr-9 text-sm text-gray-700 focus:border-[#C26A42] focus:outline-none"
                >
                  <option value="all">All jobs ({applications.length})</option>
                  {jobOptions.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-[#E7D9D0] bg-white py-2.5 pl-3 pr-9 text-sm text-gray-700 focus:border-[#C26A42] focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="interview">Interview</option>
                  <option value="accept">Accepted</option>
                  <option value="reject">Rejected</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-[#E7D9D0] bg-white py-2.5 pl-3 pr-9 text-sm text-gray-700 focus:border-[#C26A42] focus:outline-none"
                >
                  <option value="all">All fit tiers</option>
                  <option value="excellent">Excellent</option>
                  <option value="strong">Strong</option>
                  <option value="moderate">Moderate</option>
                  <option value="weak">Weak</option>
                  <option value="poor">Poor</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none rounded-xl border border-[#E7D9D0] bg-white py-2.5 pl-3 pr-9 text-sm text-gray-700 focus:border-[#C26A42] focus:outline-none"
                >
                  <option value="score">Sort: match score</option>
                  <option value="date">Sort: newest</option>
                  <option value="name">Sort: name</option>
                  <option value="status">Sort: status</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              <button
                type="button"
                onClick={() => setGroupByJob((v) => !v)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  groupByJob
                    ? "border-[#7A3E1D] bg-[#7A3E1D] text-white"
                    : "border-[#E7D9D0] bg-white text-gray-700 hover:bg-[#FFF6F1]"
                }`}
              >
                {groupByJob ? "Grouped by job" : "Flat list"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-3 rounded-3xl border border-[#EFD7C9] bg-white px-5 py-8 text-sm text-gray-700 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#C26A42]" />
              Loading AI-ranked applications…
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-3xl border border-[#EFD7C9] bg-white px-5 py-8 text-sm text-gray-600 shadow-sm">
              No applications match your filters.
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map((group) => (
                <div key={group.key}>
                  {groupByJob && (
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-[#F1DED3] pb-2">
                      <div>
                        <h2 className="text-xl font-poppins-semibold text-[#1B1B1B]">{group.title}</h2>
                        {group.company ? (
                          <p className="text-sm text-gray-500">{group.company}</p>
                        ) : null}
                      </div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[#C26A42]">
                        {group.items.length} candidate{group.items.length === 1 ? "" : "s"} · ranked by AI match
                      </p>
                    </div>
                  )}
                  <div className="grid gap-4">
                    {group.items.map((application) =>
                      renderCard(application, groupByJob ? application.displayRank : application.rankInJob),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default EmployerApplicationsPage;
