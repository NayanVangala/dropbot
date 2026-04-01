import { useApi } from '../hooks/useApi';

interface Product {
  id: string;
  title: string;
  status: string;
  variants: { edges: { node: { id: string; price: string } }[] };
}

interface ProductsResponse {
  products: Product[];
  total: number;
}

export default function Products() {
  const { data, loading } = useApi<ProductsResponse>('/api/products', 30000);
  const products = data?.products || [];

  // Mock products if API not connected
  const displayProducts = products.length > 0 ? products : [
    { id: 'gid://1', title: 'LED Strip Lights RGB 5M', status: 'ACTIVE', variants: { edges: [{ node: { id: 'v1', price: '24.99' } }] } },
    { id: 'gid://2', title: 'Wireless Earbuds Pro TWS', status: 'ACTIVE', variants: { edges: [{ node: { id: 'v2', price: '34.99' } }] } },
    { id: 'gid://3', title: 'Magnetic Phone Car Mount', status: 'ACTIVE', variants: { edges: [{ node: { id: 'v3', price: '19.99' } }] } },
    { id: 'gid://4', title: 'Portable Blender USB-C', status: 'ACTIVE', variants: { edges: [{ node: { id: 'v4', price: '29.99' } }] } },
    { id: 'gid://5', title: 'Smart Watch Band Silicone', status: 'ACTIVE', variants: { edges: [{ node: { id: 'v5', price: '12.99' } }] } },
    { id: 'gid://6', title: 'Ring Light 10" with Stand', status: 'DRAFT', variants: { edges: [{ node: { id: 'v6', price: '22.99' } }] } },
  ];

  // Mock stats per product
  const getProductStats = (index: number) => {
    const stats = [
      { sales: 42, revenue: 1049.58, margin: 0.45, cost: 8.5 },
      { sales: 28, revenue: 979.72, margin: 0.38, cost: 14.2 },
      { sales: 65, revenue: 1299.35, margin: 0.52, cost: 6.8 },
      { sales: 19, revenue: 569.81, margin: 0.41, cost: 11.5 },
      { sales: 87, revenue: 1130.13, margin: 0.55, cost: 4.2 },
      { sales: 0, revenue: 0, margin: 0.40, cost: 9.0 },
    ];
    return stats[index % stats.length];
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Products</h2>
            <p>{displayProducts.length} active listings on Shopify</p>
          </div>
          <button className="btn btn-primary">+ Add Product</button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Margin</th>
                <th>Sales</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayProducts.length === 0 ? (
                <>
                  {[1,2,3].map(i => (
                    <tr key={i}>
                      {[1,2,3,4,5,6,7,8].map(j => (
                        <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }}></div></td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : (
                displayProducts.map((product, index) => {
                  const price = parseFloat(product.variants?.edges?.[0]?.node?.price || '0');
                  const stats = getProductStats(index);
                  const marginClass = stats.margin >= 0.4 ? 'high' : stats.margin >= 0.25 ? 'medium' : 'low';

                  return (
                    <tr key={product.id} className="fade-in-up">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: 40, height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-glass)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem'
                          }}>
                            📦
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                              {product.title.slice(0, 35)}{product.title.length > 35 ? '...' : ''}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {product.id.slice(0, 20)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${price.toFixed(2)}</td>
                      <td>${stats.cost.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '80px' }}>
                          <span style={{
                            fontWeight: 600,
                            color: stats.margin >= 0.4 ? 'var(--accent-green)' : stats.margin >= 0.25 ? 'var(--accent-amber)' : 'var(--accent-red)'
                          }}>
                            {(stats.margin * 100).toFixed(0)}%
                          </span>
                          <div className="profit-bar">
                            <div className={`fill ${marginClass}`} style={{ width: `${stats.margin * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{stats.sales}</td>
                      <td style={{ fontWeight: 500, color: 'var(--accent-green)' }}>${stats.revenue.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${product.status === 'ACTIVE' ? 'active' : 'pending'}`}>
                          {product.status.toLowerCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-ghost btn-sm">Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
