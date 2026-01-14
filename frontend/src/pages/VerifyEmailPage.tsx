import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/shared/AuthLayout';
import Card, { CardContent, CardFooter } from '../components/shared/Card';
import VerifyEmailStatus from '../components/verify-email/VerifyEmailStatus';
import VerifyEmailActions from '../components/verify-email/VerifyEmailActions';
import styles from './VerifyEmailPage.module.css';

type VerificationStatus = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<string | undefined>();

  const token = searchParams.get('token');

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setStatus('error');
      setError('Verification token is missing. Please check your email link.');
      return;
    }

    setStatus('loading');
    setError(undefined);

    try {
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to verify email');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }, [token]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  const handleRetry = () => {
    verifyEmail();
  };

  return (
    <AuthLayout>
      <Card className={styles.card}>
        <CardContent>
          <VerifyEmailStatus status={status} error={error} onRetry={handleRetry} />
        </CardContent>
        <CardFooter>
          <VerifyEmailActions status={status} />
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
