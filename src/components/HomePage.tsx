import React, { useMemo, useState, useCallback } from 'react';
import { PlayArea } from './PlayArea';
import { Modal } from './Modal';
import { usePlayground } from '../hooks/usePlayground';
import { useZones } from '../hooks/useZones';
import { useSyncedStorage } from '../hooks/useSyncedStorage';
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

const COLOR_MAP: Record<string, string> = {
  yellow: CFG.colorYellow,
  purple: CFG.colorGreen,
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

  const [zoneCfgs] = useSyncedStorage<Record<string, ModalCfg>>('zone-modal-cfgs', {});
  const [peekZoneId, setPeekZoneId] = useState<string | null>(null);

  const peekZone = useCallback((zoneId: string) => setPeekZoneId(zoneId), []);
  const closePeek = useCallback(() => setPeekZoneId(null), []);
  const openModalFromPeek = useCallback(() => {
    if (peekZoneId) { selectZone(peekZoneId); setPeekZoneId(null); }
  }, [peekZoneId, selectZone]);

  const peekZoneData = useMemo(
    () => peekZoneId ? zones.find(z => z.id === peekZoneId) ?? null : null,
    [peekZoneId, zones]
  );

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
          {isMobile ? 'Klepni na zónu a zjisti více' : 'Klikni na zónu a zjisti více'}
        </p>
      </header>

      <main style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? '16px' : '24px', padding: isMobile ? '0 12px 60px' : '0 32px 100px' }}>
        <div style={isMobile ? { width: '100%', display: 'flex', flexDirection: 'row', gap: '8px', overflowX: 'auto', paddingBottom: '4px' } : { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Herní zóny
          </p>
          {zones.map(zone => {
            const color = COLOR_MAP[zone.color] ?? zone.color;
            const hex = color.replace('#', '');
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const isHovered = zone.id === hoveredZoneId;
            const isSelected = zone.id === selectedZoneId;
            const isPeeked = zone.id === peekZoneId;
            const active = isHovered || isSelected || isPeeked;
            const bg = `rgba(${r},${g},${b},${CFG.bgOpacity})`;
            const glow = `0 0 ${CFG.glowRadius}px rgba(${r},${g},${b},${CFG.glowOpacity})`;
            const dotGlow = `0 0 ${CFG.dotGlow}px 3px rgba(${r},${g},${b},0.8)`;
            return (
              <div
                key={zone.id}
                onMouseEnter={() => !isMobile && hoverZone(zone.id)}
                onMouseLeave={() => !isMobile && hoverZone(null)}
                onClick={() => isMobile ? peekZone(zone.id) : selectZone(zone.id)}
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
          hoveredZoneId={isMobile ? peekZoneId : hoveredZoneId}
          onZoneClick={isMobile ? peekZone : selectZone}
          onZoneHover={isMobile ? () => {} : hoverZone}
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

      {/* Mobile peek bottom sheet */}
      {isMobile && peekZoneData && (
        <>
          <div
            onClick={closePeek}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }}
          />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 201,
            backgroundColor: 'var(--bg-card)',
            borderTop: `2px solid ${COLOR_MAP[peekZoneData.color] ?? peekZoneData.color}`,
            borderRadius: '16px 16px 0 0',
            padding: '20px 24px 32px',
            boxShadow: '0 -16px 48px rgba(0,0,0,0.5)',
            animation: 'peekIn 0.22s ease-out',
          }}>
            <style>{`@keyframes peekIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            {/* drag handle */}
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--border)', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>
                  Herní zóna
                </p>
                <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: COLOR_MAP[peekZoneData.color] ?? peekZoneData.color }}>
                  {peekZoneData.name}
                </h2>
              </div>
              <button onClick={closePeek} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, marginTop: '2px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: peekZoneData.description ? '12px' : '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                {peekZoneData.players} hráčů
              </span>
            </div>
            {peekZoneData.description && (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                {peekZoneData.description}
              </p>
            )}
            <button
              onClick={openModalFromPeek}
              style={{
                width: '100%',
                padding: '13px',
                backgroundColor: COLOR_MAP[peekZoneData.color] ?? peekZoneData.color,
                color: '#141a16',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              Zobrazit detail
            </button>
          </div>
        </>
      )}
    </div>
  );
};
