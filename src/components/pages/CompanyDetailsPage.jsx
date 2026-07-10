import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  Star,
  Users,
} from "lucide-react";
import {
  addCompanyReview,
  getCompanyDetails,
  getCompanyJobs,
  getCompanyReviews,
  normalizeCompany,
  resolveCurrentUserIdentity,
} from "../../utilities/api/companiesApi";

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

const StarRating = ({ value = 0 }) => {
  const numValue = Number(value) || 0;
  return (
    <div className="flex items-center gap-1 bg-[#FFF2EA] px-2.5 py-1 rounded-lg border border-[#F1DED3]">
      <Star className="h-3.5 w-3.5 fill-primary-accent text-primary-accent" />
      <span className="text-xs font-poppins-semibold text-[#1B1B1B]">
        {numValue > 0 ? `${numValue.toFixed(1)}/5` : "—/5"}
      </span>
    </div>
  );
};

const ReviewFormField = ({ label, children, helpText }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-poppins-medium uppercase tracking-[0.16em] text-gray-500">
      {label}
    </span>
    {children}
    {helpText ? <span className="mt-1.5 block text-xs text-gray-400">{helpText}</span> : null}
  </label>
);

const normalizeReviewPayload = (companyId, formValues, identity) => ({
  companyId,
  CompanyId: companyId,
  rating: Number(formValues.rating),
  Rating: Number(formValues.rating),
  title: formValues.title,
  Title: formValues.title,
  comment: formValues.comment,
  Comment: formValues.comment,
  reviewText: formValues.comment,
  ReviewText: formValues.comment,
  reviewerName: identity.userName,
  ReviewerName: identity.userName,
  reviewerEmail: identity.email,
  ReviewerEmail: identity.email,
  reviewerId: identity.userId,
  ReviewerId: identity.userId,
});

const matchesIdentity = (review, identity) => {
  const reviewerId = String(review.reviewerId || "").trim().toLowerCase();
  const reviewerEmail = String(review.reviewerEmail || "").trim().toLowerCase();
  const reviewerName = String(review.reviewerName || "").trim().toLowerCase();

  const userId = String(identity.userId || "").trim().toLowerCase();
  const email = String(identity.email || "").trim().toLowerCase();
  const userName = String(identity.userName || "").trim().toLowerCase();

  if (userId && reviewerId && userId === reviewerId) {
    return true;
  }

  if (email && reviewerEmail && email === reviewerEmail) {
    return true;
  }

  if (userName && reviewerName && userName === reviewerName) {
    return true;
  }

  return false;
};

const getReviewTitle = (review) => review.title || review.raw?.subject || review.raw?.headline || "Review";

const CompanyDetailsPage = () => {
  const { companyId } = useParams();
  const location = useLocation();
  const [company, setCompany] = useState(location.state?.company ? normalizeCompany(location.state.company) : null);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [formValues, setFormValues] = useState({ rating: "5", title: "", comment: "" });
  const [submissionBlock, setSubmissionBlock] = useState("");

  const currentUser = useMemo(() => resolveCurrentUserIdentity(), []);
  const isAuthenticated = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    let mounted = true;

    const loadCompany = async () => {
      if (!companyId) {
        setError("Missing company id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [companyResult, jobsResult, reviewsResult] = await Promise.allSettled([
          getCompanyDetails(companyId),
          getCompanyJobs(companyId),
          getCompanyReviews(companyId),
        ]);

        if (!mounted) {
          return;
        }

        if (companyResult.status === "fulfilled" && companyResult.value) {
          setCompany(companyResult.value);
        }

        if (jobsResult.status === "fulfilled") {
          setJobs(Array.isArray(jobsResult.value) ? jobsResult.value : []);
        } else {
          setJobs([]);
        }

        if (reviewsResult.status === "fulfilled") {
          setReviews(Array.isArray(reviewsResult.value) ? reviewsResult.value : []);
        } else {
          setReviews([]);
        }

        const failedSections = [companyResult, jobsResult, reviewsResult].filter((item) => item.status === "rejected");
        if (failedSections.length > 0 && !companyResult.value) {
          setError("Could not load company information right now.");
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(
          loadError?.response?.data?.message ||
            loadError?.response?.data?.title ||
            loadError?.message ||
            "Unable to load company details.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCompany();

    return () => {
      mounted = false;
    };
  }, [companyId]);

  const currentUserReview = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    return reviews.find((review) => matchesIdentity(review, currentUser)) || null;
  }, [currentUser, isAuthenticated, reviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return Number(company?.averageRating || 0) || 0;
    }

    const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    return total / reviews.length;
  }, [company?.averageRating, reviews]);

  const ratingBreakdown = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: reviews.filter((review) => Math.round(Number(review.rating) || 0) === rating).length,
    }));
    const max = Math.max(1, ...counts.map((item) => item.count));

    return counts.map((item) => ({
      ...item,
      percent: Math.round((item.count / max) * 100),
    }));
  }, [reviews]);

  const canSubmitReview = Boolean(isAuthenticated && !currentUserReview && !submissionBlock);

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    setReviewError("");
    setReviewSuccess("");

    if (!isAuthenticated) {
      setReviewError("Sign in to post a company review.");
      return;
    }

    if (currentUserReview || submissionBlock) {
      setReviewError("You have already reviewed this company.");
      return;
    }

    if (!companyId) {
      setReviewError("Missing company id.");
      return;
    }

    const ratingValue = Number(formValues.rating);
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      setReviewError("Select a rating from 1 to 5.");
      return;
    }

    if (String(formValues.comment).trim().length < 10) {
      setReviewError("Write at least 10 characters for your review.");
      return;
    }

    setReviewSubmitting(true);

    try {
      await addCompanyReview(normalizeReviewPayload(companyId, formValues, currentUser));
      setReviewSuccess("Your review was posted successfully.");
      setSubmissionBlock("You have already reviewed this company.");
      setFormValues({ rating: "5", title: "", comment: "" });

      const refreshedReviews = await getCompanyReviews(companyId);
      setReviews(Array.isArray(refreshedReviews) ? refreshedReviews : []);
    } catch (submitError) {
      const backendMessage =
        submitError?.response?.data?.message ||
        submitError?.response?.data?.title ||
        submitError?.response?.data?.error ||
        submitError?.message ||
        "Unable to submit your review.";

      setReviewError(backendMessage);

      if (String(backendMessage).toLowerCase().includes("already") || String(backendMessage).toLowerCase().includes("duplicate")) {
        setSubmissionBlock("You have already reviewed this company.");
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  const companyName = company?.companyName || location.state?.company?.companyName || "Company";
  const companyWebsite = company?.website || location.state?.company?.website || "";
  const companyLocation = company?.location || location.state?.company?.location || "";
  const companyIndustry = company?.industry || location.state?.company?.industry || "";
  const companyDescription = company?.description || location.state?.company?.description || "";
  const reviewCount = reviews.length || company?.reviewCount || 0;
  const hasJobs = jobs.length > 0;
  const hasReviews = reviews.length > 0;

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,214,195,0.42),transparent_35%),linear-gradient(180deg,#FFF9F5_0%,#FFFFFF_42%)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <Link
          to="/companies"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#7A3E1D] transition hover:text-[#5E2F15]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to companies
        </Link>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-3xl border border-[#EFD7C9] bg-white px-5 py-8 text-sm text-gray-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#C26A42]" />
            Loading company profile...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <header className="rounded-4xl border border-[#F1DED3] bg-white p-6 shadow-[0_20px_70px_rgba(122,62,29,0.08)] sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FFF2EA] text-[#C26A42]">
                    {company?.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={companyName}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <Building2 className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-poppins-semibold uppercase tracking-[0.22em] text-[#C26A42]">
                      Company profile
                    </p>
                    <h1 className="mt-2 text-3xl font-poppins-semibold text-[#1B1B1B] sm:text-4xl">
                      {companyName}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      {companyIndustry ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8F4] px-3 py-1 text-[#7A3E1D]">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {companyIndustry}
                        </span>
                      ) : null}
                      {companyLocation ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8F4] px-3 py-1 text-[#7A3E1D]">
                          <MapPin className="h-3.5 w-3.5" />
                          {companyLocation}
                        </span>
                      ) : null}
                      {companyWebsite ? (
                        <a
                          href={companyWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8F4] px-3 py-1 text-[#7A3E1D] transition hover:bg-[#FFF1E8]"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Website
                        </a>
                      ) : null}
                    </div>
                    {companyDescription ? (
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
                        {companyDescription}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-88 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-2xl border border-[#F1DED3] bg-[#FFF8F4] p-4">
                    <p className="text-xs font-poppins-medium uppercase tracking-[0.16em] text-gray-400">Rating</p>
                    <div className="mt-2 flex items-center gap-2">
                      <StarRating value={averageRating} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#F1DED3] bg-[#FFF8F4] p-4">
                    <p className="text-xs font-poppins-medium uppercase tracking-[0.16em] text-gray-400">Reviews</p>
                    <p className="mt-2 text-3xl font-poppins-semibold text-[#1B1B1B]">{reviewCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[#F1DED3] bg-[#FFF8F4] p-4">
                    <p className="text-xs font-poppins-medium uppercase tracking-[0.16em] text-gray-400">Jobs</p>
                    <p className="mt-2 text-3xl font-poppins-semibold text-[#1B1B1B]">{jobs.length}</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <section className="rounded-4xl border border-[#F1DED3] bg-white p-6 shadow-[0_10px_30px_rgba(122,62,29,0.05)]">
                  <div className="flex items-center gap-2 text-sm font-poppins-semibold text-[#1B1B1B]">
                    <Users className="h-4 w-4 text-[#C26A42]" />
                    Company overview
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#F1DED3] bg-[#FFF8F4] p-4">
                      <p className="text-xs font-poppins-medium uppercase tracking-[0.16em] text-gray-400">Industry</p>
                      <p className="mt-2 text-sm text-gray-700">{companyIndustry || "Not listed"}</p>
                    </div>
                    <div className="rounded-2xl border border-[#F1DED3] bg-[#FFF8F4] p-4">
                      <p className="text-xs font-poppins-medium uppercase tracking-[0.16em] text-gray-400">Location</p>
                      <p className="mt-2 text-sm text-gray-700">{companyLocation || "Not listed"}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-4xl border border-[#F1DED3] bg-white p-6 shadow-[0_10px_30px_rgba(122,62,29,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-poppins-semibold text-[#1B1B1B]">
                      <MessageSquare className="h-4 w-4 text-[#C26A42]" />
                      Reviews
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Star className="h-4 w-4 fill-primary-accent text-primary-accent" />
                      {averageRating > 0 ? averageRating.toFixed(1) : "No rating yet"}
                    </div>
                  </div>

                  {hasReviews ? (
                    <div className="mt-5 space-y-4">
                      {ratingBreakdown.map((item) => (
                        <div key={item.rating} className="flex items-center gap-3">
                          <span className="w-10 text-xs font-poppins-medium text-gray-500">{item.rating} star</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-primary-accent"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-gray-400">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">No reviews yet. Be the first to share your experience.</p>
                  )}

                  <div className="mt-6 grid gap-4">
                    {hasReviews ? (
                      reviews.map((review) => (
                        <article key={review.id} className="rounded-2xl border border-[#F1DED3] bg-[#FFF8F4] p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-sm font-poppins-semibold text-[#1B1B1B]">{getReviewTitle(review)}</h3>
                              <p className="mt-1 text-xs text-gray-500">
                                {review.reviewerName || review.reviewerEmail || "Anonymous reviewer"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StarRating value={review.rating} />
                              <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                            </div>
                          </div>
                          {review.comment ? (
                            <p className="mt-3 text-sm leading-6 text-gray-700">{review.comment}</p>
                          ) : null}
                        </article>
                      ))
                    ) : null}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-4xl border border-[#F1DED3] bg-white p-6 shadow-[0_10px_30px_rgba(122,62,29,0.05)]">
                  <div className="flex items-center gap-2 text-sm font-poppins-semibold text-[#1B1B1B]">
                    <CalendarDays className="h-4 w-4 text-[#C26A42]" />
                    Open roles
                  </div>

                  {hasJobs ? (
                    <div className="mt-5 space-y-3">
                      {jobs.map((job) => (
                        <article key={job.id} className="rounded-2xl border border-[#F1DED3] bg-[#FFF8F4] p-4">
                          <h3 className="text-sm font-poppins-semibold text-[#1B1B1B]">{job.title}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {[job.location, job.jobType, job.salaryRange].filter(Boolean).join(" • ") || "Open role"}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">No open roles were returned for this company.</p>
                  )}

                  <Link
                    to="/jobs"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#E7D9D0] bg-white px-4 py-2.5 text-sm font-medium text-[#7A3E1D] transition hover:bg-[#FFF6F1]"
                  >
                    Browse all jobs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </section>

                <section className="rounded-4xl border border-[#F1DED3] bg-white p-6 shadow-[0_10px_30px_rgba(122,62,29,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-poppins-semibold text-[#1B1B1B]">Write a review</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Share your experience and help other candidates.
                      </p>
                    </div>
                    {!isAuthenticated ? (
                      <Link
                        to="/login"
                        state={{ from: location.pathname }}
                        className="rounded-xl bg-[#7A3E1D] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Sign in
                      </Link>
                    ) : null}
                  </div>

                  {!isAuthenticated ? (
                    <div className="mt-5 rounded-2xl border border-[#EFD7C9] bg-[#FFF8F4] p-4 text-sm text-gray-600">
                      Sign in to leave a company review. Reviews are limited to one per user per company.
                    </div>
                  ) : currentUserReview || submissionBlock ? (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      {submissionBlock || "You have already reviewed this company."}
                    </div>
                  ) : (
                    <form className="mt-5 space-y-4" onSubmit={handleSubmitReview}>
                      <ReviewFormField label="Rating" helpText="Pick a score from 1 to 5.">
                        <select
                          value={formValues.rating}
                          onChange={(event) => setFormValues((prev) => ({ ...prev, rating: event.target.value }))}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                          disabled={reviewSubmitting}
                        >
                          <option value="5">5 - Excellent</option>
                          <option value="4">4 - Very good</option>
                          <option value="3">3 - Good</option>
                          <option value="2">2 - Fair</option>
                          <option value="1">1 - Poor</option>
                        </select>
                      </ReviewFormField>

                      <ReviewFormField label="Title" helpText="A short summary of your experience.">
                        <input
                          value={formValues.title}
                          onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                          placeholder="Strong hiring process"
                          disabled={reviewSubmitting}
                        />
                      </ReviewFormField>

                      <ReviewFormField label="Review" helpText="At least 10 characters.">
                        <textarea
                          value={formValues.comment}
                          onChange={(event) => setFormValues((prev) => ({ ...prev, comment: event.target.value }))}
                          rows={5}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/30"
                          placeholder="Describe the hiring process, company culture, interview experience, or anything helpful for other candidates."
                          disabled={reviewSubmitting}
                        />
                      </ReviewFormField>

                      {reviewError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {reviewError}
                        </div>
                      ) : null}

                      {reviewSuccess ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          {reviewSuccess}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={!canSubmitReview || reviewSubmitting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A3E1D] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {reviewSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Posting review...
                          </>
                        ) : (
                          <>
                            Submit review
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default CompanyDetailsPage;
