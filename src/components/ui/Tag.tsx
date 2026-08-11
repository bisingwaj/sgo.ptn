import type { ReactNode } from "react";
import styles from "./Tag.module.scss";

export type TagTone =
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "magenta"
  | "gray"
  | "outline";

interface TagProps {
  tone?: TagTone;
  children: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md";
}

export function Tag({ tone = "gray", children, icon, size = "md" }: TagProps) {
  return (
    <span className={`${styles.tag} ${styles[`tone_${tone}`]} ${styles[`size_${size}`]}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
