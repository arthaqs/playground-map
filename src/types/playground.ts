export interface PlaygroundState {
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  isModalOpen: boolean;
}

export interface PlaygroundActions {
  selectZone: (zoneId: string) => void;
  deselectZone: () => void;
  hoverZone: (zoneId: string | null) => void;
}
