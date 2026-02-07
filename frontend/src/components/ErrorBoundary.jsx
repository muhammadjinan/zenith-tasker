import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-red-200 p-8 flex flex-col items-center justify-center font-mono">
                    <div className="bg-slate-900 border border-red-500/20 p-6 rounded-xl max-w-4xl w-full shadow-2xl">
                        <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong.</h1>
                        <p className="mb-4 text-slate-400">The application crashed. Here are the details:</p>

                        <div className="bg-black/50 p-4 rounded-lg overflow-auto mb-4 border border-red-500/10">
                            <p className="font-bold text-red-300 mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="text-xs text-slate-500 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors"
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
