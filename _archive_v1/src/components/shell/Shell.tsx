import type { ReactNode } from "react";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import styles from "./Shell.module.css";

interface ShellProps {
  crumbs?: { label: string; href?: string }[];
  children: ReactNode;
  productLabel?: string;
}

export function Shell({ crumbs, children, productLabel }: ShellProps) {
  return (
    <div className={styles.shell}>
      <Header crumbs={crumbs} productLabel={productLabel} />
      <div className={styles.body}>
        <SideNav />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
