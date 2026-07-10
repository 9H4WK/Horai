import React, { createContext, useContext, useEffect, useState } from "react";
import { getAllApplications } from "../utilities/api/interviewApi";

const ApplicationContext = createContext(null);

export const ApplicationProvider = ({ children }) => {
  const [applicationsMap, setApplicationsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isJobSeeker = () => {
    const role = localStorage.getItem("userType") || localStorage.getItem("role") || "";
    return role.toLowerCase().includes("jobseeker") || role.toLowerCase() === "seeker";
  };

  const load = async () => {
    if (!isJobSeeker()) {
      setApplicationsMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apps = await getAllApplications();
      const map = (apps || []).reduce((acc, item) => {
        const jobId = String(item.jobId || item.raw?.jobId || "");
        if (jobId) acc[jobId] = item;
        return acc;
      }, {});
      setApplicationsMap(map);
    } catch (err) {
      setError("Unable to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = () => load();

  return (
    <ApplicationContext.Provider value={{ applicationsMap, loading, error, refresh }}>
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplications = () => {
  const ctx = useContext(ApplicationContext);
  if (!ctx) {
    throw new Error("useApplications must be used inside ApplicationProvider");
  }
  return ctx;
};

export default ApplicationContext;
