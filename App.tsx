import React, { useState, useEffect } from 'react';
import { Plant, PopulationStats } from './types';
import {
  createInitialPopulation, breedNextGeneration, calculateStats
} from './utils/geneticsEngine';
import { INITIAL_ENV_VARIANCE, POPULATION_SIZE, SELECTION_TYPES } from './constants';
import GenomeVisualizer from './components/GenomeVisualizer';
import StatsPanel from './components/StatsPanel';
import Scene3D from './components/Scene3D';
import EducationModal from './components/EducationModal';
import SelectionDistributionChart from './components/SelectionDistributionChart';
import { getGeneticistAnalysis, generateScenario, setApiKey, isApiConfigured } from './services/geminiService';
import { Dna, Activity, Sprout, ArrowRight, Target, Shield, Ruler, Zap, Key, ExternalLink, CloudRain, Sun, Cloud, RotateCcw, BookOpen, Layers, Info } from 'lucide-react';

const App: React.FC = () => {
  // Core State
  const [generation, setGeneration] = useState<number>(1);
  const [population, setPopulation] = useState<Plant[]>([]);
  const [history, setHistory] = useState<PopulationStats[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionIntensity, setSelectionIntensity] = useState<number>(0.2);
  const [envVariance, setEnvVariance] = useState<number>(INITIAL_ENV_VARIANCE);
  const [genomicSelectionEnabled, setGenomicSelectionEnabled] = useState<boolean>(false);
  const [analysisMsg, setAnalysisMsg] = useState<string>("Initialize the field to begin.");
  const [scenario, setScenario] = useState<string>("Normal Conditions");
  const [lastSelectedPlant, setLastSelectedPlant] = useState<Plant | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Weather based on environmental variance
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'rainy'>('sunny');

  // UI State
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [apiKey, setApiKeyState] = useState<string>('');
  const [showApiInput, setShowApiInput] = useState<boolean>(false);
  const [apiConfigured, setApiConfigured] = useState<boolean>(isApiConfigured());
  const [showCrossInfo, setShowCrossInfo] = useState<boolean>(false);

  // Initialize
  useEffect(() => {
    const initPop = createInitialPopulation(envVariance);
    setPopulation(initPop);
    const initialStats = calculateStats(initPop, 1);
    setHistory([initialStats]);
    setAnalysisMsg("Welcome, Breeder! F0 population initialized. High genetic variance (σ²G) present. Use GEBV view to see true breeding values. Select parents carefully considering trait linkages.");
    setWeather('sunny');
  }, []);

  // Update weather based on environmental variance
  useEffect(() => {
    if (envVariance < 1.5) setWeather('sunny');
    else if (envVariance < 2.5) setWeather('cloudy');
    else setWeather('rainy');
  }, [envVariance]);

  // Plant click handler
  const handlePlantClick = (id: string) => {
    const plant = population.find(p => p.id === id);
    if (plant) setLastSelectedPlant(plant);

    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Auto-select functions
  const autoSelectByTrait = (trait: 'yield' | 'resistance' | 'height' | 'optimum') => {
    const count = Math.ceil(POPULATION_SIZE * selectionIntensity);

    let sorted: Plant[];

    if (trait === 'optimum') {
      // Selection index: weighted combination of traits (Smith-Hazel style)
      sorted = [...population].sort((a, b) => {
        const getValue = (p: Plant) => {
          if (genomicSelectionEnabled) {
            // Use GEBV
            return p.breedingValue.yield * 0.5 + p.breedingValue.resistance * 0.3 + (p.breedingValue.height / 3) * 0.2;
          }
          // Use phenotype
          return p.phenotype.yield * 0.5 + p.phenotype.resistance * 0.3 + (p.phenotype.height / 3) * 0.2;
        };
        return getValue(b) - getValue(a);
      });
    } else if (trait === 'height') {
      // Dwarf selection - lower height preferred (semi-dwarf varieties)
      const getValue = (p: Plant) => genomicSelectionEnabled ? p.breedingValue.height : p.phenotype.height;
      sorted = [...population].sort((a, b) => getValue(a) - getValue(b));
    } else {
      // Higher is better for yield and resistance
      const getValue = (p: Plant) => genomicSelectionEnabled ? p.breedingValue[trait] : p.phenotype[trait];
      sorted = [...population].sort((a, b) => getValue(b) - getValue(a));
    }

    const topIds = new Set(sorted.slice(0, count).map(p => p.id));
    setSelectedIds(topIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedPlant(null);
  };

  // Advance Generation (Breeding cycle)
  const advanceGeneration = async () => {
    if (selectedIds.size < 2) {
      alert("Select at least 2 parents to breed! Use Auto-Select buttons below.");
      return;
    }

    setIsProcessing(true);
    setShowCrossInfo(true);

    try {
      const parents = population.filter(p => selectedIds.has(p.id));

      // Generate environmental scenario
      const newScenario = await generateScenario(generation + 1);
      setScenario(newScenario.description);
      const newEnvVar = newScenario.envImpact;

      // Simulate crossing and create offspring
      const nextGen = breedNextGeneration(parents, generation, newEnvVar);

      // Calculate population statistics
      const stats = calculateStats(nextGen, generation + 1);

      // Update state
      setPopulation(nextGen);
      setHistory(prev => [...prev, stats]);
      setGeneration(prev => prev + 1);
      setEnvVariance(newEnvVar);
      setSelectedIds(new Set());
      setLastSelectedPlant(null);

      // Get genetic analysis
      const analysis = await getGeneticistAnalysis([...history, stats], generation + 1);
      setAnalysisMsg(analysis);

      setTimeout(() => setShowCrossInfo(false), 2000);
    } catch (e) {
      console.error(e);
      setAnalysisMsg("Analysis unavailable. Continue with phenotypic selection.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset simulation
  const resetSimulation = () => {
    const initPop = createInitialPopulation(INITIAL_ENV_VARIANCE);
    setPopulation(initPop);
    const initialStats = calculateStats(initPop, 1);
    setHistory([initialStats]);
    setGeneration(1);
    setEnvVariance(INITIAL_ENV_VARIANCE);
    setSelectedIds(new Set());
    setLastSelectedPlant(null);
    setScenario("Normal Conditions");
    setAnalysisMsg("Simulation reset. New F0 population created with high genetic diversity.");
    setWeather('sunny');
  };

  // API key handler
  const handleApiKeySubmit = () => {
    if (setApiKey(apiKey)) {
      setApiConfigured(true);
      setShowApiInput(false);
      setAnalysisMsg("✓ API connected! AI-powered genetic analysis is now active.");
    } else {
      alert("Invalid API key format.");
    }
  };

  const currentStats = history.length > 0 ? history[history.length - 1] : null;
  const selectedParents = population.filter(p => selectedIds.has(p.id));

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">

      <EducationModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      {/* Crossing Animation Overlay */}
      {showCrossInfo && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <Dna size={64} className="mx-auto text-purple-400 mb-4" />
            <p className="text-2xl font-bold text-white mb-2">🧬 Meiosis & Crossing Over 🧬</p>
            <p className="text-purple-300">Creating F{generation + 1} offspring...</p>
            <p className="text-gray-400 text-sm mt-2">Recombination • Segregation • Fertilization</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col z-20 shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center gap-2 text-green-500">
            <Sprout size={20} />
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">CornBreeder</h1>
              <p className="text-[9px] text-gray-500 font-mono">Genomic Selection Simulator v3.1</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={resetSimulation} className="text-gray-400 hover:text-yellow-400 transition-colors p-1" title="Reset">
              <RotateCcw size={16} />
            </button>
            <button onClick={() => setIsManualOpen(true)} className="text-gray-400 hover:text-white transition-colors p-1" title="Manual">
              <BookOpen size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">

          {/* Status Panel */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="bg-gray-900/50 rounded p-2">
                <span className="text-gray-500 uppercase font-bold text-[10px]">Generation</span>
                <p className="text-xl font-mono text-white">F{generation}</p>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <span className="text-gray-500 uppercase font-bold text-[10px]">Population</span>
                <p className="text-xl font-mono text-white">{POPULATION_SIZE}</p>
              </div>
            </div>

            {/* Current Means */}
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div className="text-center bg-green-900/30 rounded py-1">
                <p className="text-green-400 font-bold">μ Yield</p>
                <p className="text-white font-mono">{currentStats?.meanYield.toFixed(1) || '0'}</p>
              </div>
              <div className="text-center bg-yellow-900/30 rounded py-1">
                <p className="text-yellow-400 font-bold">μ Resist</p>
                <p className="text-white font-mono">{currentStats?.meanResistance.toFixed(1) || '0'}</p>
              </div>
              <div className="text-center bg-blue-900/30 rounded py-1">
                <p className="text-blue-400 font-bold">μ Height</p>
                <p className="text-white font-mono">{currentStats?.meanHeight.toFixed(1) || '0'}</p>
              </div>
            </div>

            {/* Environment */}
            <div className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-between">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold">Environment</span>
                <p className="text-yellow-500 text-xs flex items-center gap-1">
                  {weather === 'sunny' && <Sun size={12} />}
                  {weather === 'cloudy' && <Cloud size={12} />}
                  {weather === 'rainy' && <CloudRain size={12} />}
                  {scenario}
                </p>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-[10px]">σ²E</span>
                <p className="text-orange-400 font-mono text-xs">{envVariance.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* API Key (Optional) */}
          {!apiConfigured && (
            <div className="bg-purple-900/20 border border-purple-700/50 p-2 rounded-lg text-xs">
              <div className="flex items-center justify-between">
                <span className="text-purple-400 font-bold flex items-center gap-1">
                  <Key size={12} /> AI Analysis
                </span>
                <button onClick={() => setShowApiInput(!showApiInput)} className="text-purple-300 hover:text-white text-[10px]">
                  {showApiInput ? 'Hide' : 'Enable'}
                </button>
              </div>
              {showApiInput && (
                <div className="mt-2 space-y-1">
                  <input
                    type="password"
                    placeholder="Gemini API Key"
                    value={apiKey}
                    onChange={(e) => setApiKeyState(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-[10px]"
                  />
                  <div className="flex gap-1">
                    <button onClick={handleApiKeySubmit} className="flex-1 bg-purple-700 hover:bg-purple-600 text-white text-[10px] py-1 rounded">
                      Connect
                    </button>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-purple-300 hover:text-white text-[10px] px-2">
                      <ExternalLink size={10} /> Get
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Distribution Chart */}
          <div className="h-28 bg-gray-800/30 rounded-lg p-1.5 border border-gray-700">
            <SelectionDistributionChart population={population} selectedIds={selectedIds} />
          </div>

          {/* Selection Controls */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 mb-1 flex justify-between">
                <span>Selection Intensity (i)</span>
                <span className="text-white">{Math.round(selectionIntensity * 100)}% ({Math.ceil(POPULATION_SIZE * selectionIntensity)} plants)</span>
              </label>
              <input
                type="range" min="0.05" max="0.5" step="0.05" value={selectionIntensity}
                onChange={(e) => setSelectionIntensity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
            </div>

            {/* GEBV Toggle */}
            <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-gray-700">
              <span className="text-[10px] text-gray-300 font-semibold flex items-center gap-1">
                <Layers size={12} /> Genomic Selection (GEBV)
              </span>
              <button
                onClick={() => setGenomicSelectionEnabled(!genomicSelectionEnabled)}
                className={`w-8 h-4 rounded-full p-0.5 transition-colors ${genomicSelectionEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${genomicSelectionEnabled ? 'translate-x-4' : ''}`}></div>
              </button>
            </div>

            {/* Auto-Select Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Auto-Select Best</p>
                <button onClick={clearSelection} className="text-[9px] text-gray-500 hover:text-red-400">Clear</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => autoSelectByTrait('yield')}
                  className="py-1.5 px-2 bg-green-800/40 hover:bg-green-700/50 text-white text-[10px] font-semibold rounded border border-green-600/30 flex items-center justify-center gap-1"
                >
                  <Target size={11} /> High Yield
                </button>
                <button
                  onClick={() => autoSelectByTrait('resistance')}
                  className="py-1.5 px-2 bg-yellow-800/40 hover:bg-yellow-700/50 text-white text-[10px] font-semibold rounded border border-yellow-600/30 flex items-center justify-center gap-1"
                >
                  <Shield size={11} /> Disease Resist
                </button>
                <button
                  onClick={() => autoSelectByTrait('height')}
                  className="py-1.5 px-2 bg-blue-800/40 hover:bg-blue-700/50 text-white text-[10px] font-semibold rounded border border-blue-600/30 flex items-center justify-center gap-1"
                >
                  <Ruler size={11} /> Dwarf (Short)
                </button>
                <button
                  onClick={() => autoSelectByTrait('optimum')}
                  className="py-1.5 px-2 bg-purple-800/40 hover:bg-purple-700/50 text-white text-[10px] font-semibold rounded border border-purple-600/30 flex items-center justify-center gap-1"
                >
                  <Zap size={11} /> Index (Balanced)
                </button>
              </div>
            </div>
          </div>

          {/* Selected Parents Preview */}
          {selectedIds.size > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-2 border border-green-700/30">
              <p className="text-[10px] text-green-400 font-bold mb-1">Selected Parents ({selectedIds.size})</p>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                {selectedParents.slice(0, 8).map(p => (
                  <span key={p.id} className="text-[8px] bg-green-900/50 px-1 py-0.5 rounded font-mono">
                    {p.id.slice(-5)}
                  </span>
                ))}
                {selectedIds.size > 8 && <span className="text-[8px] text-gray-500">+{selectedIds.size - 8} more</span>}
              </div>
            </div>
          )}

          {/* AI Professor's Note */}
          <div className="bg-blue-900/15 border border-blue-800/50 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-blue-400 mb-1">
              <Activity size={12} />
              <h3 className="text-[10px] font-bold uppercase">Geneticist's Analysis</h3>
              {!apiConfigured && <span className="text-[8px] text-gray-500">(Offline)</span>}
            </div>
            <p className="text-[10px] text-gray-300 leading-relaxed italic">
              "{analysisMsg}"
            </p>
          </div>

          {/* Scientific Info Box */}
          <div className="bg-gray-800/30 border border-gray-700 p-2 rounded text-[9px] text-gray-400">
            <p className="font-bold text-gray-300 flex items-center gap-1 mb-1"><Info size={10} /> Breeding Equation</p>
            <p>R = h² × S (Response = Heritability × Selection Differential)</p>
            <p>ΔG = i × h × σG (Genetic Gain per generation)</p>
          </div>
        </div>

        {/* Breed Button */}
        <div className="p-3 border-t border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex justify-between items-center mb-1.5 text-[10px] text-gray-500 font-mono">
            <span>Parents: {selectedIds.size}</span>
            <span>Min: 2</span>
          </div>
          <button
            onClick={advanceGeneration}
            disabled={isProcessing || selectedIds.size < 2}
            className="w-full py-2.5 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 disabled:from-gray-800 disabled:to-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            {isProcessing ? '🧬 Crossing...' : `Breed F${generation + 1}`}
            {!isProcessing && <ArrowRight size={16} />}
          </button>
        </div>
      </aside>

      {/* Main 3D View */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* 3D Field */}
          <div className="flex-1 relative">
            <Scene3D
              population={population}
              selectedIds={selectedIds}
              onPlantClick={handlePlantClick}
              showGenetics={genomicSelectionEnabled}
              weather={weather}
            />
          </div>

          {/* Right Panel - Genome & Stats */}
          <div className="w-72 border-l border-gray-800 bg-gray-900 flex flex-col shadow-2xl z-20">

            {/* Genome Viewer */}
            <div className="flex-1 p-2 border-b border-gray-800 overflow-y-auto bg-gray-900/80">
              <div className="flex items-center gap-1 mb-1.5 text-gray-400">
                <Dna size={12} />
                <h2 className="text-[10px] font-bold uppercase tracking-wider">Diploid Genome Viewer</h2>
              </div>
              <GenomeVisualizer plant={lastSelectedPlant} />
            </div>

            {/* Stats Charts */}
            <div className="h-2/5 p-2 overflow-hidden flex flex-col bg-gray-900">
              <div className="flex items-center gap-1 mb-1 text-gray-400">
                <Activity size={12} />
                <h2 className="text-[10px] font-bold uppercase tracking-wider">Breeding Progress</h2>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <StatsPanel history={history} />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;