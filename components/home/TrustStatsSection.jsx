import { HeartHandshake, UsersRound, Star, ShieldCheck } from "lucide-react";
import styles from "./styles/TrustStatsSection.module.css";

const stats = [
  { value: "10K+", label: "Active Members", Icon: UsersRound, tone: "pink" },
  { value: "5K+", label: "Successful Matches", Icon: HeartHandshake, tone: "violet" },
  { value: "4.8/5", label: "Member Rating", Icon: Star, tone: "gold" },
  { value: "100%", label: "Verified Profiles", Icon: ShieldCheck, tone: "blue" },
];

export default function TrustStatsSection() {
  return (
    <section className={styles.statsSection} aria-label="LoveMatch community statistics">
      <div className={styles.statsInner}>
        {stats.map(({ value, label, Icon, tone }) => (
          <div className={styles.stat} key={label}>
            <span className={`${styles.statIcon} ${styles[tone]}`}><Icon size={24} strokeWidth={2.1} aria-hidden="true" /></span>
            <span className={styles.statText}><strong>{value}</strong><small>{label}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}
