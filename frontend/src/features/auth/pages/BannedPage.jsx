import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldX, Clock, AlertTriangle, Mail, ArrowRight, CalendarClock } from 'lucide-react';

function parseExpiresDate(msg) {
  // Extract "until <date>" from message
  const match = msg?.match(/until (.+?)(?:\.|$)/);
  return match ? match[1].trim() : null;
}

function parseReason(msg) {
  // Extract "Reason: <reason>" from message
  const match = msg?.match(/Reason:\s*(.+?)(?:\.|$)/);
  return match ? match[1].trim() : null;
}

export default function BannedPage() {
  const [searchParams] = useSearchParams();
  const rawMsg = searchParams.get('error') || '';

  const isPermanent = rawMsg.includes('permanently');
  const expiresDate = parseExpiresDate(rawMsg);
  const reason = parseReason(rawMsg);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-orange-900/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg"
      >
        {/* Main card */}
        <div className="bg-card/80 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-2xl shadow-red-950/20">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl scale-150" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-700/30 border border-red-500/30 rounded-2xl flex items-center justify-center">
                <ShieldX className="w-10 h-10 text-red-400" strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl font-extrabold text-foreground mb-2">
              Tài khoản bị tạm khóa
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tài khoản của bạn đã bị khóa vì vi phạm chính sách cộng đồng của chúng tôi.
            </p>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 mb-6"
          >
            {/* Ban type */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/8 border border-red-500/15">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-300 mb-0.5">Loại khóa</p>
                <p className="text-sm text-foreground">
                  {isPermanent ? (
                    <span className="font-semibold text-red-400">Khóa vĩnh viễn</span>
                  ) : expiresDate ? (
                    <>Khóa tạm thời đến <span className="font-semibold text-amber-400">{expiresDate}</span></>
                  ) : (
                    'Tạm khóa'
                  )}
                </p>
              </div>
            </div>

            {/* Expires countdown (if temporary) */}
            {!isPermanent && expiresDate && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/15">
                <CalendarClock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-300 mb-0.5">Thời gian hết hạn</p>
                  <p className="text-sm text-foreground">
                    Tài khoản sẽ được tự động mở khóa vào{' '}
                    <span className="font-semibold text-amber-400">{expiresDate}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Reason */}
            {reason ? (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/50 border border-border">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">Lý do khóa</p>
                  <p className="text-sm text-foreground">{reason}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/50 border border-border">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">Lý do khóa</p>
                  <p className="text-sm text-muted-foreground italic">Không có lý do cụ thể được cung cấp.</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Appeal section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-2xl bg-primary/8 border border-primary/20 mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-primary">Kháng cáo lệnh khóa</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nếu bạn cho rằng đây là sai lầm, hãy liên hệ đội hỗ trợ để được xem xét lại.
              Vui lòng cung cấp đầy đủ thông tin tài khoản khi liên hệ.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3"
          >
            <a
              href="mailto:support@nova.app"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Mail className="w-4 h-4" />
              Liên hệ hỗ trợ
              <ArrowRight className="w-4 h-4 ml-auto" />
            </a>
            <Link
              to="/login"
              className="flex items-center justify-center w-full py-3 px-4 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted/50 transition-all duration-200"
            >
              Quay lại đăng nhập
            </Link>
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground/50 mt-6"
        >
          Nova — Chính sách cộng đồng được áp dụng nghiêm ngặt để bảo vệ tất cả người dùng.
        </motion.p>
      </motion.div>
    </div>
  );
}
