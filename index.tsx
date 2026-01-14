
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Explicitly defined types for props and state to ensure TypeScript compatibility
interface RootErrorBoundaryProps {
  children?: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
}

// Simple Error Boundary to avoid "black screen" in case of unexpected errors
class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  // Fix: Explicitly declare the state property for TypeScript
  public state: RootErrorBoundaryState = {
    hasError: false
  };

  // Fix: Explicitly declare the props property to resolve TypeScript missing property error in specific environments
  public props: RootErrorBoundaryProps;

  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  // Updates state when an error is caught during rendering
  static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  // Logs the error details for debugging
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Render Error:", error, errorInfo);
  }

  render() {
    // If an error occurred, render custom recovery UI
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

    // Otherwise, render children
    // Fix: Accessing children from correctly typed this.props
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