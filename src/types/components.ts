// Component prop interfaces
import { ReactNode } from "react";
import { User, UserRole } from "./auth";

// Navigation components
export interface NavbarProps {
  user?: User;
  onLogout: () => void;
  className?: string;
}

export interface SidebarProps {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  children?: NavItem[];
  requiresRole?: UserRole[];
  isActive?: boolean;
}

export interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}

// Form components
export interface ButtonProps {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface SelectProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface OtpInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

// Layout components
export interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showNavbar?: boolean;
  showSidebar?: boolean;
  className?: string;
}

export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
}

// Data display components
export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface BadgeProps {
  children: ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "default";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Modal components
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

// Loading and feedback components
export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export interface AlertProps {
  type: "success" | "warning" | "error" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

// Utility components
export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
  }>;
  className?: string;
}
