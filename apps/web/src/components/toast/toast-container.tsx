import { view, useService } from '@rabjs/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastService, type ToastType } from '../../services/toast.service';

const toastTypeConfig: Record<ToastType, { icon: typeof Info; iconClass: string; accentClass: string }> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-primary-600 dark:text-primary-400',
    accentClass: 'border-l-primary-500',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-500',
    accentClass: 'border-l-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    accentClass: 'border-l-amber-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    accentClass: 'border-l-blue-500',
  },
  default: {
    icon: Info,
    iconClass: 'text-gray-500 dark:text-gray-400',
    accentClass: 'border-l-gray-200 dark:border-l-dark-700',
  },
};

export const ToastContainer = view(() => {
  const toastService = useService(ToastService);

  if (!toastService.toasts.length) {
    return null;
  }

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toastService.toasts.map((toast) => {
        const config = toastTypeConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 px-4 py-3 shadow-lg animate-slide-up border-l-4 ${config.accentClass}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 ${config.iconClass}`} />
            <div className="flex-1 text-sm text-gray-700 dark:text-gray-100">{toast.message}</div>
            <button
              type="button"
              onClick={() => toastService.remove(toast.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="关闭提示"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
});
