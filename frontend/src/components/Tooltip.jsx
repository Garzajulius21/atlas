import { useState, useRef, useCallback } from 'react';

/**
 * Tooltip — shows a helper label above any child element on hover.
 * Uses fixed positioning so it escapes overflow:hidden containers.
 */
export default function Tooltip({ text, children, maxWidth = 220 }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const show = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.top - 10, left: r.left + r.width / 2 });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
    >
      {children}

      {pos && (
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
          pointerEvents: 'none',
          animation: 'atlas-fade-in 0.1s ease both',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-hi)',
            borderRadius: '6px',
            padding: '7px 11px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            maxWidth: `${maxWidth}px`,
            lineHeight: 1.55,
            boxShadow: 'var(--shadow-md)',
            marginBottom: '6px',
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
