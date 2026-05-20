import React, { useMemo } from 'react';
import { PlayArea } from './PlayArea';
import { Modal } from './Modal';
import { usePlayground } from '../hooks/usePlayground';
import { useZones } from '../hooks/useZones';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useIsMobile } from '../hooks/useIsMobile';
import { DEFAULT_MODAL_CFG } from './ZoneInfo';
import type { ModalCfg } from './ZoneInfo';

const CFG = {
  bgOpacity: 0.22,
  borderWidth: 4,
  glowRadius: 12,
  glowOpacity: 0.19,
  dotGlow: 8,
  mapHoverOpacity: 0.83,
  mapSelectedOpacity: 0.59,
  mapIdleOpacity: 0.22,
  mapStrokeWidth: 10,
  colorYellow: '#e8a540',
  colorGreen: '#6dd2f3',
};

export const HomePage: React.FC = () => {
  const isMobile = useIsMobile();
  const { zones } = useZones();
  const {
    selectedZoneId,
    hoveredZoneId,
    isModalOpen,
    selectZone,
    deselectZone,
    hoverZone,
  } = usePlayground();

  const [zoneCfgs] = useLocalStorage<Record<string, ModalCfg>>('zone-modal-cfgs', {});

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || null,
    [selectedZoneId, zones]
  );

  const activeModalCfg = useMemo(
    () => selectedZoneId
      ? { ...DEFAULT_MODAL_CFG, ...(zoneCfgs[selectedZoneId] ?? {}) }
      : DEFAULT_MODAL_CFG,
    [selectedZoneId, zoneCfgs]
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)' }}>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: '64px',
        backgroundColor: 'rgba(20,26,22,0.95)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{
          fontWeight: 700,
          letterSpacing: '0.12em',
          fontSize: '13px',
          color: 'var(--accent)',
          textTransform: 'uppercase',
        }}>
          Snower Park
        </span>
        <a
          href="#admin"
          style={{
            padding: '6px 16px',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            letterSpacing: '0.04em',
            transition: 'all 0.2s',
          }}
        >
          Admin
        </a>
      </nav>

      <header style={{ padding: isMobile ? '32px 16px 24px' : '72px 32px 48px', textAlign: 'center' }}>
        <p style={{
          fontSize: '11px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: '16px',
          fontWeight: 500,
        }}>
          Černošice
        </p>
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 72px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          lineHeight: 1.05,
        }}>
          Snower Park
        </h1>
        <p style={{
          marginTop: '20px',
          fontSize: '15px',
          color: 'var(--text-muted)',
          fontWeight: 300,
          letterSpacing: '0.02em',
        }}>
          Klikni na zónu a zjisti více
        </p>
      </header>

      <main style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? '16px' : '24px', padding: isMobile ? '0 12px 60px' : '0 32px 100px' }}>
        <div style={isMobile ? { width: '100%', display: 'flex', flexDirection: 'row', gap: '8px', overflowX: 'auto', paddingBottom: '4px' } : { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Herní zóny
          </p>
          {zones.map(zone => {
            const color = zone.color === 'yellow' ? CFG.colorYellow : CFG.colorGreen;
            const hex = color.replace('#', '');
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const isHovered = zone.id === hoveredZoneId;
            const isSelected = zone.id === selectedZoneId;
            const active = isHovered || isSelected;
            const bg = `rgba(${r},${g},${b},${CFG.bgOpacity})`;
            const glow = `0 0 ${CFG.glowRadius}px rgba(${r},${g},${b},${CFG.glowOpacity})`;
            const dotGlow = `0 0 ${CFG.dotGlow}px 3px rgba(${r},${g},${b},0.8)`;
            return (
              <div
                key={zone.id}
                onMouseEnter={() => hoverZone(zone.id)}
                onMouseLeave={() => hoverZone(null)}
                onClick={() => selectZone(zone.id)}
                style={{
                  padding: isMobile ? '8px 12px' : '10px 14px',
                  paddingLeft: active ? `${(isMobile ? 12 : 14) - CFG.borderWidth + 1}px` : isMobile ? '12px' : '14px',
                  flexShrink: isMobile ? 0 : undefined,
                  backgroundColor: active ? bg : 'var(--bg-surface)',
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  borderLeft: active ? `${CFG.borderWidth}px solid ${color}` : `1px solid var(--border)`,
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: active ? glow : 'none',
                }}
              >
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: color, flexShrink: 0, display: 'inline-block', boxShadow: active ? dotGlow : 'none', transition: 'box-shadow 0.15s' }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: active ? 700 : 600, color: active ? color : 'var(--text-primary)', transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {zone.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {zone.players} hráčů
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <PlayArea
          zones={zones}
          selectedZoneId={selectedZoneId}
          hoveredZoneId={hoveredZoneId}
          onZoneClick={selectZone}
          onZoneHover={hoverZone}
          mapHoverOpacity={CFG.mapHoverOpacity}
          mapSelectedOpacity={CFG.mapSelectedOpacity}
          mapIdleOpacity={CFG.mapIdleOpacity}
          mapStrokeWidth={CFG.mapStrokeWidth}
          colorYellow={CFG.colorYellow}
          colorGreen={CFG.colorGreen}
        />
        {!isMobile && <div style={{ width: '220px', flexShrink: 0 }} />}
      </main>

      <Modal
        zone={selectedZone}
        isOpen={isModalOpen}
        onClose={deselectZone}
        modalCfg={activeModalCfg}
      />
    </div>
  );
};
