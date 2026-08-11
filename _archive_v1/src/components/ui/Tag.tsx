import type { ReactNode } from "react";
import styles from "./Tag.module.css";

type Tone =
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "teal"
  | "magenta"
  | "gray"
  | "outline";

interface TagProps {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function Tag({ tone = "gray", children, icon, size = "md", className }: TagProps) {
  return (
    <span
      className={`${styles.tag} ${styles[`t_${tone}`]} ${styles[`s_${size}`]} ${className ?? ""}`}
    >
      {icon && <span className={styles.ico}>{icon}</span>}
      {children}
    </span>
  );
}
