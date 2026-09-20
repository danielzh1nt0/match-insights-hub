
import React from 'react';

type Chip = {
  id: string;
  label: string;
  count?: number;
};

type Props = {
  chips: Chip[];
  activeId: string;
  onSelect: (id: string) => void;
  onMore?: () => void;
  moreActiveCount?: number;
};

export function FilterChips({ chips, activeId, onSelect, onMore, moreActiveCount = 0 }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px 16px 2px' }}>
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <button
            key={chip.id}
            onClick={() => onSelect(chip.id)}
            aria-pressed={active}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 11px',
              borderRadius: '8px',
              border: active ? '1px solid var(--cream)' : '1px solid var(--wire)',
              background: active ? 'var(--cream)' : 'var(--surface)',
              color: active ? '#111' : 'var(--text-faint)',
              fontSize: '11.5px',
              fontWeight: active ? 700 : 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              minHeight: '32px',
              whiteSpace: 'nowrap',
            }}
          >
            {chip.label}
            {active && chip.count !== undefined && (
              <span style={{ background: 'rgba(17,17,17,0.15)', padding: '0 6px', borderRadius: '5px', fontSize: '10.5px', fontWeight: 700 }}>{chip.count}</span>
            )}
          </button>
        );
      })}

      {onMore && (
        <button
          onClick={onMore}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 11px', borderRadius: '8px', border: '1px solid var(--wire)', background: 'var(--surface)', color: 'var(--text-dim)', fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', minHeight: '32px' }}
        >
          More ▾
          {moreActiveCount > 0 && (
            <span style={{ background: 'var(--cream)', color: '#111', padding: '0 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>{moreActiveCount}</span>
          )}
        </button>
      )}
    </div>
  );
}
