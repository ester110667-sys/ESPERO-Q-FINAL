
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Simples Error Boundary para evitar a "tela preta" caso ocorra um erro inesperado
class RootErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Render Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#000', 
          color: '#f97316',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '10px' }}>ALGO DEU ERRADO</h1>
          <p style={{ color: '#666', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Ocorreu um erro na renderização. Por favor, recarregue a página.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '20px', 
              padding: '12px 24px', 
              backgroundColor: '#f97316', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            RECARREGAR SITE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
