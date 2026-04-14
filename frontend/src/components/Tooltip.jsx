import { useState } from 'react';

/**
 * Tooltip — positions itself above the hovered child using the event
 * target's live getBoundingClientRect so it works in any container.
 */
export default function Tooltip({ text, children, maxWidth = 220 }) {
  const [pos, setPos] = useState(null);

  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  };

  return (
    <span
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}
      style={{ display: 'inline-block' }}
    >
      {children}

      {pos && (
        <div style={{
          position: 'fixed',
          top: pos.y - 8,
          left: pos.x,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
          pointerEvents: 'none',
          animation: 'atlas-fade-in 0.1s ease both',
        }}>
          {/* Body */}
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-hi)',
            borderRadius: '6px',
            padding: '7px 11px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            maxWidth: `${maxWidth}px`,
            lineHeight: 1.6,
            boxShadow: 'var(--shadow-md)',
            whiteSpace: 'normal',
            marginBottom: '5px',
          }}>
            {text}
          </div>
          {/* Arrow */}
          <div style={{
            width: '8px', height: '8px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-hi)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'rotate(45deg)',
            margin: '-5px auto 0',
          }} />
        </div>
      )}
    </span>
  );
}
