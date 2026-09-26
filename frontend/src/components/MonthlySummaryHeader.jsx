import React from 'react';

export default function MonthlySummaryHeader({ obligations, currencySymbol = '₹', theme }) {
  const totalBillsCount = obligations.length;

  const totalMonthlySpend = obligations.reduce((sum, item) => {
    if (!item.expected_amount) return sum;
    const val = parseFloat(item.expected_amount);
    if (item.frequency === 'yearly') return sum + val / 12;
    if (item.frequency === 'quarterly') return sum + val / 3;
    return sum + val;
  }, 0);

  return (
    <div className={`p-5 rounded-2xl border mb-6 shadow-sm transition-colors ${theme.card}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold opacity-70 text-gray-400">
            Est. Monthly Spend
          </p>
          <h2 className={`text-3xl font-extrabold mt-1 ${theme.accentText}`}>
            {currencySymbol}{totalMonthlySpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider font-semibold opacity-70 text-gray-400">
            Active Obligations
          </p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{totalBillsCount}</p>
        </div>
      </div>
    </div>
  );
}