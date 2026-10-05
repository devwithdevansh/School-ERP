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
  ArrowLeftIcon,
  ArrowTopRightIcon,
  ArrowBottomRightIcon,
  ExitIcon,
  DotsVerticalIcon,
  ViewVerticalIcon,
  ViewGridIcon,
  PersonIcon,
  LayersIcon,
  ReaderIcon,
  GearIcon,
  DashboardIcon,
  ClockIcon,
  ChatBubbleIcon,
  BellIcon,
  Pencil1Icon,
  Pencil2Icon,
  TrashIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ActivityLogIcon,
  MixerHorizontalIcon,
  ResetIcon,
  PaperPlaneIcon,
  CopyIcon,
  UploadIcon,
  DownloadIcon,
  InfoCircledIcon,
  CircleBackslashIcon,
  MagicWandIcon,
  ClipboardIcon,
  EyeOpenIcon,
  EyeNoneIcon,
  CameraIcon,
  ListBulletIcon,
  SquareIcon,
  HamburgerMenuIcon,
  BarChartIcon,
} from '@radix-ui/react-icons';

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

// Icon adapter wrapping SVG or Radix icon to support standard className, size, and styling
const createRadixWrapper = (IconComponent: any) => {
  const WrappedIcon = ({ className = '', size = 16, strokeWidth, ...props }: IconProps) => (
    <IconComponent className={className} width={size} height={size} {...(props as any)} />
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
export const ArrowLeft = createRadixWrapper(ArrowLeftIcon);
export const ArrowUpRight = createRadixWrapper(ArrowTopRightIcon);
export const ArrowDownRight = createRadixWrapper(ArrowBottomRightIcon);
export const LogOut = createRadixWrapper(ExitIcon);
export const MoreVertical = createRadixWrapper(DotsVerticalIcon);
export const Columns2 = createRadixWrapper(ViewVerticalIcon);
export const PanelLeft = createRadixWrapper(ViewVerticalIcon);
export const LayoutGrid = createRadixWrapper(ViewGridIcon);
export const Clock = createRadixWrapper(ClockIcon);
export const MessageCircle = createRadixWrapper(ChatBubbleIcon);
export const Bell = createRadixWrapper(BellIcon);
export const BellRing = createRadixWrapper(BellIcon);
export const Pencil = createRadixWrapper(Pencil1Icon);
export const Edit3 = createRadixWrapper(Pencil2Icon);
export const Trash2 = createRadixWrapper(TrashIcon);
export const BookOpen = createRadixWrapper(ReaderIcon);
export const Layers = createRadixWrapper(LayersIcon);
export const Settings = createRadixWrapper(GearIcon);
export const LayoutDashboard = createRadixWrapper(DashboardIcon);
export const CheckCircle2 = createRadixWrapper(CheckCircledIcon);
export const CheckCircle = createRadixWrapper(CheckCircledIcon);
export const XCircle = createRadixWrapper(CrossCircledIcon);
export const Activity = createRadixWrapper(ActivityLogIcon);
export const Filter = createRadixWrapper(MixerHorizontalIcon);
export const RotateCcw = createRadixWrapper(ResetIcon);
export const RefreshCw = createRadixWrapper(ResetIcon);
export const Send = createRadixWrapper(PaperPlaneIcon);
export const Copy = createRadixWrapper(CopyIcon);
export const Upload = createRadixWrapper(UploadIcon);
export const Download = createRadixWrapper(DownloadIcon);
export const Info = createRadixWrapper(InfoCircledIcon);
export const Ban = createRadixWrapper(CircleBackslashIcon);
export const Wand2 = createRadixWrapper(MagicWandIcon);
export const ClipboardList = createRadixWrapper(ClipboardIcon);
export const Eye = createRadixWrapper(EyeOpenIcon);
export const EyeOff = createRadixWrapper(EyeNoneIcon);
export const Camera = createRadixWrapper(CameraIcon);
export const List = createRadixWrapper(ListBulletIcon);
export const Square = createRadixWrapper(SquareIcon);
export const Menu = createRadixWrapper(HamburgerMenuIcon);
export const BarChart3 = createRadixWrapper(BarChartIcon);
export const User = createRadixWrapper(PersonIcon);

const BaseLoader = createRadixWrapper(ReloadIcon);
export const Loader2 = ({ className = '', ...props }: IconProps) => (
  <BaseLoader className={`animate-spin ${className}`} {...(props as any)} />
);

// High-fidelity custom SVGs for icons not directly matched in Radix
const createCustomIcon = (paths: React.ReactNode): React.FC<IconProps> => {
  const CustomIcon: React.FC<IconProps> = ({ className = '', size = 16, ...props }) => (
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
      {paths}
    </svg>
  );
  return CustomIcon;
};

export const Users = createCustomIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);

export const Coins = createCustomIcon(
  <>
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="M16.5 13.5h.5v3" />
  </>
);

export const Bus = createCustomIcon(
  <>
    <path d="M8 6v6" />
    <path d="M15 6v6" />
    <path d="M2 12h19.6" />
    <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.6 19 6 17.8 6H4c-1.1 0-2 .9-2 2v10h3" />
    <circle cx="7" cy="18" r="2" />
    <path d="M9 18h5" />
    <circle cx="16" cy="18" r="2" />
  </>
);

export const GraduationCap = createCustomIcon(
  <>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </>
);

export const Wallet = createCustomIcon(
  <>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </>
);

export const CalendarCheck = createCustomIcon(
  <>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </>
);

export const CalendarDays = createCustomIcon(
  <>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
  </>
);

export const AlertCircle = createCustomIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </>
);

export const Save = createCustomIcon(
  <>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V3.4" />
  </>
);

export const UserPlus = createCustomIcon(
  <>
    <path d="M2 21a8 8 0 0 1 13.292-6" />
    <circle cx="10" cy="8" r="5" />
    <path d="M19 16v6" />
    <path d="M22 19h-6" />
  </>
);

export const UserCheck = createCustomIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </>
);

export const History = createCustomIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </>
);

export const Award = createCustomIcon(
  <>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </>
);

export const FileSpreadsheet = createCustomIcon(
  <>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6.5z" />
    <path d="M15 2v5h5" />
    <path d="M8 13h2" />
    <path d="M14 13h2" />
    <path d="M8 17h2" />
    <path d="M14 17h2" />
  </>
);

export const Database = createCustomIcon(
  <>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </>
);

export const Construction = createCustomIcon(
  <>
    <rect x="2" y="6" width="20" height="8" rx="1" />
    <path d="M17 14v7" />
    <path d="M7 14v7" />
    <path d="M17 3v3" />
    <path d="M7 3v3" />
    <path d="M10 14 2.3 6.3" />
    <path d="m14 6 7.7 7.7" />
    <path d="m8 6 8 8" />
  </>
);

export const ShieldCheck = createCustomIcon(
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </>
);

export const ShieldAlert = createCustomIcon(
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>
);

export const ShieldOff = createCustomIcon(
  <>
    <path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18" />
    <path d="M4.73 4.73 4 5v7c0 5 3.5 7.5 7.66 8.95a1 1 0 0 0 .67 0 9.35 9.35 0 0 0 1.58-.72" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </>
);

export const Printer = createCustomIcon(
  <>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </>
);

export const Building2 = createCustomIcon(
  <>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </>
);

export const KeyRound = createCustomIcon(
  <>
    <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
    <circle cx="16.5" cy="7.5" r="0.5" fill="currentColor" />
  </>
);

export const DollarSign = createCustomIcon(
  <>
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </>
);

export const Tag = createCustomIcon(
  <>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42Z" />
    <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
  </>
);

export const Phone = createCustomIcon(
  <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.738 1.555l-.467.360a1 1 0 0 0-.292 1.21 12.35 12.35 0 0 0 6.329 6.443" />
);

export const Landmark = createCustomIcon(
  <>
    <line x1="3" x2="21" y1="22" y2="22" />
    <line x1="6" x2="6" y1="18" y2="11" />
    <line x1="10" x2="10" y1="18" y2="11" />
    <line x1="14" x2="14" y1="18" y2="11" />
    <line x1="18" x2="18" y1="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  </>
);

export const Library = createCustomIcon(
  <>
    <path d="m16 6 4 14" />
    <path d="M12 6v14" />
    <path d="M8 8v12" />
    <path d="M4 4v16" />
  </>
);

export const BookMarked = createCustomIcon(
  <>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    <polyline points="10 2 10 10 13 7 16 10 16 2" />
  </>
);

export const MapPin = createCustomIcon(
  <>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </>
);

export const Coffee = createCustomIcon(
  <>
    <path d="M10 2v2" />
    <path d="M14 2v2" />
    <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h15a4 4 0 1 1 0 8h-1" />
  </>
);

export const Wrench = createCustomIcon(
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" />
);

export const Zap = createCustomIcon(
  <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
);

export const Truck = createCustomIcon(
  <>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </>
);

export const MessageSquare = createCustomIcon(
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
);

export const CheckSquare = createCustomIcon(
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="m9 12 2 2 4-4" />
  </>
);

export const ClipboardX = createCustomIcon(
  <>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m15 11-6 6" />
    <path d="m9 11 6 6" />
  </>
);

export const Receipt = createCustomIcon(
  <>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 7h8" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
  </>
);

export const IndianRupee = createCustomIcon(
  <>
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="m6 13 8.5 8" />
    <path d="M6 13h3" />
    <path d="M9 13c6.667 0 6.667-10 0-10" />
  </>
);

export const ToggleRight = createCustomIcon(
  <>
    <rect width="20" height="12" x="2" y="6" rx="6" ry="6" />
    <circle cx="16" cy="12" r="2" />
  </>
);
