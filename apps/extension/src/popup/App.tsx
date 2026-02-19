import { useState, useEffect } from 'react';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Test chrome API is available
    console.log('AIMO Extension popup loaded');
  }, []);

  return (
    <div style={{ padding: '16px', width: '300px' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '12px' }}>AIMO 知识库</h1>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
        快速保存网页内容到 AIMO
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        点击次数: {count}
      </button>
    </div>
  );
}

export default App;
