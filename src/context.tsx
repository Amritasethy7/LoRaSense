import { createContext, useContext, useState, type ReactNode } from 'react';
import type { SimConfig, SimResult } from '@/types';
import { runSimulation } from '@/simulation/engine';

export type PageId = 'dashboard' | 'simulation' | 'topology' | 'comparison' | 'results' | 'about';

interface AppContextType {
  currentPage: PageId;
  setCurrentPage: (p: PageId) => void;
  config: SimConfig;
  setConfig: (c: SimConfig) => void;
  result: SimResult | null;
  runSim: () => void;
  resetSim: () => void;
  hasRun: boolean;
}

const defaultConfig: SimConfig = {
  // numDevices: 200,
  numDevices: 30,
  numGateways: 1,
  numChannels: 8,
  trafficLoad: 'Medium',
  // durationSec: 60,
  durationSec: 10,
  spreadingFactor: 10,
  algorithm: 'CADS',
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [config, setConfig] = useState<SimConfig>(defaultConfig);
  const [result, setResult] = useState<SimResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const runSim = () => {
    setResult(runSimulation(config));
    setHasRun(true);
  };

  const resetSim = () => {
    setConfig(defaultConfig);
    setResult(null);
    setHasRun(false);
  };

  return (
    <AppContext.Provider value={{ currentPage, setCurrentPage, config, setConfig, result, runSim, resetSim, hasRun }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
