import { FileSignature } from 'lucide-react';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 48,
  };

  return (
    <div className={`${styles.logo} ${styles[size]}`}>
      <div className={styles.iconWrapper}>
        <FileSignature size={iconSizes[size]} strokeWidth={2} />
      </div>
      {showText && <span className={styles.text}>CoSign</span>}
    </div>
  );
}
