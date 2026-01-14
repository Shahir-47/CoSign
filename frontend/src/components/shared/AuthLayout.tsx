import Logo from './Logo';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.backgroundPattern}>
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gridOverlay} />
      </div>
      
      <div className={styles.container}>
        <header className={styles.header}>
          <Logo size="md" />
        </header>
        
        <main className={styles.main}>
          {children}
        </main>
        
        <footer className={styles.footer}>
          <p>&copy; {new Date().getFullYear()} CoSign. Enforce accountability, honor commitments.</p>
        </footer>
      </div>
    </div>
  );
}
