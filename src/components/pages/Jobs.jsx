import { useEffect, useMemo, useState } from "react";
import JobCard from "../features/JobCard";
import JobDetails from "../features/JobDetails";
import SearchBar from "../features/SearchBar";
import { getAllJobs, getJobDetails } from "../../utilities/api/jobsApi";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ keyword: "", location: "" });
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [apiMessage, setApiMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadJobs = async () => {
      setIsLoadingJobs(true);
      setApiMessage("");

      try {
        const apiJobs = await getAllJobs();

        if (!isActive) {
          return;
        }

        if (apiJobs.length > 0) {
          setJobs(apiJobs);
          setSelectedJobId(apiJobs[0].id);
        } else {
          setJobs([]);
          setSelectedJobId(null);
          setApiMessage("No jobs available.");
        }
      } catch {
        if (!isActive) {
          return;
        }

        setApiMessage("Could not load jobs from the API.");
      } finally {
        if (isActive) {
          setIsLoadingJobs(false);
        }
      }
    };

    loadJobs();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const location = filters.location.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesKeyword =
        !keyword ||
        job.title.toLowerCase().includes(keyword) ||
        job.company.toLowerCase().includes(keyword);

      const matchesLocation =
        !location || job.location.toLowerCase().includes(location);

      return matchesKeyword && matchesLocation;
    });
  }, [filters, jobs]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId(null);
      return;
    }

    const stillSelected = filteredJobs.some((job) => job.id === selectedJobId);
    if (!stillSelected) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob =
    filteredJobs.find((job) => job.id === selectedJobId) ?? filteredJobs[0] ?? null;

  useEffect(() => {
    let isActive = true;

    const loadJobDetails = async () => {
      if (!selectedJobId) {
        return;
      }

      setIsLoadingDetails(true);

      try {
        const details = await getJobDetails(selectedJobId);

        if (!isActive || !details) {
          return;
        }

        setJobs((previousJobs) =>
          previousJobs.map((job) =>
            job.id === selectedJobId
              ? {
                  ...job,
                  ...details,
                  description:
                    details.description?.length > 0
                      ? details.description
                      : job.description,
                }
              : job,
          ),
        );
      } catch {
        // Keep list item data when details endpoint fails.
      } finally {
        if (isActive) {
          setIsLoadingDetails(false);
        }
      }
    };

    loadJobDetails();

    return () => {
      isActive = false;
    };
  }, [selectedJobId]);

  const resultLabel = filteredJobs.length === 1 ? "role" : "roles";

  const handleJobUpdated = (updatedJob) => {
    if (!updatedJob?.id) return;
    setJobs((previousJobs) =>
      previousJobs.map((job) =>
        String(job.id) === String(updatedJob.id) ? { ...job, ...updatedJob } : job,
      ),
    );
  };

  const roleRaw =
    localStorage.getItem("userType") || localStorage.getItem("role") || "";
  const isEmployerViewer =
    String(roleRaw).toLowerCase().includes("employer") ||
    String(roleRaw).toLowerCase().includes("company") ||
    localStorage.getItem("isAdmin") === "true";

  return (
    <main className="w-full bg-[#FBFBFB] border-b border-[#4242425C]/20">
      <section className="mx-auto w-full max-w-340 px-4 pb-10 pt-8 md:px-8">
        <div className="mb-8 rounded-[2rem] border border-[#E5E5E5] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-sm uppercase tracking-[0.24em] text-[#7C7C7C]">
                {isEmployerViewer ? "HORAI Labs hiring desk" : "Careers at HORAI Labs"}
              </p>
              <h1 className="text-3xl font-poppins-semibold leading-tight text-[#141414] sm:text-4xl">
                {isEmployerViewer
                  ? "Manage open roles across your teams."
                  : "Open roles across HORAI Labs teams."}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6B6B6B] sm:text-base">
                {isEmployerViewer
                  ? "Edit postings for Engineering, Product, Design, and more. Candidates always see the latest details."
                  : "One company, many departments. Find a role that fits your skills and apply to join HORAI Labs."}
              </p>
            </div>

            <div className="rounded-[1.75rem] bg-[#F3F6FA] px-5 py-4 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#5F5F5F]">Open listings</p>
              <p className="mt-2 text-3xl font-poppins-semibold text-[#141414]">{jobs.length}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[1.75rem] border border-[#E5E5E5] bg-white p-4 shadow-sm sm:p-6">
          <SearchBar filters={filters} onFiltersChange={setFilters} />
        </div>

        {apiMessage && (
          <p className="mb-4 rounded-2xl border border-[#F4D5C7] bg-[#FFF6F2] px-4 py-3 text-sm text-[#A85A35]">
            {apiMessage}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-[#E5E5E5] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5F5F5F]">Open roles</p>
                  <p className="mt-1 text-sm text-[#7A7A7A]">
                    {filteredJobs.length} {resultLabel} found
                  </p>
                </div>
                <span className="rounded-full bg-[#EEF3FB] px-3 py-1 text-xs font-semibold text-[#3C5AA6]">
                  {selectedJob ? selectedJob.company : "Search"}
                </span>
              </div>
              {isLoadingJobs ? (
                <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-5 text-sm text-[#6F6F6F]">
                  Loading jobs...
                </div>
              ) : filteredJobs.length > 0 ? (
                <div className="divide-y divide-[#E5E5E5]">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSelected={job.id === selectedJob?.id}
                      onClick={() => setSelectedJobId(job.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-6 text-sm text-[#6F6F6F]">
                  No jobs match your current search. Update your filters or try a broader keyword.
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-4">
            {selectedJob ? (
              <div className="rounded-[1.75rem] border border-[#E5E5E5] bg-white p-6 shadow-sm">
                {isLoadingDetails && (
                  <p className="mb-4 text-sm text-[#7A7A7A]">Refreshing job details...</p>
                )}
                <JobDetails job={selectedJob} onJobUpdated={handleJobUpdated} />
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-[#E5E5E5] bg-white p-8 text-[#6F6F6F] shadow-sm">
                <p className="text-base font-semibold text-[#141414]">Select a role to view the full description.</p>
                <p className="mt-2 text-sm leading-6 text-[#7A7A7A]">
                  Browse the list of positions and choose a card to see responsibilities, benefits, and the interview path.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};

export default Jobs;
