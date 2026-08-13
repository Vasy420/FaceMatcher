import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-[10px] font-mono text-rose-300 tracking-[0.2em] uppercase">Something broke</p>
          <h1 className="font-syne font-bold text-2xl text-white mt-2">The UI hit an unexpected error</h1>
          <p className="text-sm text-slate-400 mt-2 break-words">{this.state.error.message}</p>
          <button
            className="btn-primary mt-5"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign('/');
            }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }
}
