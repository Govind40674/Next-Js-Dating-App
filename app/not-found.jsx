"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./not-found.module.css";

export default function NotFound() {
  const pathname = usePathname();

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.code}>404</p>

        <h1 className={styles.title}>Page not found</h1>

        <p className={styles.message}>
          Sorry, we couldn not find the page you are looking for.
          It may have been removed, renamed, or the URL may be incorrect.
        </p>

        {pathname && (
          <p className={styles.path}>
            Requested URL: <strong>{pathname}</strong>
          </p>
        )}

        <Link href="/" className={styles.homeButton}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}