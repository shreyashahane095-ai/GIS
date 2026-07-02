import { Component } from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-box">
            <h2>Something went wrong</h2>
            <p>The application failed to load. Please check the browser console for details.</p>
            {this.state.error && (
              <pre className="error-message">{this.state.error.toString()}</pre>
            )}
            {this.state.errorInfo && (
              <pre className="error-stack">{this.state.errorInfo.componentStack}</pre>
            )}
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;