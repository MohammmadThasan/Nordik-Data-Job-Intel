import React, { useState, useEffect, useRef } from 'react';
import { JobAlert } from './types';
import { scanJobs } from './services/geminiService';
import JobCard from './components/JobCard';

const App: React.FC = () => {
  const [jobs, setJobs] = useState<JobAlert[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'analyze'>('feed');
  const [analyzeText, setAnalyzeText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('sv-SE', { hour12: false });
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const mergeAndSortJobs = (newJobs: JobAlert[], currentJobs: JobAlert[]) => {
    const allJobs = [...newJobs, ...currentJobs];
    // Sort logic: 1. Newest publish date (DESC), 2. Match score (DESC)
    return allJobs.sort((a, b) => {
      const dateA = new Date(a.publish_date_utc).getTime();
      const dateB = new Date(b.publish_date_utc).getTime();
      if (dateA !== dateB) {
        return dateB - dateA; // Newer jobs first
      }
      return b.match_score - a.match_score; // Higher score second
    });
  };

  const handleSimulateScan = async () => {
    if (!process.env.API_KEY) {
      alert("Please set your API_KEY in the environment variables.");
      return;
    }
    
    setIsScanning(true);
    addLog("Initiating market scan for current month...");
    addLog("Targeting sources: Platsbanken, LinkedIn, Indeed...");
    
    try {
      const results = await scanJobs('SIMULATE');
      
      if (results.length > 0) {
        setJobs(prev => mergeAndSortJobs(results, prev));
        addLog(`Scan complete. Discovered ${results.length} valid matches from current month.`);
      } else {
        addLog("Scan complete. No matches found within current month window.");
      }
    } catch (error) {
      addLog(`ERR: Scan failed. ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!analyzeText.trim()) return;
    
    setIsScanning(true);
    addLog("Analyzing raw job description...");
    
    try {
      const results = await scanJobs('ANALYZE', analyzeText);
      if (results.length > 0) {
        setJobs(prev => mergeAndSortJobs(results, prev));
        addLog(`Analysis complete. Role qualified with score ${results[0].match_score}.`);
        setAnalyzeText('');
        setActiveTab('feed');
      } else {
        addLog("Analysis complete. Role rejected (Score < 60 or Non-Sweden/Old).");
      }
    } catch (error) {
      addLog(`ERR: Analysis failed. ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">Nordic Data Intel</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Autonomous Agent // Sweden</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono text-emerald-500">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Stats */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Action Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Control Panel</h2>
            
            <div className="flex bg-slate-950 p-1 rounded-lg mb-6 border border-slate-800">
              <button 
                onClick={() => setActiveTab('feed')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'feed' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Live Monitor
              </button>
              <button 
                onClick={() => setActiveTab('analyze')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'analyze' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Analyze Text
              </button>
            </div>

            {activeTab === 'feed' ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Simulate a real-time scan of major Swedish job boards for the <strong>Current Month</strong>.
                </p>
                <button
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="flex items-center justify-center gap-2">
                    {isScanning ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        SCANNING...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        SCAN MARKET (Month)
                      </>
                    )}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                 <p className="text-sm text-slate-400">
                  Paste a raw job description below to test the agent's scoring and recency logic.
                </p>
                <textarea 
                  className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Paste Job Description here..."
                  value={analyzeText}
                  onChange={(e) => setAnalyzeText(e.target.value)}
                />
                <button
                  onClick={handleAnalyzeText}
                  disabled={isScanning || !analyzeText}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 border border-slate-700"
                >
                  {isScanning ? 'ANALYZING...' : 'PROCESS TEXT'}
                </button>
              </div>
            )}
          </div>

          {/* Terminal Logs */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-inner font-mono text-xs overflow-hidden flex flex-col h-64">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-900">
              <span className="text-slate-500 uppercase font-bold">System Log</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
              {logs.length === 0 && <span className="text-slate-600 opacity-50">Waiting for input...</span>}
              {logs.map((log, i) => (
                <div key={i} className="text-emerald-500/80">
                  <span className="opacity-50 mr-2">{'>'}</span>
                  {log}
                </div>
              ))}
              <div ref={scrollEndRef} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold text-white mb-1">{jobs.length}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Matches Found</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {jobs.filter(j => j.job_age_hours <= 24).length}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Fresh (&lt;24h)</div>
            </div>
          </div>

        </div>

        {/* Right Column: Feed */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-8 bg-blue-600 rounded-sm"></span>
              Intelligence Feed
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
               <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
               Live | Recency First
            </div>
          </div>

          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                   <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                   </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-300">No Jobs Detected</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">
                  Initialize a market scan or analyze a specific job description to populate the feed.
                </p>
              </div>
            ) : (
              jobs.map((job, index) => (
                <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <JobCard job={job} />
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;