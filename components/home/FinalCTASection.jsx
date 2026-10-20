import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import styles from "./styles/FinalCTASection.module.css";

export default function FinalCTASection() {
  return (
    <section className={styles.ctaSection} aria-labelledby="cta-title">
      <div className={styles.ctaInner}>
        <div className={styles.photoStack} aria-hidden="true">
          <div className={styles.smallAvatar}><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="" loading="lazy" /></div>
          <div className={styles.smallAvatar}><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" alt="" loading="lazy" /></div>
          <span className={styles.photoHeart}><Heart fill="currentColor" /></span>
          <span className={styles.photoSparkle}><Sparkles /></span>
        </div>
        <div className={styles.ctaCopy}>
          <span className={styles.eyebrow}>YOUR STORY STARTS HERE</span>
          <h2 id="cta-title">Ready to Find Your Match?</h2>
          <p>Join now and be part of a community where real connections happen.</p>
          <Link href="/signup" className={styles.ctaButton}>Create Your Free Account <ArrowRight size={18} aria-hidden="true" /></Link>
          <div className={styles.joinedCount}><span><i /><i /><i /></span><strong>10K+</strong> people have joined LoveMatch
          </div>
        </div>
        <div className={styles.polaroid} aria-hidden="true">
          <img src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=500&q=85" alt="" loading="lazy" />
          <Heart className={styles.polaroidHeart} fill="currentColor" />
        </div>
      </div>
    </section>
  );
}
