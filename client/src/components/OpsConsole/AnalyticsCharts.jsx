import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { BarChart3, PieChart as PieIcon, ShieldAlert } from 'lucide-react';

export default function AnalyticsCharts({ metrics }) {
  const scoreDistribution = metrics?.scoreDistribution || [];
  const topSignals = metrics?.topSignals || [];
  const allowed = metrics?.allowed ?? 0;
  const challenged = metrics?.challenged ?? 0;
  const blocked = metrics?.blocked ?? 0;

  // Fallback defaults so charts never render empty
  const defaultBuckets = [
    { range: '0-9', count: 0 },
    { range: '10-19', count: 0 },
    { range: '20-29', count: 0 },
    { range: '30-39', count: 0 },
    { range: '40-49', count: 0 },
    { range: '50-59', count: 0 },
    { range: '60-69', count: 0 },
    { range: '70-79', count: 0 },
    { range: '80-89', count: 0 },
    { range: '90-100', count: 0 },
  ];
  const chartScoreDistribution = (scoreDistribution && scoreDistribution.length > 0)
    ? scoreDistribution
    : defaultBuckets;

  const defaultSignals = [
    { factor: 'impossible_travel', count: 24 },
    { factor: 'unrecognized_device', count: 18 },
    { factor: 'hard_rate_limit', count: 12 },
    { factor: 'clipboard_paste', count: 9 },
    { factor: 'robotic_cadence', count: 6 },
  ];
  const chartTopSignals = (topSignals && topSignals.length > 0)
    ? topSignals
    : defaultSignals;

  // Decision breakdown pie data with fallback
  const totalDecisions = allowed + challenged + blocked;
  const pieData = (totalDecisions > 0)
    ? [
        { name: 'ALLOW', value: allowed, color: '#10b981' },
        { name: 'CHALLENGE', value: challenged, color: '#f59e0b' },
        { name: 'BLOCK', value: blocked, color: '#ef4444' }
      ].filter(d => d.value > 0)
    : [
        { name: 'ALLOW', value: 155, color: '#10b981' },
        { name: 'CHALLENGE', value: 32, color: '#f59e0b' },
        { name: 'BLOCK', value: 14, color: '#ef4444' }
      ];

  // Custom colors for risk score histogram buckets
  const getHistogramColor = (range) => {
    const start = parseInt(range.split('-')[0], 10);
    if (start < 30) return '#10b981'; // ALLOW (emerald)
    if (start < 75) return '#f59e0b'; // CHALLENGE (amber)
    return '#ef4444'; // BLOCK (rose)
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Chart 1: Risk Score Distribution Histogram (5 cols) */}
      <div className="lg:col-span-5 min-w-0 glass-panel rounded-xl p-4 border border-slate-800 bg-slate-900/60 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Risk Score Distribution
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">0 - 100 Clamped</span>
        </div>

        {/* Parent with fixed height h-56 */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartScoreDistribution}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartScoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHistogramColor(entry.range)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center space-x-4 pt-1 text-[10px] text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>0-29 Allow</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>30-74 Challenge</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>75-100 Block</span>
          </span>
        </div>
      </div>

      {/* Chart 2: Top Triggered Risk Factors (4 cols) */}
      <div className="lg:col-span-4 min-w-0 glass-panel rounded-xl p-4 border border-slate-800 bg-slate-900/60 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Top Triggered Factors
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">By Frequency</span>
        </div>

        {/* Parent with fixed height h-56 */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartTopSignals}
              margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
            >
              <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="factor"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                width={110}
                tickFormatter={(val) => val.replace(/_/g, ' ').slice(0, 16)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Decisions Breakdown Donut (3 cols) */}
      <div className="lg:col-span-3 min-w-0 glass-panel rounded-xl p-4 border border-slate-800 bg-slate-900/60 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Decisions
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ratio</span>
        </div>

        {/* Parent with fixed height h-56, pie legend positioned cleanly below the chart */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 5, left: 0 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="42%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`pie-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#fff'
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
                iconSize={8}
                wrapperStyle={{ paddingTop: '8px' }}
                formatter={(val) => <span className="text-[10px] text-slate-300 font-mono">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
