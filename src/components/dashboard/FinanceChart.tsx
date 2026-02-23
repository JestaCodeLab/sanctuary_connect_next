'use client';

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}

interface FinanceChartProps {
  data: MonthlyTrend[];
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toFixed(0);
}

export default function FinanceChart({ data }: FinanceChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);
  const chartHeight = 200;
  const barWidth = 100 / (data.length * 3 + 1);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-xs text-muted">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-xs text-muted">Expenses</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <div
            key={fraction}
            className="absolute w-full border-t border-border/50"
            style={{ bottom: `${fraction * 100}%` }}
          >
            <span className="absolute -left-1 -top-2.5 text-[10px] text-muted transform -translate-x-full">
              {formatCurrency(maxValue * fraction)}
            </span>
          </div>
        ))}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end pl-8">
          {data.map((item, i) => {
            const incomeHeight = (item.income / maxValue) * 100;
            const expenseHeight = (item.expenses / maxValue) * 100;
            const groupWidth = `${barWidth * 2.5}%`;
            const gap = `${barWidth * 0.5}%`;

            return (
              <div
                key={item.month}
                className="flex items-end gap-0.5 relative"
                style={{
                  width: groupWidth,
                  marginLeft: i === 0 ? gap : gap,
                  height: '100%',
                }}
              >
                {/* Income bar */}
                <div
                  className="flex-1 bg-green-500 rounded-t-sm transition-all duration-300 relative group"
                  style={{ height: `${incomeHeight}%`, minHeight: item.income > 0 ? 2 : 0 }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    GHS {item.income.toLocaleString()}
                  </div>
                </div>
                {/* Expense bar */}
                <div
                  className="flex-1 bg-red-400 rounded-t-sm transition-all duration-300 relative group"
                  style={{ height: `${expenseHeight}%`, minHeight: item.expenses > 0 ? 2 : 0 }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    GHS {item.expenses.toLocaleString()}
                  </div>
                </div>
                {/* Month label */}
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted whitespace-nowrap">
                  {formatMonth(item.month)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom padding for labels */}
      <div className="h-6" />
    </div>
  );
}
