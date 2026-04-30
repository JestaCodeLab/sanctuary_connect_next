'use client';

import { useState, useEffect } from 'react';
import { smsApi } from '@/lib/api';
import { SmsAnalytics as SmsAnalyticsType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SmsAnalytics() {
  const [analytics, setAnalytics] = useState<SmsAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await smsApi.getAnalytics({ period });
      setAnalytics(data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod('7d')}
          className={`px-4 py-2 rounded ${
            period === '7d' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setPeriod('30d')}
          className={`px-4 py-2 rounded ${
            period === '30d' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setPeriod('90d')}
          className={`px-4 py-2 rounded ${
            period === '90d' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Last 90 Days
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalSent.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.deliveryRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Credits Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalCreditsUsed.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* By Category */}
      <Card>
        <CardHeader>
          <CardTitle>By Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(analytics.byCategory).map(([category, data]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                <div className="flex gap-4 text-sm">
                  <span>Campaigns: {data.count}</span>
                  <span>Sent: {data.sent}</span>
                  <span>Delivered: {data.delivered}</span>
                  <span>Credits: {data.credits}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Type */}
      <Card>
        <CardHeader>
          <CardTitle>By Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(analytics.byType).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium capitalize">{type}</span>
                <div className="flex gap-4 text-sm">
                  <span>Campaigns: {data.count}</span>
                  <span>Sent: {data.sent}</span>
                  <span>Delivered: {data.delivered}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
