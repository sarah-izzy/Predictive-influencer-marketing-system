import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, Calendar, CheckCircle2, Clock } from 'lucide-react';
import Card from '../../components/common/Card';
import { earningsData, paymentHistory } from '../../data/dummyData';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="value" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? `$${entry.value.toLocaleString()}` : entry.value}
        </p>
      ))}
    </div>
  );
};

const Earnings = () => {
  const totalEarnings = earningsData.reduce((s, e) => s + e.amount, 0);
  const totalCampaigns = earningsData.reduce((s, e) => s + e.campaigns, 0);
  const avgPerCampaign = Math.round(totalEarnings / totalCampaigns);
  const highestMonth = earningsData.reduce((a, b) => a.amount > b.amount ? a : b);
  const pendingPayments = paymentHistory.filter(p => p.status === 'pending');
  const pendingAmount = pendingPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <h2 className="page-title">Earnings</h2>
      <p className="page-subtitle">Track your income and payment history</p>

      {/* Stat Cards */}
      <div className="stats-grid">
        <Card
          title="Total Earnings"
          value={`$${(totalEarnings / 1000).toFixed(1)}K`}
          icon={DollarSign}
          iconBg="linear-gradient(135deg, #22c55e, #4ade80)"
          glowColor="#22c55e"
          change="22.3%"
          changeType="positive"
          subtext="This year"
        />
        <Card
          title="Avg per Campaign"
          value={`$${avgPerCampaign.toLocaleString()}`}
          icon={TrendingUp}
          iconBg="linear-gradient(135deg, #6366f1, #818cf8)"
          glowColor="#6366f1"
          subtext={`${totalCampaigns} campaigns total`}
        />
        <Card
          title="Best Month"
          value={`$${highestMonth.amount.toLocaleString()}`}
          icon={Calendar}
          iconBg="linear-gradient(135deg, #f97316, #fb923c)"
          glowColor="#f97316"
          subtext={highestMonth.month}
        />
        <Card
          title="Pending Payments"
          value={`$${pendingAmount.toLocaleString()}`}
          icon={Clock}
          iconBg="linear-gradient(135deg, #a855f7, #c084fc)"
          glowColor="#a855f7"
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
              <BarChart data={earningsData} barSize={32}>
                <defs>
                  <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Earnings" fill="url(#earnGrad)" radius={[6, 6, 0, 0]} />
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
              {paymentHistory.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.campaign}</td>
                  <td style={{ color: 'var(--gray-300)' }}>{p.brand}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success-400)' }}>${p.amount.toLocaleString()}</td>
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
