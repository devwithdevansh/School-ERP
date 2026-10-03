import React from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MobileIcon,
  FileTextIcon,
  CardStackIcon,
  GlobeIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ReloadIcon,
  CheckIcon,
  Cross2Icon,
  LockClosedIcon,
  EnvelopeClosedIcon,
  ArrowRightIcon,
  ExitIcon,
  DotsVerticalIcon,
  ViewVerticalIcon,
  PersonIcon,
  LayersIcon,
  ReaderIcon,
  GearIcon,
  DashboardIcon,
  ClockIcon,
  ChatBubbleIcon,
  BellIcon,
  Pencil1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

// Icon adapter wrapping SVG or Radix icon to support standard className, size, and styling
const createRadixWrapper = (IconComponent: React.ComponentType<any>) => {
  const WrappedIcon: React.FC<IconProps> = ({ className = '', size = 16, strokeWidth, ...props }) => (
    <IconComponent className={className} width={size} height={size} {...props} />
  );
  return WrappedIcon;
};

export const Search = createRadixWrapper(MagnifyingGlassIcon);
export const Plus = createRadixWrapper(PlusIcon);
export const Smartphone = createRadixWrapper(MobileIcon);
export const FileText = createRadixWrapper(FileTextIcon);
export const CreditCard = createRadixWrapper(CardStackIcon);
export const Globe = createRadixWrapper(GlobeIcon);
export const AlertTriangle = createRadixWrapper(ExclamationTriangleIcon);
export const Calendar = createRadixWrapper(CalendarIcon);
export const ChevronLeft = createRadixWrapper(ChevronLeftIcon);
export const ChevronRight = createRadixWrapper(ChevronRightIcon);
export const ChevronDown = createRadixWrapper(ChevronDownIcon);
export const ChevronUp = createRadixWrapper(ChevronUpIcon);
export const Check = createRadixWrapper(CheckIcon);
export const X = createRadixWrapper(Cross2Icon);
export const Lock = createRadixWrapper(LockClosedIcon);
export const Mail = createRadixWrapper(EnvelopeClosedIcon);
export const ArrowRight = createRadixWrapper(ArrowRightIcon);
export const LogOut = createRadixWrapper(ExitIcon);
export const MoreVertical = createRadixWrapper(DotsVerticalIcon);
export const Columns2 = createRadixWrapper(ViewVerticalIcon);
export const Clock = createRadixWrapper(ClockIcon);
export const MessageCircle = createRadixWrapper(ChatBubbleIcon);
export const Bell = createRadixWrapper(BellIcon);
export const Pencil = createRadixWrapper(Pencil1Icon);
export const Trash2 = createRadixWrapper(TrashIcon);
export const BookOpen = createRadixWrapper(ReaderIcon);

// Spinner / Loader with animate-spin
export const Loader2: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <ReloadIcon className={`animate-spin ${className}`} width={size} height={size} {...props} />
);

// High-fidelity custom SVGs for icons not directly matched in Radix
export const Users: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const Coins: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="M16.5 13.5h.5v3" />
  </svg>
);

export const Bus: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M8 6v6" />
    <path d="M15 6v6" />
    <path d="M2 12h19.6" />
    <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.6 19 6 17.8 6H4c-1.1 0-2 .9-2 2v10h3" />
    <circle cx="7" cy="18" r="2" />
    <path d="M9 18h5" />
    <circle cx="16" cy="18" r="2" />
  </svg>
);

export const GraduationCap: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export const Wallet: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </svg>
);

export const CalendarCheck: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);

export const AlertCircle: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);
