import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

/** Estado vacío consistente: icono tenue + mensaje. */
export default function EmptyState({
  icon: Icon = Inbox,
  message,
  children,
}: {
  icon?: React.ElementType;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-gray-400">
      <Icon size={28} className="mb-2" />
      <p className="text-sm">{message}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
