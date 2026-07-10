import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Star, Globe, Building2, Search, Users } from "lucide-react";
import { getAllCompanies } from "../../utilities/api/companiesApi";

// ── helpers ───────────────────────────────────────────────────────────────
const normalizeCompany = (raw = {}) => ({
  id:            raw.id          ?? raw.companyId    ?? String(Math.random()),
  companyName:   raw.companyName ?? raw.name         ?? "Unnamed Company",
  industry:      raw.industry    ?? "—",
  description:   raw.description ?? "",
  website:       raw.website     ?? raw.Website      ?? "",
  averageRating: raw.averageRating ?? raw.AverageRating ?? 0,
  reviewCount:   raw.reviewCount   ?? raw.ReviewCount   ?? 0,
  logoUrl:       raw.logoUrl     ?? raw.logo          ?? null,
});

const StarRating = ({ value }) => {
  return (
    <div className="flex items-center gap-1 bg-[#FFF2EA] px-2.5 py-1 rounded-lg border border-[#F1DED3]">
      <Star className="w-3.5 h-3.5 fill-[#D3571F] text-[#D3571F]" />
      <span className="text-xs font-poppins-semibold text-[#1a1a1a]">
        {value > 0 ? `${Number(value).toFixed(1)}/5` : "—/5"}
      </span>
    </div>
  );
};

const CompanyCard = ({ company }) => {
  const initials = company.companyName.slice(0, 2).toUpperCase();
  return (
    <Link
      to={`/companies/${company.id}`}
      state={{ company }}
      className="bg-white border border-[#4242425C]/20 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer block"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {company.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.companyName}
            className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 bg-[#FFECE3] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-poppins-bold text-[#D3571F]">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-poppins-semibold text-[#1a1a1a] text-[15px] leading-snug truncate group-hover:text-[#D3571F] transition-colors">
            {company.companyName}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-poppins text-gray-500 truncate">{company.industry}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {company.description ? (
        <p className="text-[13px] font-poppins text-[#4a4a4a] line-clamp-2 leading-relaxed h-9">
          {company.description}
        </p>
      ) : (
        <p className="text-[13px] font-poppins text-gray-400 italic line-clamp-2 leading-relaxed h-9">
          No description available.
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#4242425C]/10 mt-auto">
        <div className="flex flex-col gap-1 items-start">
          <StarRating value={company.averageRating} />
          {company.reviewCount > 0 ? (
            <span className="text-[11px] font-poppins text-gray-400">
              {company.reviewCount} {company.reviewCount === 1 ? "review" : "reviews"}
            </span>
          ) : (
            <span className="text-[11px] font-poppins text-gray-400">No reviews</span>
          )}
        </div>
        {company.website ? (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-poppins-medium text-[#D3571F] hover:text-[#B8461A] transition-colors bg-[#FFECE3] hover:bg-[#FFDFCE] px-3 py-1.5 rounded-lg"
          >
            <Globe className="w-3.5 h-3.5" />
            Website
          </a>
        ) : (
          <span className="text-xs font-poppins text-gray-300">No website</span>
        )}
      </div>
    </Link>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [apiMsg, setApiMsg]       = useState("");
  const [search, setSearch]       = useState("");
  const [industry, setIndustry]   = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const raw = await getAllCompanies();
        if (!active) return;
        if (raw.length > 0) setCompanies(raw.map(normalizeCompany));
        else setApiMsg("No companies found yet.");
      } catch {
        if (!active) return;
        setApiMsg("Could not load companies from API.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const industries = useMemo(() => {
    const set = new Set(companies.map((c) => c.industry).filter((i) => i && i !== "—"));
    return [...set].sort();
  }, [companies]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return companies.filter((c) => {
      const matchesKw = !kw || c.companyName.toLowerCase().includes(kw) || c.industry.toLowerCase().includes(kw) || c.description.toLowerCase().includes(kw);
      const matchesIndustry = !industry || c.industry === industry;
      return matchesKw && matchesIndustry;
    });
  }, [companies, search, industry]);

  return (
    <main className="w-full min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,214,195,0.35),transparent_40%),linear-gradient(180deg,#FFF9F5_0%,#FFFFFF_30%)] border-b border-[#4242425C]/20">
      {/* Hero */}
      <section className="w-full border-b border-[#4242425C]/20 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-poppins-bold text-[28px] md:text-[36px] text-[#1a1a1a] leading-tight">
            Explore Top Companies
          </h1>
          <p className="font-poppins text-[15px] text-[#5a5a5a] mt-3 max-w-lg mx-auto">
            Browse company profiles, see ratings, and discover what makes each employer unique before applying.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-10 bg-white/80 backdrop-blur-md border-b border-[#4242425C]/20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies by name, industry, or description..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm font-poppins placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/30 focus:border-[#D3571F]/50 transition-all bg-white"
            />
          </div>
          {/* Industry filter */}
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-gray-200 text-sm font-poppins text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#D3571F]/30 focus:border-[#D3571F]/50 bg-white min-w-[200px] cursor-pointer transition-all"
          >
            <option value="">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        {apiMsg && (
          <p className="mb-5 rounded-xl border border-[#F4D5C7] bg-[#FFF6F2] px-4 py-2.5 text-sm font-poppins text-[#A85A35]">
            {apiMsg}
          </p>
        )}

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-sm font-poppins text-gray-500">
            <Users className="w-4 h-4" />
            <span>
              {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "company" : "companies"} found`}
            </span>
          </div>
          {(search || industry) && (
            <button
              onClick={() => { setSearch(""); setIndustry(""); }}
              className="text-xs font-poppins-medium text-[#D3571F] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-[#FFECE3] border-t-[#D3571F] rounded-full animate-spin" />
            <p className="text-sm font-poppins text-gray-400">Loading companies…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mb-3" />
            <p className="font-poppins-semibold text-gray-400 text-sm">No companies found</p>
            <p className="font-poppins text-gray-300 text-xs mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Companies;
