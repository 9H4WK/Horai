import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "./components/pages/loginPage.jsx";
import RegisterPage from "./components/pages/registerPage.jsx";
import NotFoundPage from "./components/pages/NotFoundPage.jsx";
import Companies from "./components/pages/Companies.jsx";
import CompanyDetailsPage from "./components/pages/CompanyDetailsPage.jsx";
import Jobs from "./components/pages/Jobs.jsx";
import LandingPage from "./components/pages/LandingPage.jsx";
import AdminDashboard from "./components/pages/AdminDashboard.jsx";
import ProfilePage from "./components/pages/ProfilePage.jsx";
import ForEmployersPage from "./components/pages/ForEmployersPage.jsx";
import ForgotPasswordPage from "./components/pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./components/pages/ResetPasswordPage.jsx";
import MyApplicationsPage from "./components/pages/MyApplicationsPage.jsx";
import InterviewSessionPage from "./components/pages/InterviewSessionPage.jsx";
import InterviewResultsPage from "./components/pages/InterviewResultsPage.jsx";
import InterviewDisclaimerPage from "./components/pages/InterviewDisclaimerPage.jsx";
import ApplicationDetailsPage from "./components/pages/ApplicationDetailsPage.jsx";
import EmployerApplicationsPage from "./components/pages/EmployerApplicationsPage.jsx";
import EmployerApplicationReviewPage from "./components/pages/EmployerApplicationReviewPage.jsx";
import EmailConfirmedPage from "./components/pages/EmailConfirmedPage.jsx";
import RequireAuth from "./components/common/RequireAuth.jsx";
import RequireEmployer from "./components/common/RequireEmployer.jsx";
import "./index.css";
import App from "./App.jsx";
import { ApplicationProvider } from "./contexts/ApplicationContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "jobs",
        element: <Jobs />,
      },
      {
        path: "companies",
        element: <Companies />,
      },
      {
        path: "companies/:companyId",
        element: <CompanyDetailsPage />,
      },
      {
        path: "for-employers",
        element: <ForEmployersPage />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "applications",
            element: <MyApplicationsPage />,
          },
          {
            path: "applications/:applicationId",
            element: <ApplicationDetailsPage />,
          },
          {
            path: "interview/:applicationId/disclaimer",
            element: <InterviewDisclaimerPage />,
          },
          {
            path: "interview/:applicationId",
            element: <InterviewSessionPage />,
          },
          {
            path: "interview-results/:sessionId",
            element: <InterviewResultsPage />,
          },
          {
            path: "email-confirmed",
            element: <EmailConfirmedPage />,
          },
        ],
      },
      {
        element: <RequireEmployer />,
        children: [
          {
            path: "employer/applications",
            element: <EmployerApplicationsPage />,
          },
          {
            path: "employer/applications/:applicationId",
            element: <EmployerApplicationReviewPage />,
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/admin",
    element: <AdminDashboard />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ApplicationProvider>
      <RouterProvider router={router} />
    </ApplicationProvider>
  </StrictMode>,
);
