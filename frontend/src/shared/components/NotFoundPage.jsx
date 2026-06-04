import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import Button from './Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="mb-8">
          <h1 className="text-9xl font-black text-gradient mb-4">404</h1>
          <h2 className="text-2xl font-bold text-foreground mb-2">Page not found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <Button asChild>
            <Link to="/feed">
              <Home className="h-4 w-4" />
              Home feed
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
