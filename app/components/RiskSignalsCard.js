'use client';

import { useState, useEffect } from 'react';

export default function RiskSignalsCard() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch('/api/actions/signals');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setSignals(data.signals || []);
      } catch (error) {
        console.error('Failed to fetch risk signals:', error);
        setSignals([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSignals();
  }, []);

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'red': return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', dot: 'bg-red-500' };
      case 'amber': return { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', dot: 'bg-amber-500' };
      default: return { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400', dot: 'bg-gray-500' };
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 h-full">
        <h2 className="text-xl font-bold text-white flex items-center mb-4">
          <span className="mr-2">🚨</span>Risk Signals
        </h2>
        <div className="text-center text-gray-400 py-8">Scanning...</div>
      </div>
    );
  }

  const redCount = signals.filter(s => s.severity === 'red').length;
  const amberCount = signals.filter(s => s.severity === 'amber').length;

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🚨</span>
          Risk Signals
        </h2>
        <div className="flex items-center space-x-2">
          {redCount > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              {redCount} RED
            </span>
          )}
          {amberCount > 0 && (
            <span className="bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              {amberCount}
            </span>
          )}
          {redCount === 0 && amberCount === 0 && (
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              CLEAR
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="text-center text-gray-400 py-6">
            <div className="text-3xl mb-2">🟢</div>
            <div>All clear - no active risk signals</div>
          </div>
        ) : (
          signals.map((signal, idx) => {
            const style = getSeverityStyle(signal.severity);
            return (
              <div key={idx} className={`p-3 rounded-lg border ${style.bg} ${style.border}`}>
                <div className="flex items-start space-x-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot} ${signal.severity === 'red' ? 'animate-pulse' : ''}`} />
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${style.text}`}>{signal.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{signal.detail}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
