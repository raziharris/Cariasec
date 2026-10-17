import React from "react";
export class BoardBoundary extends React.Component<
  {
    children: React.ReactNode;
    title?: string;
    button?: string;
    fallback?: React.ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        this.props.fallback ?? (
          <div className="board-loading" role="alert">
            <strong>{this.props.title}</strong>
            <button className="secondary" onClick={() => location.reload()}>
              {this.props.button}
            </button>
          </div>
        )
      );
    return this.props.children;
  }
}
