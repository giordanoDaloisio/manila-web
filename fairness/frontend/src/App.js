import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import WizardPage from "@/pages/WizardPage";
import ResultsPage from "@/pages/ResultsPage";
import ComparePage from "@/pages/ComparePage";
import { WizardProvider } from "@/context/WizardContext";

function App() {
  return (
    <div className="App">
      <TooltipProvider delayDuration={150}>
        <BrowserRouter>
          <WizardProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new" element={<WizardPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/experiments/:id" element={<ResultsPage />} />
              </Route>
            </Routes>
          </WizardProvider>
        </BrowserRouter>
        <Toaster position="top-right" />
      </TooltipProvider>
    </div>
  );
}

export default App;
