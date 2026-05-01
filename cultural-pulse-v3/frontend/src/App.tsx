import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DecodeProvider } from "@/state/DecodeContext";
import { AppHeader } from "@/components/AppHeader";
import { LiveTicker } from "@/components/LiveTicker";
import { ContextSidebar } from "@/components/ContextSidebar";
import Radar from "./pages/Radar";
import Intelligence from "./pages/Intelligence";
import Strategist from "./pages/Strategist";
import Safety from "./pages/Safety";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DecodeProvider>
          <div className="min-h-screen flex flex-col">
            <AppHeader/>
            <div className="flex-1 flex">
              <ContextSidebar/>
              <div className="flex-1 flex flex-col min-w-0">
                <Routes>
                  <Route path="/" element={<Radar />} />
                  <Route path="/intelligence" element={<Intelligence />} />
                  <Route path="/strategist" element={<Strategist />} />
                  <Route path="/safety" element={<Safety />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
            <LiveTicker/>
          </div>
        </DecodeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
