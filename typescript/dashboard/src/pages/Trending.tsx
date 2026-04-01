import { useApi } from '../hooks/useApi';

interface CandidatesResponse {
  candidates: any[];
  total: number;
}

export default function Trending() {
  const { data, loading } = useApi<CandidatesResponse>('/api/products/candidates', 30000);

  const displayCandidates = (data?.candidates || []).length > 0 ? data!.candidates : [
    { id: 'abc123', title: 'Mini Projector HD 1080P WiFi', source: 'tiktok_shop', supplier_price: 18.50, suggested_retail_price: 49.99, profit_margin: 0.63, review_score: 4.7, review_count: 2341, trending_score: 92, category: 'electronics' },
    { id: 'def456', title: 'Cloud LED Lamp Aesthetic Room', source: 'aliexpress_trending', supplier_price: 8.20, suggested_retail_price: 24.99, profit_margin: 0.67, review_score: 4.5, review_count: 891, trending_score: 87, category: 'home-garden' },
    { id: 'ghi789', title: 'Electric Spin Scrubber Pro', source: 'amazon_movers', supplier_price: 12.40, suggested_retail_price: 34.99, profit_margin: 0.65, review_score: 4.6, review_count: 1567, trending_score: 84, category: 'home-garden' },
    { id: 'jkl012', title: 'Sunset Lamp Projection 16 Colors', source: 'tiktok_shop', supplier_price: 6.80, suggested_retail_price: 19.99, profit_margin: 0.66, review_score: 4.4, review_count: 3102, trending_score: 79, category: 'home-garden' },
    { id: 'mno345', title: 'Magnetic Power Bank 10000mAh', source: 'aliexpress_trending', supplier_price: 14.20, suggested_retail_price: 39.99, profit_margin: 0.64, review_score: 4.8, review_count: 756, trending_score: 75, category: 'electronics' },
  ];

  const getScoreClass = (score: number) => score >= 80 ? 'hot' : score >= 60 ? 'warm' : 'cool';
  const sourceLabel = (s: string) => s === 'tiktok_shop' ? '🎵 TikTok' : s === 'amazon_movers' ? '📦 Amazon' : '🛒 AliExpress';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Trending Products</h2>
            <p>{displayCandidates.length} candidates awaiting approval</p>
          </div>
          <button className="btn btn-primary">🔍 Run Scraper</button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Source</th>
                <th>Cost</th>
                <th>Sell Price</th>
                <th>Margin</th>
                <th>Reviews</th>
                <th>Trend</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayCandidates.length === 0 ? (
                [1,2,3].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5,6,7,8].map(j => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : (
                displayCandidates.map((c, i) => (
                  <tr key={i} className="fade-in-up">
                    <td>
                      <div style={{ maxWidth: 250 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                          {c.title.slice(0, 40)}{c.title.length > 40 ? '...' : ''}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {c.category} · ID: {c.id}
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: '0.8rem' }}>{sourceLabel(c.source)}</span></td>
                    <td>${c.supplier_price.toFixed(2)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${c.suggested_retail_price.toFixed(2)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                        {(c.profit_margin * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.825rem' }}>
                        {c.review_score}★ <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({c.review_count.toLocaleString()})</span>
                      </div>
                    </td>
                    <td>
                      <div className="trending-score">
                        <div className={`score-ring ${getScoreClass(c.trending_score)}`}>
                          {c.trending_score}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-success btn-sm">✓ List</button>
                        <button className="btn btn-ghost btn-sm">Skip</button>
                      </div>
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
