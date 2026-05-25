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
  mapIdleOpacity: 0.30,
  mapStrokeWidth: 10,
  colorYellow: '#6dd2f3',
  colorGreen: '#6dd2f3',
};

const COLOR_MAP: Record<string, string> = {
  yellow: CFG.colorYellow,
  purple: CFG.colorGreen,
};

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

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
  const [showOutlines, setShowOutlines] = useState(true);

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

      <header style={{ padding: isMobile ? '24px 16px 16px' : '72px 32px 48px', textAlign: 'center' }}>
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
          Vyber si hru z menu nebo na mapě
        </p>
      </header>

      <main style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'center',
        alignItems: isMobile ? 'center' : 'flex-start',
        gap: isMobile ? '12px' : '24px',
        padding: isMobile ? '0 12px 60px' : '0 32px 100px',
      }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Hry
              </p>
              <button
                onClick={() => setShowOutlines(v => !v)}
                title={showOutlines ? 'Skrýt zóny na mapě' : 'Zobrazit zóny na mapě'}
                style={{ background: 'none', border: `1px solid ${showOutlines ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '4px', color: showOutlines ? 'var(--accent)' : 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', padding: '3px 9px', lineHeight: 1.5 }}
              >
                {showOutlines ? '👁' : '🙈'}
              </button>
            </div>
            {zones.map(zone => {
              const color = COLOR_MAP[zone.color] ?? zone.color;
              const { r, g, b } = hexToRgb(color);
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
                    padding: '10px 14px',
                    paddingLeft: active ? `${14 - CFG.borderWidth + 1}px` : '14px',
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
        )}

        {/* Map */}
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
          showOutlines={showOutlines}
        />

        {/* Mobile: zones grid */}
        {isMobile && (
          <div style={{ width: '100%' }}>
            {/* Map outline toggle — big, finger-friendly */}
            <button
              onClick={() => setShowOutlines(v => !v)}
              style={{
                width: '100%',
                padding: '18px 20px',
                marginBottom: '16px',
                backgroundColor: showOutlines ? 'rgba(232,165,64,0.10)' : 'var(--bg-surface)',
                border: `2px solid ${showOutlines ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '14px',
                color: showOutlines ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '17px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                letterSpacing: '0.01em',
              }}
            >
              <span style={{ fontSize: '22px' }}>{showOutlines ? '👁' : '🙈'}</span>
              {showOutlines ? 'Zóny na mapě: ZAP' : 'Zóny na mapě: VYP'}
            </button>

            <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Hry
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}>
              {zones.map(zone => {
                const color = COLOR_MAP[zone.color] ?? zone.color;
                const { r, g, b } = hexToRgb(color);
                const isActive = zone.id === peekZoneId;
                return (
                  <div
                    key={zone.id}
                    onClick={() => peekZone(zone.id)}
                    style={{
                      backgroundColor: isActive ? `rgba(${r},${g},${b},0.22)` : 'var(--bg-surface)',
                      border: `${isActive ? 2 : 1}px solid ${isActive ? color : 'var(--border)'}`,
                      borderTop: `${isActive ? 5 : 4}px solid ${color}`,
                      borderRadius: '10px',
                      padding: '14px 14px 12px',
                      cursor: 'pointer',
                      minHeight: '90px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'all 0.15s',
                      boxShadow: isActive
                        ? `0 0 0 2px rgba(${r},${g},${b},0.5), 0 4px 20px rgba(${r},${g},${b},0.35)`
                        : 'none',
                      transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    }}
                  >
                    <p style={{ fontSize: '16px', fontWeight: 700, color: isActive ? color : 'var(--text-primary)', lineHeight: 1.2 }}>
                      {zone.name}
                    </p>
                    <p style={{ fontSize: '13px', color: isActive ? `rgba(${r},${g},${b},0.8)` : 'var(--text-muted)', fontWeight: 500 }}>
                      {zone.players} hráčů
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {peekZoneData.description}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
