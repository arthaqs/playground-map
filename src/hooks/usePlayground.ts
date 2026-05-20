import { useState, useCallback } from 'react';
import type { PlaygroundState, PlaygroundActions } from '../types/playground';

export const usePlayground = (): PlaygroundState & PlaygroundActions => {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectZone = useCallback((zoneId: string) => {
    setSelectedZoneId(zoneId);
    setIsModalOpen(true);
  }, []);

  const deselectZone = useCallback(() => {
    setSelectedZoneId(null);
    setIsModalOpen(false);
  }, []);

  const hoverZone = useCallback((zoneId: string | null) => {
    setHoveredZoneId(zoneId);
  }, []);

  return {
    selectedZoneId,
    hoveredZoneId,
    isModalOpen,
    selectZone,
    deselectZone,
    hoverZone,
  };
};
