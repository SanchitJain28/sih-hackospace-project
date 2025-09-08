import React from 'react';
import { Satellite, AlertTriangle } from 'lucide-react';

// ## Type Definitions
// This type can be shared with other components.
type RiskLevel = 'high' | 'medium' | 'low';

// Interface for the component's props
interface HeaderProps {
  debrisCount: number;
  riskLevel: RiskLevel;
}

// ## Component Implementation

const Header: React.FC<HeaderProps> = ({ debrisCount, riskLevel }) => {
  const getRiskColor = (level: RiskLevel): string => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-b border-slate-700">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-700 p-2 rounded-lg">
              <Satellite className="h-8 w-8 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Space Debris Dashboard
              </h1>
              <p className="text-slate-300 text-sm">
                Real-time orbital debris monitoring system
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-300">{debrisCount}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">
                Objects Tracked
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-6 w-6 ${getRiskColor(riskLevel)}`} />
              <div className="text-right">
                <div className={`font-semibold capitalize text-lg ${getRiskColor(riskLevel)}`}>
                  {riskLevel} Risk
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">
                  Current Status
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;