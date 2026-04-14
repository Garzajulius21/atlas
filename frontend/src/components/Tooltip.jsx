import { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip — renders via a portal into document.body so it always positions
 * relative to the viewport regardless of transformed/filtered ancestors.
 *
 * Uses `bottom` anchoring so the tooltip sits a fixed gap above the trigger
 * without needing to know the tooltip's own height upfront.
 *
 * block prop: set true when the trigger should fill its container width
 * (e.g. table cells) so the tooltip centers over the full column.
 */
export default function Tooltip({ text, children, maxWidth = 220, block = false }) {
  const [pos, setPos] = useState(null);

  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({
      x: r.left + r.width / 2,
      bottom: window.innerHeight - r.top + 6,
    });
  };

  return (
    <span
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}
      style={{ display: block ? 'block' : 'inline-block', width: block ? '100%' : undefined }}
    >
      {children}

      {pos && createPortal(
        <div style={{
          position: 'fixed',
          bottom: pos.bottom,
          left: pos.x,
          transform: 'translateX(-50%)',
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
          {/* Arrow pointing down toward the trigger */}
          <div style={{
            width: '8px', height: '8px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-hi)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'rotate(45deg)',
            margin: '-5px auto 0',
          }} />
        </div>,
        document.body
      )}
    </span>
  );
}
