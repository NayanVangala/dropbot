import { useApi } from '../hooks/useApi';

interface OrdersResponse {
  orders: any[];
  total: number;
}

const mockOrders = [
  { id: '#1042', customer: 'Sarah J.', email: 'sarah@email.com', product: 'LED Strip Lights', amount: 24.99, status: 'shipped', tracking: 'LX328947CN', date: '2h ago' },
  { id: '#1041', customer: 'Mike R.', email: 'mike@email.com', product: 'Wireless Earbuds Pro', amount: 34.99, status: 'pending', tracking: '', date: '5h ago' },
  { id: '#1040', customer: 'Emily T.', email: 'emily@email.com', product: 'Phone Car Mount', amount: 19.99, status: 'shipped', tracking: 'LX328812CN', date: '1d ago' },
  { id: '#1039', customer: 'Alex K.', email: 'alex@email.com', product: 'Portable Blender', amount: 29.99, status: 'delivered', tracking: 'LX328790CN', date: '2d ago' },
  { id: '#1038', customer: 'Jordan P.', email: 'jordan@email.com', product: 'Smart Watch Band', amount: 12.99, status: 'pending', tracking: '', date: '2d ago' },
  { id: '#1037', customer: 'Chris M.', email: 'chris@email.com', product: 'Ring Light 10"', amount: 22.99, status: 'shipped', tracking: 'LX328655CN', date: '3d ago' },
  { id: '#1036', customer: 'Sam W.', email: 'sam@email.com', product: 'LED Strip Lights', amount: 24.99, status: 'delivered', tracking: 'LX328501CN', date: '4d ago' },
];

const statusIcon: Record<string, string> = {
  pending: '⏳', shipped: '🚚', delivered: '✅', cancelled: '❌',
};

export default function Orders() {
  const { data, loading } = useApi<OrdersResponse>('/api/orders', 30000);
  const orders = (data?.orders?.length ? data.orders : mockOrders);

  const pendingCount = orders.filter((o: any) => o.status === 'pending').length;
  const shippedCount = orders.filter((o: any) => o.status === 'shipped').length;
  const deliveredCount = orders.filter((o: any) => o.status === 'delivered').length;

  return (
    <div>
      <div className="page-header">
        <h2>Orders</h2>
        <p>Track and manage order fulfillment</p>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card amber fade-in-up">
          <div className="stat-header">
            <span className="stat-label">Pending</span>
            <div className="stat-icon">⏳</div>
          </div>
          <div className="stat-value count-up">{pendingCount}</div>
          <div className="stat-change negative">Need fulfillment</div>
        </div>
        <div className="stat-card cyan fade-in-up">
          <div className="stat-header">
            <span className="stat-label">Shipped</span>
            <div className="stat-icon">🚚</div>
          </div>
          <div className="stat-value count-up">{shippedCount}</div>
          <div className="stat-change positive">In transit</div>
        </div>
        <div className="stat-card green fade-in-up">
          <div className="stat-header">
            <span className="stat-label">Delivered</span>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-value count-up">{deliveredCount}</div>
          <div className="stat-change positive">Completed</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>📋 Recent Orders</h3>
          <button className="btn btn-ghost btn-sm">Export</button>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Tracking</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                [1,2,3].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5,6,7,8].map(j => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : (
                orders.map((order: any, i: number) => (
                  <tr key={i} className="fade-in-up">
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.id || order.name}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{order.customer}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.email}</div>
                      </div>
                    </td>
                    <td>{order.product}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                      ${typeof order.amount === 'number' ? order.amount.toFixed(2) : order.amount}
                    </td>
                    <td>
                      <span className={`badge ${order.status}`}>
                        {statusIcon[order.status] || '📦'} {order.status}
                      </span>
                    </td>
                    <td>
                      {order.tracking ? (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{order.tracking}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{order.date}</td>
                    <td>
                      {order.status === 'pending' ? (
                        <button className="btn btn-success btn-sm">Fulfill</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm">Details</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
