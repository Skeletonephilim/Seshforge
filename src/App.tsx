import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import WriteupGeneratorPage from "@/pages/WriteupGeneratorPage";
import PTESMethodologyPage from "@/pages/PTESMethodologyPage";
import CommandDrillPage from "@/pages/CommandDrillPage";
import PT1ExamSimulatorPage from "@/pages/PT1ExamSimulatorPage";
import PT1ExamConfigPage from "@/pages/PT1ExamConfigPage";
import PT1RatingPage from "@/pages/PT1RatingPage";
import PT1MicroSimulationsPage from "@/pages/PT1MicroSimulationsPage";
import PT1WebExamPage from "@/pages/PT1WebExamPage";
import PT1ADExamPage from "@/pages/PT1ADExamPage";
import WirelessPentestPage from "@/pages/WirelessPentestPage";
import DecisionEnginePage from "@/pages/DecisionEnginePage";
import SEC1ExamPage from "@/pages/SEC1ExamPage";
import SEC1ExamResultsPage from "@/pages/SEC1ExamResultsPage";
import BoxModePage from "@/pages/BoxModePage";
import CasefileModePage from "@/pages/CasefileModePage";
import FailureLearningPage from "@/pages/FailureLearningPage";
import ProfilePage from "@/pages/ProfilePage";
import TrainingPlanPage from "@/pages/TrainingPlanPage";
import LiveCommandAnalysisPage from "@/pages/LiveCommandAnalysisPage";
import JsonParsingTestPage from "@/pages/JsonParsingTestPage";
import AnalyticsDashboardPage from "@/pages/AnalyticsDashboardPage";
import SupportPage from "@/pages/SupportPage";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="writeup-generator" element={<WriteupGeneratorPage />} />
            <Route path="ptes-methodology" element={<PTESMethodologyPage />} />
            <Route path="command-drills" element={<CommandDrillPage />} />
            <Route path="pt1-exam-config" element={<PT1ExamConfigPage />} />
            <Route path="pt1-exam" element={<PT1ExamSimulatorPage />} />
            <Route path="pt1-rating" element={<PT1RatingPage />} />
            <Route path="pt1-micro-sims" element={<PT1MicroSimulationsPage />} />
            <Route path="pt1-web-exam" element={<PT1WebExamPage />} />
            <Route path="pt1-ad-exam" element={<PT1ADExamPage />} />
            <Route path="wireless-pentest" element={<WirelessPentestPage />} />
            <Route path="decision-engine" element={<DecisionEnginePage />} />
            <Route path="sec1-exam" element={<SEC1ExamPage />} />
            <Route path="sec1-exam-results" element={<SEC1ExamResultsPage />} />
            <Route path="box-mode" element={<BoxModePage />} />
            <Route path="casefile-mode" element={<CasefileModePage />} />
            <Route path="failure-learning" element={<FailureLearningPage />} />
            <Route path="live-analysis" element={<LiveCommandAnalysisPage />} />
            <Route path="analytics" element={<AnalyticsDashboardPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="test-json-parsing" element={<JsonParsingTestPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="training-plan" element={<TrainingPlanPage />} />
            <Route path="modules" element={<Navigate to="/" replace />} />
            <Route path="drills" element={<Navigate to="/pt1-micro-sims" replace />} />
            <Route path="labs" element={<Navigate to="/pt1-exam" replace />} />
            <Route path="progress" element={<Navigate to="/" replace />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
