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
  onEdit?: () => void;
}

export const Modal: React.FC<ModalProps> = ({ zone, isOpen, onClose, modalCfg, onEdit }) => {
  if (!isOpen || !zone) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', zIndex: 10 }}>
          {onEdit && (
            <button
              onClick={onEdit}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '4px 10px', lineHeight: 1 }}
              title="Upravit"
            >✎</button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 'var(--radius)', lineHeight: 1 }}>✕</button>
        </div>
        <ZoneInfo zone={zone} cfg={modalCfg} />
      </div>
    </div>
  );
};
