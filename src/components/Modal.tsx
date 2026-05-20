import React from 'react';
import type { GameZone } from '../data/zones';
import { ZoneInfo } from './ZoneInfo';
import type { ModalCfg } from './ZoneInfo';
import styles from './Modal.module.css';

interface ModalProps {
  zone: GameZone | null;
  isOpen: boolean;
  onClose: () => void;
  modalCfg?: ModalCfg;
}

export const Modal: React.FC<ModalProps> = ({ zone, isOpen, onClose, modalCfg }) => {
  if (!isOpen || !zone) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        <ZoneInfo zone={zone} cfg={modalCfg} />
      </div>
    </div>
  );
};
