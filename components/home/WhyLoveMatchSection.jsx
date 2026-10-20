import { Heart, ShieldCheck, MessagesSquare, Sparkles } from "lucide-react";
import styles from "./styles/WhyLoveMatchSection.module.css";

const features = [
  { title: "Real People", description: "Verified profiles and genuine people looking for real connections.", Icon: Heart, tone: "pink" },
  { title: "Safe & Secure", description: "Your privacy and safety come first with thoughtful security tools.", Icon: ShieldCheck, tone: "blue" },
  { title: "Chat, Audio & Video", description: "Connect the way you like with text, audio, and video calls.", Icon: MessagesSquare, tone: "purple" },
  { title: "Find Your Type", description: "Smart matching based on your interests, lifestyle, and preferences.", Icon: Sparkles, tone: "coral" },
];

export default function WhyLoveMatchSection() {
  return (
    <section className={styles.featuresSection} id="features" aria-labelledby="features-title">
      <div className={styles.sectionHeading}>
        <span className={styles.kicker}>WHY CHOOSE LOVEMATCH</span>
        <h2 id="features-title">More Than <span>Just Matching</span></h2>
        <p>We provide a safe, fun, and modern way to meet people and build real connections.</p>
      </div>
      <div className={styles.featuresGrid}>
        {features.map(({ title, description, Icon, tone }) => (
          <article className={styles.featureCard} key={title}>
            <div className={`${styles.featureIcon} ${styles[tone]}`}><Icon size={27} strokeWidth={2.1} aria-hidden="true" /></div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
