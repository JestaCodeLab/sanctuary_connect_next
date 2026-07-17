'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';

import { PageHeader, Badge } from '@/components/dashboard';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import { Button, Input, Card } from '@/components/ui';
import { financeApi } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/useCurrency';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeByType: Record<string, number>;
  expensesByCategory: Record<string, number>;
  donations: Array<{
    _id: string;
    amount: number;
    donationType?: string;
    donationDate: string;
    donorId?: { firstName: string; lastName: string };
  }>;
  expenses: Array<{
    _id: string;
    amount: number;
    category: string;
    description?: string;
    date: string;
    vendor?: string;
  }>;
}

function ReportsContent() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const { formatCurrency } = useCurrency();

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [activeTab, setActiveTab] = useState<'summary' | 'income' | 'expenses'>('summary');

  const { data: report, isLoading, refetch } = useQuery<ReportData>({
    queryKey: ['finance', 'report', startDate, endDate],
    queryFn: () => financeApi.getReport(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  const handleDownloadCSV = () => {
    if (!report) return;

    const rows: string[][] = [];
    rows.push(['Financial Report']);
    rows.push([`Period: ${startDate} to ${endDate}`]);
    rows.push([]);

    rows.push(['Summary']);
    rows.push(['Total Income', report.totalIncome.toString()]);
    rows.push(['Total Expenses', report.totalExpenses.toString()]);
    rows.push(['Net Balance', report.netBalance.toString()]);
    rows.push([]);

    rows.push(['Income by Type']);
    rows.push(['Type', 'Amount']);
    Object.entries(report.incomeByType).forEach(([type, amount]) => {
      rows.push([type, amount.toString()]);
    });
    rows.push([]);

    rows.push(['Expenses by Category']);
    rows.push(['Category', 'Amount']);
    Object.entries(report.expensesByCategory).forEach(([cat, amount]) => {
      rows.push([cat, amount.toString()]);
    });
    rows.push([]);

    rows.push(['Donations']);
    rows.push(['Date', 'Donor', 'Type', 'Amount']);
    report.donations.forEach((d) => {
      const donor = d.donorId ? `${d.donorId.firstName} ${d.donorId.lastName}` : 'Anonymous';
      rows.push([d.donationDate, donor, d.donationType || 'other', d.amount.toString()]);
    });
    rows.push([]);

    rows.push(['Expenses']);
    rows.push(['Date', 'Category', 'Description', 'Vendor', 'Amount']);
    report.expenses.forEach((e) => {
      rows.push([e.date, e.category, e.description || '', e.vendor || '', e.amount.toString()]);
    });

    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await financeApi.downloadReportPdf(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-report-${startDate}-to-${endDate}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to download PDF report');
    }
  };

  return (
    <div>
      <PageHeader title="Financial Reports" description="Generate and download detailed financial reports" />

      {/* Date Range Picker */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button onClick={() => refetch()} isLoading={isLoading}>
            Generate Report
          </Button>
          {report && (
            <>
              <Button variant="outline" onClick={handleDownloadCSV}>
                <Download className="w-4 h-4 mr-1" />
                Download CSV
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </Button>
            </>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card padding="md">
              <p className="text-sm text-muted">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(report.totalIncome)}</p>
            </Card>
            <Card padding="md">
              <p className="text-sm text-muted">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(report.totalExpenses)}</p>
            </Card>
            <Card padding="md">
              <p className="text-sm text-muted">Net Balance</p>
              <p className={`text-2xl font-bold ${report.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(report.netBalance)}
              </p>
            </Card>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Income by Type */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-foreground mb-3">Income by Type</h3>
              {Object.keys(report.incomeByType).length === 0 ? (
                <p className="text-sm text-muted">No income in this period</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(report.incomeByType).map(([type, amount]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-foreground capitalize">{type}</span>
                      <span className="text-sm font-medium text-foreground">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Expenses by Category */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-foreground mb-3">Expenses by Category</h3>
              {Object.keys(report.expensesByCategory).length === 0 ? (
                <p className="text-sm text-muted">No expenses in this period</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(report.expensesByCategory).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-foreground capitalize">{category}</span>
                      <span className="text-sm font-medium text-foreground">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Tabs for detailed data */}
          <Card padding="none">
            <div className="flex border-b border-border">
              {(['summary', 'income', 'expenses'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <p className="text-sm text-muted">
                    Statement for {formatDate(startDate)} — {formatDate(endDate)} ({report.donations.length} donations, {report.expenses.length} expenses)
                  </p>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Income', value: report.totalIncome, color: '#22c55e' },
                          { name: 'Expenses', value: report.totalExpenses, color: '#ef4444' },
                        ]}
                        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                          axisLine={{ stroke: 'var(--color-border)' }}
                        />
                        <YAxis
                          tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                          axisLine={{ stroke: 'var(--color-border)' }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          formatter={(value: any) => formatCurrency(Number(value))}
                          contentStyle={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            borderRadius: '8px',
                            color: 'var(--color-foreground)',
                          }}
                          labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }}
                          cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {[{ color: '#22c55e' }, { color: '#ef4444' }].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="border border-border rounded-lg divide-y divide-border">
                    <div className="px-4 py-2 bg-background">
                      <p className="text-xs font-semibold text-muted uppercase">Income</p>
                    </div>
                    {Object.entries(report.incomeByType).map(([type, amount]) => (
                      <div key={type} className="px-4 py-2 flex justify-between text-sm">
                        <span className="text-foreground capitalize pl-2">{type}</span>
                        <span className="text-foreground">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="px-4 py-2 flex justify-between text-sm font-semibold">
                      <span className="text-foreground">Total Income</span>
                      <span className="text-green-600">{formatCurrency(report.totalIncome)}</span>
                    </div>

                    <div className="px-4 py-2 bg-background">
                      <p className="text-xs font-semibold text-muted uppercase">Expenses</p>
                    </div>
                    {Object.entries(report.expensesByCategory).map(([category, amount]) => (
                      <div key={category} className="px-4 py-2 flex justify-between text-sm">
                        <span className="text-foreground capitalize pl-2">{category}</span>
                        <span className="text-foreground">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="px-4 py-2 flex justify-between text-sm font-semibold">
                      <span className="text-foreground">Total Expenses</span>
                      <span className="text-red-600">{formatCurrency(report.totalExpenses)}</span>
                    </div>

                    <div className="px-4 py-3 flex justify-between font-bold">
                      <span className="text-foreground">Net Balance</span>
                      <span className={report.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(report.netBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'income' && (
                <div className="overflow-x-auto">
                  {report.donations.length === 0 ? (
                    <p className="text-sm text-muted text-center py-8">No donations in this period</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-muted uppercase px-4 py-2">Date</th>
                          <th className="text-left text-xs font-medium text-muted uppercase px-4 py-2">Donor</th>
                          <th className="text-left text-xs font-medium text-muted uppercase px-4 py-2">Type</th>
                          <th className="text-right text-xs font-medium text-muted uppercase px-4 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {report.donations.map((d) => (
                          <tr key={d._id}>
                            <td className="px-4 py-2 text-sm text-foreground">{formatDate(d.donationDate)}</td>
                            <td className="px-4 py-2 text-sm text-foreground">
                              {d.donorId ? `${d.donorId.firstName} ${d.donorId.lastName}` : 'Anonymous'}
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant="info">{d.donationType || 'other'}</Badge>
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-foreground text-right">
                              {formatCurrency(d.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'expenses' && (
                <div className="overflow-x-auto">
                  {report.expenses.length === 0 ? (
                    <p className="text-sm text-muted text-center py-8">No expenses in this period</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-muted uppercase px-4 py-2">Date</th>
                          <th className="text-left text-xs font-medium text-muted uppercase px-4 py-2">Category</th>
                          <th className="text-left text-xs font-medium text-muted uppercase px-4 py-2">Description</th>
                          <th className="text-right text-xs font-medium text-muted uppercase px-4 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {report.expenses.map((e) => (
                          <tr key={e._id}>
                            <td className="px-4 py-2 text-sm text-foreground">{formatDate(e.date)}</td>
                            <td className="px-4 py-2">
                              <Badge variant="muted">{e.category}</Badge>
                            </td>
                            <td className="px-4 py-2 text-sm text-foreground">{e.description || '—'}</td>
                            <td className="px-4 py-2 text-sm font-medium text-foreground text-right">
                              {formatCurrency(e.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </Card>
        </>
      ) : (
        <Card padding="md" className="text-center py-12">
          <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium">Select a date range and generate a report</p>
          <p className="text-sm text-muted mt-1">View income, expenses, and financial breakdowns</p>
        </Card>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <FinanceAccessGuard setupPath="/finance/setup">
      <ReportsContent />
    </FinanceAccessGuard>
  );
}
