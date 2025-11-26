import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Wifi, 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  Server as ServerIcon,
  Zap,
  Bot,
  Download
} from 'lucide-react';

import { SERVERS, PING_INTERVAL_MS, GRAPH_HISTORY_LENGTH } from './constants';
import { PingDataPoint, PingState, PingStats } from './types';
import { measurePing } from './services/pingService';
import { analyzeNetworkQuality } from './services/geminiService';
import PingChart from './components/PingChart';
import StatsCard from './components/StatsCard';

const App: React.FC = () => {
  // State
  const [pingState, setPingState] = useState<PingState>(PingState.IDLE);
  const [selectedServerId, setSelectedServerId] = useState<string>(SERVERS[0].id);
  const [pingHistory, setPingHistory] = useState<PingDataPoint[]>([]);
  const [currentPing, setCurrentPing] = useState<number | null>(null);
  const [stats, setStats] = useState<PingStats>({
    current: 0,
    min: 0,
    max: 0,
    avg: 0,
    jitter: 0,
    packetLoss: 0,
    totalPings: 0,
    failedPings: 0,
  });
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Refs for logic that doesn't need to trigger re-renders or to avoid closure staleness
  // Use 'any' to avoid NodeJS vs Window timer type conflicts
  const intervalRef = useRef<any>(null);
  const lastPingRef = useRef<number>(0);

  const selectedServer = SERVERS.find(s => s.id === selectedServerId) || SERVERS[0];

  // PWA Install Prompt Logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  // Logic: Measure Ping
  const executePing = useCallback(async () => {
    try {
      const ms = await measurePing(selectedServer.url);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
      
      setCurrentPing(ms);
      lastPingRef.current = ms;

      setStats(prev => {
        const newTotal = prev.totalPings + 1;
        const newMin = prev.min === 0 ? ms : Math.min(prev.min, ms);
        const newMax = Math.max(prev.max, ms);
        // Calculate Average iteratively
        const newAvg = Math.round(((prev.avg * prev.totalPings) + ms) / newTotal);
        // Calculate Jitter (approx deviation between consecutive pings)
        const jitter = prev.totalPings > 0 ? Math.abs(ms - lastPingRef.current) : 0;
        // Simple rolling average for jitter for display stability
        const newJitter = prev.totalPings > 0 
          ? Math.round((prev.jitter * 0.7) + (jitter * 0.3)) 
          : 0;

        return {
          ...prev,
          current: ms,
          min: newMin,
          max: newMax,
          avg: newAvg,
          jitter: newJitter,
          totalPings: newTotal,
          packetLoss: (prev.failedPings / newTotal) * 100
        };
      });

      setPingHistory(prev => {
        const newPoint = { id: Date.now(), time: timeStr, ms };
        const newHistory = [...prev, newPoint];
        if (newHistory.length > GRAPH_HISTORY_LENGTH) {
          return newHistory.slice(newHistory.length - GRAPH_HISTORY_LENGTH);
        }
        return newHistory;
      });

    } catch (error) {
      setStats(prev => {
        const newTotal = prev.totalPings + 1;
        const newFailed = prev.failedPings + 1;
        return {
          ...prev,
          totalPings: newTotal,
          failedPings: newFailed,
          packetLoss: (newFailed / newTotal) * 100
        };
      });
      
      // Handle logging gracefully to avoid console spam
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Filter out expected network/timeout errors from the error console
      if (
        errorMessage === 'Timeout' || 
        errorMessage === 'Network Error' ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('fetch')
      ) {
        // These are expected failures in a ping tool, log as debug only
        console.debug(`Ping info: ${errorMessage}`);
      } else {
        console.error("Ping failed:", error);
      }
    }
  }, [selectedServer.url]);

  // Logic: Start/Stop Timer
  useEffect(() => {
    if (pingState === PingState.RUNNING) {
      executePing(); // Initial ping
      intervalRef.current = setInterval(executePing, PING_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pingState, executePing]);

  const togglePing = () => {
    if (pingState === PingState.RUNNING) {
      setPingState(PingState.STOPPED);
    } else {
      // Reset if starting fresh from IDLE, but keep if STOPPED (paused) - actually lets reset for simplicity
      if (pingState === PingState.IDLE) {
         setPingHistory([]);
         setStats({
          current: 0,
          min: 0,
          max: 0,
          avg: 0,
          jitter: 0,
          packetLoss: 0,
          totalPings: 0,
          failedPings: 0,
        });
        setAiAnalysis(null);
      }
      setPingState(PingState.RUNNING);
    }
  };

  const handleReset = () => {
    setPingState(PingState.IDLE);
    setPingHistory([]);
    setStats({
      current: 0,
      min: 0,
      max: 0,
      avg: 0,
      jitter: 0,
      packetLoss: 0,
      totalPings: 0,
      failedPings: 0,
    });
    setAiAnalysis(null);
    setCurrentPing(null);
  };

  const handleAnalyze = async () => {
    if (stats.totalPings < 5) {
      setAiAnalysis("يرجى جمع بيانات أكثر (5 قراءات على الأقل) للحصول على تحليل دقيق.");
      return;
    }
    setIsAnalyzing(true);
    const result = await analyzeNetworkQuality(stats, selectedServer.name);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // Determine Ping Color
  const getPingColor = (ms: number | null) => {
    if (ms === null) return "text-gray-500";
    if (ms < 50) return "text-emerald-400";
    if (ms < 100) return "text-yellow-400";
    return "text-rose-500";
  };

  const getPingBorderColor = (ms: number | null) => {
    if (ms === null) return "border-gray-700";
    if (ms < 50) return "border-emerald-500/50";
    if (ms < 100) return "border-yellow-500/50";
    return "border-rose-500/50";
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-0 md:p-4 overflow-hidden">
      
      {/* Mobile Frame Container */}
      <div className="w-full h-[100dvh] md:h-[90vh] md:w-[400px] bg-gray-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-0 md:border border-gray-800 relative">
        
        {/* Status Bar (Visual only) */}
        <div className="h-8 bg-gray-900 flex items-center justify-between px-4 text-xs text-gray-400 select-none z-10">
          <span>{new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
          <div className="flex gap-2">
            <Wifi size={14} />
            <div className="w-4 h-2 bg-emerald-500 rounded-sm"></div>
          </div>
        </div>

        {/* App Bar */}
        <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center z-10">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-emerald-500" />
            <span>Ping Master</span>
          </h1>
          <div className="flex gap-3">
             {showInstallBtn && (
                <button 
                  onClick={handleInstallClick} 
                  className="text-xs flex items-center gap-1 bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-600/30 transition-colors"
                >
                  <Download size={14} />
                  تثبيت
                </button>
             )}
            <button onClick={handleReset} className="text-xs text-gray-500 hover:text-white transition-colors">
              إعادة تعيين
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 relative">
          
          {/* Main Gauge Area */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className={`w-48 h-48 rounded-full border-8 flex items-center justify-center bg-gray-800 shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 ${getPingBorderColor(currentPing)}`}>
              <div className="flex flex-col items-center">
                <span className={`text-5xl font-mono font-bold transition-colors duration-300 ${getPingColor(currentPing)}`}>
                  {currentPing !== null ? currentPing : '--'}
                </span>
                <span className="text-gray-400 text-sm mt-1">MS</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700">
               <span className={`w-2 h-2 rounded-full ${pingState === PingState.RUNNING ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></span>
               <span className="text-xs text-gray-400">
                 {pingState === PingState.RUNNING ? 'جارٍ الاتصال...' : 'متوقف'}
               </span>
            </div>
          </div>

          {/* Server Selector */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 px-1">الخادم المستهدف</label>
            <div className="relative">
              <select 
                value={selectedServerId}
                onChange={(e) => {
                  setSelectedServerId(e.target.value);
                  handleReset();
                }}
                disabled={pingState === PingState.RUNNING}
                className="w-full bg-gray-800 text-white p-3 pl-10 rounded-xl border border-gray-700 appearance-none focus:outline-none focus:border-emerald-500 disabled:opacity-50 text-right"
                dir="rtl"
              >
                {SERVERS.map(server => (
                  <option key={server.id} value={server.id}>{server.name} ({server.region})</option>
                ))}
              </select>
              <ServerIcon size={18} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
             <StatsCard 
                label="متوسط (Avg)" 
                value={stats.avg} 
                unit="ms" 
                icon={TrendingUp} 
                color="text-blue-400"
             />
             <StatsCard 
                label="تقطع (Jitter)" 
                value={stats.jitter} 
                unit="ms" 
                icon={Zap} 
                color="text-yellow-400"
             />
             <StatsCard 
                label="أدنى (Min)" 
                value={stats.min} 
                unit="ms" 
                icon={Activity} 
                color="text-emerald-400"
             />
             <StatsCard 
                label="فقدان (Loss)" 
                value={stats.packetLoss.toFixed(1)} 
                unit="%" 
                icon={AlertCircle} 
                color={stats.packetLoss > 0 ? "text-rose-400" : "text-gray-400"}
             />
          </div>

          {/* Chart */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 px-1">الرسم البياني المباشر</label>
            <PingChart data={pingHistory} />
          </div>

          {/* AI Analysis Section */}
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-xl p-4 border border-indigo-500/30">
             <div className="flex justify-between items-center mb-2">
               <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                 <Bot size={16} />
                 تحليل الذكاء الشبكي
               </h3>
               {stats.totalPings > 0 && !aiAnalysis && (
                 <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                 >
                   {isAnalyzing ? 'جاري التحليل...' : 'تحليل الآن'}
                 </button>
               )}
             </div>
             
             {aiAnalysis ? (
               <div className="text-sm text-gray-200 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                 {aiAnalysis}
               </div>
             ) : (
               <p className="text-xs text-gray-500">
                 اجمع 5 قراءات على الأقل ثم اضغط على "تحليل" للحصول على تقرير مفصل حول جودة اتصالك.
               </p>
             )}
          </div>

          {/* Spacer for bottom FAB */}
          <div className="h-20"></div>
        </div>

        {/* Bottom Floating Action Button */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
          <button
            onClick={togglePing}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-all transform hover:scale-105 active:scale-95 ${
              pingState === PingState.RUNNING 
                ? 'bg-rose-600 hover:bg-rose-500' 
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {pingState === PingState.RUNNING ? (
              <Square size={24} fill="white" className="text-white" />
            ) : (
              <Play size={28} fill="white" className="text-white ml-1" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default App;