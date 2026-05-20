import React, { useMemo } from 'react';
import { PlayArea } from './PlayArea';
import { Modal } from './Modal';
import { usePlayground } from '../hooks/usePlayground';
import { ZONES } from '../data/zones';

export const HomePage: React.FC = () => {
  const {
    selectedZoneId,
    hoveredZoneId,
    isModalOpen,
    selectZone,
    deselectZone,
    hoverZone,
  } = usePlayground();

  const selectedZone = useMemo(
    () => ZONES.find((z) => z.id === selectedZoneId) || null,
    [selectedZoneId]
  );

  return (
    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#212121', marginBottom: '30px', fontSize: '32px' }}>
          🎮 Interaktivní Mapa Hřiště
        </h1>
        <PlayArea
          selectedZoneId={selectedZoneId}
          hoveredZoneId={hoveredZoneId}
          onZoneClick={selectZone}
          onZoneHover={hoverZone}
        />
        <Modal
          zone={selectedZone}
          isOpen={isModalOpen}
          onClose={deselectZone}
        />
      </div>
    </div>
  );
};
