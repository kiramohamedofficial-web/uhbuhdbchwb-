
import React from 'react';

interface ChartDataPoint {
  month: string;
  revenue: number;
}

interface RevenueChartProps {
  data: ChartDataPoint[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data: chartData }) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-center text-[var(--text-secondary)] bg-slate-50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-[var(--border-primary)]">
        <div className="text-center">
          <p className="font-bold text-lg">لا توجد بيانات إحصائية كافية.</p>
          <p className="text-sm opacity-60 mt-1">سيتم رسم المؤشر تلقائياً فور تسجيل أول اشتراك.</p>
        </div>
      </div>
    );
  }

  const chartWidth = 600;
  const chartHeight = 300;
  const paddingY = 40;
  const paddingX = 50;

  const maxX = chartWidth - paddingX;
  const maxY = chartHeight - paddingY;

  const maxRevenueValue = Math.max(...chartData.map(d => d.revenue));
  const maxRevenue = maxRevenueValue === 0 ? 1000 : maxRevenueValue * 1.25;
  
  const getX = (index: number) => paddingX + (index / (chartData.length - 1 || 1)) * (maxX - paddingX);
  const getY = (revenue: number) => maxY - (revenue / maxRevenue) * (maxY - paddingY);

  const points = chartData.map((d, i) => ({ x: getX(i), y: getY(d.revenue) }));
  
  const linePath = points.length > 1 
    ? points.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        return `${acc} L ${p.x} ${p.y}`;
      }, '')
    : `M ${points[0].x} ${points[0].y} L ${points[0].x + 1} ${points[0].y}`;

  const areaPath = `${linePath} L ${points[points.length-1].x} ${maxY} L ${points[0].x} ${maxY} Z`;

  return (
    <div className="w-full h-full min-h-[300px]">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(tick => {
          const y = getY(maxRevenue * tick);
          return (
            <g key={tick} className="opacity-[0.08] dark:opacity-[0.15]">
              <line x1={paddingX} y1={y} x2={maxX} y2={y} stroke="currentColor" strokeWidth="1.5" strokeDasharray="6,6" />
              <text x={paddingX - 15} y={y + 4} textAnchor="end" fontSize="10" className="fill-current font-black">
                {Math.round(maxRevenue * tick).toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* Area and Line */}
        <path d={areaPath} fill="url(#chartAreaGradient)" />
        <path d={linePath} fill="none" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

        {/* Data Points */}
        {points.map((p, i) => (
          <g key={i} className="group/dot">
            <circle cx={p.x} cy={p.y} r="8" fill="#4F46E5" className="opacity-0 group-hover/dot:opacity-20 transition-all duration-300 scale-0 group-hover/dot:scale-100" />
            <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-secondary)" stroke="#4F46E5" strokeWidth="2.5" className="transition-all duration-300 group-hover/dot:r-6" />
            <g className="opacity-0 group-hover/dot:opacity-100 transition-all duration-300">
                <rect x={p.x - 35} y={p.y - 45} width="70" height="30" rx="8" fill="#0F172A" />
                <text x={p.x} y={p.y - 25} textAnchor="middle" fontSize="12" className="font-black fill-white">
                    {chartData[i].revenue.toLocaleString()}
                </text>
            </g>
          </g>
        ))}

        {/* X-axis Labels */}
        {chartData.map((d, i) => (
          <text key={i} x={getX(i)} y={chartHeight - 10} textAnchor="middle" fontSize="11" className="fill-slate-500 font-black uppercase tracking-tighter">
            {d.month}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default RevenueChart;
