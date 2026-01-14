import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, icon: Icon, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div className={styles.selectWrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={`${styles.selectContainer} ${error ? styles.hasError : ''}`}>
          {Icon && (
            <span className={styles.iconLeft}>
              <Icon size={18} />
            </span>
          )}
          <select
            ref={ref}
            className={`${styles.select} ${Icon ? styles.hasIconLeft : ''} ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className={styles.chevron}>
            <ChevronDown size={18} />
          </span>
        </div>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
