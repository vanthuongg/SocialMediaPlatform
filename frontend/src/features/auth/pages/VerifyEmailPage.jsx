import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Button from '@/shared/components/Button.jsx';

export default function VerifyEmailPage() {
  const { token } = useParams();

  const verifyMutation = useMutation({
    mutationFn: () => api.get(`/auth/verify-email/${token}`),
  });

  useEffect(() => {
    if (token) verifyMutation.mutate();
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      {verifyMutation.isPending && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-lg font-semibold text-foreground">Verifying your email...</p>
        </div>
      )}

      {verifyMutation.isSuccess && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Email verified!</h1>
          <p className="text-muted-foreground">Your account has been verified. You can now sign in.</p>
          <Button asChild variant="gradient" size="lg">
            <Link to="/login">Continue to sign in</Link>
          </Button>
        </div>
      )}

      {verifyMutation.isError && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verification failed</h1>
          <p className="text-muted-foreground">The verification link is invalid or has expired.</p>
          <Button asChild variant="outline">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      )}
    </motion.div>
  );
}
