// Dashboard Stats Component
export const DashboardStats: React.FC<{ stats: any }> = ({ stats }) => {
  if (!stats) return <div>No data available</div>;

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-value">{stats.total?.users?.toLocaleString()}</div>
          <div className="stat-change">
            {stats.growth?.userGrowth > 0 ? '↗' : '↘'} 
            {Math.abs(stats.growth?.userGrowth || 0).toFixed(1)}%
          </div>
        </div>

        <div className="stat-card">
          <h3>Total Books</h3>
          <div className="stat-value">{stats.total?.books?.toLocaleString()}</div>
          <div className="stat-change">
            {stats.growth?.contentGrowth > 0 ? '↗' : '↘'} 
            {Math.abs(stats.growth?.contentGrowth || 0).toFixed(1)}%
          </div>
        </div>

        <div className="stat-card">
          <h3>Total Revenue</h3>
          <div className="stat-value">${stats.total?.revenue?.toLocaleString()}</div>
          <div className="stat-change">
            {stats.growth?.revenueGrowth > 0 ? '↗' : '↘'} 
            {Math.abs(stats.growth?.revenueGrowth || 0).toFixed(1)}%
          </div>
        </div>

        <div className="stat-card">
          <h3>Live Sessions</h3>
          <div className="stat-value">{stats.total?.sessions?.toLocaleString()}</div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity (Last 7 days)</h3>
        <div className="activity-grid">
          <div className="activity-item">
            <span>New Users:</span>
            <strong>{stats.recent?.newUsers}</strong>
          </div>
          <div className="activity-item">
            <span>New Books:</span>
            <strong>{stats.recent?.newBooks}</strong>
          </div>
          <div className="activity-item">
            <span>Revenue:</span>
            <strong>${stats.recent?.revenue}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Management Component
export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="user-management">
      <h2>User Management</h2>
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <span className={`status ${user.verified ? 'verified' : 'pending'}`}>
                  {user.verified ? 'Verified' : 'Pending'}
                </span>
              </td>
              <td>
                <button className="action-btn">Edit</button>
                <button className="action-btn danger">Suspend</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Additional components for ContentModeration, FinancialReports, SystemHealth, and AIUsageMonitor
// would follow similar patterns with specialized UI for each admin section