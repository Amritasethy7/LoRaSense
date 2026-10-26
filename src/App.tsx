import { AppProvider, useApp } from '@/context';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import SimulationSetup from '@/pages/SimulationSetup';
import Topology from '@/pages/Topology';
import AlgorithmComparison from '@/pages/AlgorithmComparison';
import ResearchResults from '@/pages/ResearchResults';
import AboutProject from '@/pages/AboutProject';

function MainContent() {
  const { currentPage } = useApp();

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      {/* Top bar */}
      <header className="h-16 sticky top-0 z-20 bg-navy-900/80 backdrop-blur-md border-b border-navy-700 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-accent-cyan font-mono">LoRaSense</span>
            <span>/</span>
            <span className="text-slate-300 capitalize">{currentPage.replace('-', ' ')}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span>Engine Online</span>
          </div>
          <div className="text-xs text-slate-600 font-mono hidden lg:block">
            Collision-Aware MAC Scheduling · LoRaWAN
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="p-6 max-w-[1600px] mx-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'simulation' && <SimulationSetup />}
        {currentPage === 'topology' && <Topology />}
        {currentPage === 'comparison' && <AlgorithmComparison />}
        {currentPage === 'results' && <ResearchResults />}
        {currentPage === 'about' && <AboutProject />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <div className="flex min-h-screen bg-navy-950 text-slate-200">
        <Sidebar />
        <MainContent />
      </div>
    </AppProvider>
  );
}

export default App;
