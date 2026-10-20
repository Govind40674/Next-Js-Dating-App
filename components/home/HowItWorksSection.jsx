import { ArrowRight, UserRoundPlus, SlidersHorizontal, MessageCircleHeart } from "lucide-react";
import styles from "./styles/HowItWorksSection.module.css";

const steps = [
  { number: "01", title: "Create Your Profile", description: "Sign up, add your photos, and tell us a little about yourself.", Icon: UserRoundPlus },
  { number: "02", title: "Discover & Match", description: "Explore profiles and find people who share your interests.", Icon: SlidersHorizontal },
  { number: "03", title: "Start Connecting", description: "Chat, send a message, or begin an audio/video call with your match.", Icon: MessageCircleHeart },
];

export default function HowItWorksSection() {
  return (
    <section className={styles.stepsSection} id="how-it-works" aria-labelledby="steps-title">
      <div className={styles.sectionHeading}>
        <span className={styles.kicker}>HOW IT WORKS</span>
        <h2 id="steps-title">Find Your Match in <span>3 Simple Steps</span></h2>
        <p>Getting started is easy. Join now and start your journey to meaningful connections.</p>
      </div>
      <div className={styles.stepsGrid}>
        {steps.map(({ number, title, description, Icon }, index) => (
          <article className={styles.step} key={number}>
            <div className={styles.stepArt}>
              <span className={styles.stepIcon}><Icon size={27} aria-hidden="true" /></span>
              <span className={styles.stepNumber}>{number}</span>
              {index < steps.length - 1 && <span className={styles.connector} aria-hidden="true"><ArrowRight size={25} /></span>}
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
