import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Banknote, TrendingUp, Calendar, CheckCircle2, Clock } from 'lucide-react';
import Card from '../../components/common/Card';
import { checkHealth, getEarnings, trainModels } from '../../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="value" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? `₦${entry.value.toLocaleString()}` : entry.value}
        </p>
      ))}
    </div>
  );
};

const Earnings = () => {
  const [earningsData, setEarningsData] = useState({ monthly: [], payments: [] });
  const [loading, setLoading] = useState(true);

  // Load earnings data on component mount
  React.useEffect(() => {
    const loadEarnings = async () => {
      try {
        const health = await checkHealth();
        if (!health.trained) {
          await trainModels(800);
        }
        const data = await getEarnings();
        setEarningsData(data || { monthly: [], payments: [] });
        setLoading(false);
      } catch (error) {
        console.error('Failed to load earnings:', error);
        setEarningsData({ monthly: [], payments: [] });
        setLoading(false);
      }
    };
    loadEarnings();
  }, []);

  const monthlyData = earningsData?.monthly || [];
  const paymentHistoryList = earningsData?.payments || [];
  const totalEarnings = monthlyData.reduce((s, e) => s + e.amount, 0);
  const totalCampaigns = monthlyData.reduce((s, e) => s + e.campaigns, 0);
  const avgPerCampaign = totalCampaigns ? Math.round(totalEarnings / totalCampaigns) : 0;
  const highestMonth = monthlyData.reduce((a, b) => (a.amount > b.amount ? a : b), { amount: 0, month: 'N/A' });
  const pendingPayments = paymentHistoryList.filter(p => p.status === 'pending');
  const pendingAmount = pendingPayments.reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading earnings data...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Earnings</h2>
      <p className="page-subtitle">Track your income and payment history</p>

      {/* Stat Cards */}
      <div className="stats-grid">
        <Card
          title="Total Earnings"
          value={`₦${(totalEarnings / 1000).toFixed(1)}K`}
          icon={Banknote}
          iconBg="#F97316"
          glowColor="#F97316"
          change="22.3%"
          changeType="positive"
          subtext="This year"
        />
        <Card
          title="Avg per Campaign"
          value={`₦${avgPerCampaign.toLocaleString()}`}
          icon={TrendingUp}
          iconBg="#F97316"
          glowColor="#F97316"
          subtext={`${totalCampaigns} campaigns total`}
        />
        <Card
          title="Best Month"
          value={`₦${highestMonth.amount.toLocaleString()}`}
          icon={Calendar}
          iconBg="#F97316"
          glowColor="#F97316"
          subtext={highestMonth.month || 'N/A'}
        />
        <Card
          title="Pending Payments"
          value={`₦${pendingAmount.toLocaleString()}`}
          icon={Clock}
          iconBg="#F97316"
          glowColor="#F97316"
          subtext={`${pendingPayments.length} payments awaiting`}
        />
      </div>

      {/* Earnings Chart */}
      <div className="charts-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Monthly Earnings</div>
              <div className="chart-card-subtitle">Revenue over the past 12 months</div>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="month" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₦${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Earnings" fill="rgba(249, 115, 22, 0.14)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="chart-card chart-full-width">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Payment History</div>
            <div className="chart-card-subtitle">All transactions</div>
          </div>
        </div>
        <div className="rankings-table-wrapper">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Brand</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistoryList.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.campaign}</td>
                  <td style={{ color: 'var(--gray-300)' }}>{p.brand}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success-400)' }}>₦{p.amount.toLocaleString()}</td>
                  <td style={{ color: 'var(--gray-400)' }}>
                    {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td>
                    <span className={`pay-status pay-status-${p.status}`}>
                      {p.status === 'paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Earnings;
