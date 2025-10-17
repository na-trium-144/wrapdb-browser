export function Spinner() {
  return (
    <div className="abs-spinner">
      <style>{`
        .abs-spinner {
          display: inline-block;
          position: absolute;
          inset: 0;
          margin: auto;
          border: 0.125em solid currentColor;
          border-bottom-color: transparent;
          border-radius: 50%;
          width: 1em;
          height: 1em;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
