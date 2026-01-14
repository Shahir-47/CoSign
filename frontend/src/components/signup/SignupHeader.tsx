import { Shield, Users, Clock, CheckCircle2 } from 'lucide-react';
import styles from './SignupHeader.module.css';

export default function SignupHeader() {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Create Your Account</h1>
      <p className={styles.subtitle}>
        Join CoSign and start holding yourself accountable with cryptographically verified commitments.
      </p>
      
      <div className={styles.features}>
        <div className={styles.feature}>
          <Shield size={18} />
          <span>Verified Commitments</span>
        </div>
        <div className={styles.feature}>
          <Users size={18} />
          <span>Peer Accountability</span>
        </div>
        <div className={styles.feature}>
          <Clock size={18} />
          <span>Deadline Enforcement</span>
        </div>
        <div className={styles.feature}>
          <CheckCircle2 size={18} />
          <span>Proof-Based Completion</span>
        </div>
      </div>
    </div>
  );
}
