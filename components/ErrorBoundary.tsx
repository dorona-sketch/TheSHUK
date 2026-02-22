import React, { ErrorInfo, ReactNode } from 'react';

const ReactComponentBase = React.Component as any;

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends ReactComponentBase {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
      window.location.reload();
  };

  private handleResetStorage = () => {
      if(window.confirm("This will clear all local data (listings, profile, chats) to fix the crash. This action cannot be undone. Are you sure?")) {
          localStorage.clear();
          window.location.href = '/';
      }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-red-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                    We encountered an unexpected error while rendering this component. <br/>
                    Please try reloading the application.
                </p>
                
                {this.state.error && (
                    <div className="bg-red-50 p-4 rounded-lg text-left mb-8 border border-red-100 overflow-auto max-h-48 custom-scrollbar">
                        <p className="text-xs font-bold text-red-800 uppercase mb-1">Error Details</p>
                        <code className="text-xs text-red-700 font-mono block break-words">
                            {this.state.error.toString()}
                        </code>
                        {this.state.errorInfo && (
                            <details className="mt-2">
                                <summary className="text-[10px] text-red-500 cursor-pointer hover:text-red-700">View Stack Trace</summary>
                                <pre className="text-[10px] text-red-600 mt-1 whitespace-pre-wrap">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                )}
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={this.handleReload}
                        className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-md active:scale-[0.98]"
                    >
                        Reload Application
                    </button>
                    <button 
                        onClick={this.handleResetStorage}
                        className="w-full py-3 bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 rounded-xl font-medium transition-colors text-sm"
                    >
                        Hard Reset (Clear Local Data)
                    </button>
                </div>
                
                <div className="mt-6 text-[10px] text-gray-400">
                    If this persists, please contact support with the error details above.
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
