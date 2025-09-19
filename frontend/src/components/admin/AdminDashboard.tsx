import React, { useState, useEffect } from 'react';
import {
  DashboardStats,
  UserManagement,
  ContentModeration,
  FinancialReports,
  SystemHealth,
  AIUsageMonitor,
} from './DashboardComponents';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading">Loading dashboard...</div>;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats stats={stats} />;
      case 'users':
        return <UserManagement />;
      case 'content':
        return <ContentModeration />;
      case 'financial':
        return <FinancialReports />;
      case 'system':
        return <SystemHealth />;
      case 'ai':
        return <AIUsageMonitor />;
      default:
        return <DashboardStats stats={stats} />;
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <button onClick={loadDashboardStats} className="refresh-btn">
            Refresh
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'users', label: 'Users', icon: '👥' },
          { id: 'content', label: 'Content', icon: '📚' },
          { id: 'financial', label: 'Financial', icon: '💰' },
          { id: 'system', label: 'System', icon: '⚙️' },
          { id: 'ai', label: 'AI Usage', icon: '🤖' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;