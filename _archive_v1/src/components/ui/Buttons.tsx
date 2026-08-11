import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Buttons.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  children,
  className,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      className={`${styles.btn} ${styles[`v_${variant}`]} ${styles[`s_${size}`]} ${className ?? ""}`}
    >
      {icon && iconPosition === "left" && <span className={styles.ico}>{icon}</span>}
      <span className={styles.lbl}>{children}</span>
      {icon && iconPosition === "right" && <span className={styles.ico}>{icon}</span>}
    </button>
  );
}
