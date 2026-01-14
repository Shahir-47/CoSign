import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, helperText, type, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className={styles.inputWrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={`${styles.inputContainer} ${error ? styles.hasError : ''}`}>
          {Icon && (
            <span className={styles.iconLeft}>
              <Icon size={18} />
            </span>
          )}
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={`${styles.input} ${Icon ? styles.hasIconLeft : ''} ${isPassword ? styles.hasIconRight : ''} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && <span className={styles.error}>{error}</span>}
        {helperText && !error && <span className={styles.helperText}>{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
