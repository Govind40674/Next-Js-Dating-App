import Link from "next/link";
import { ArrowRight, CirclePlay, Heart, Sparkles } from "lucide-react";
import styles from "./styles/HeroSection.module.css";

const avatarImages = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&q=80",
];

export default function HeroSection() {
  return (
    <section className={styles.hero} id="home" aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" />
            <span>Real people</span><i />
            <span>Genuine connections</span>
          </div>
          <h1 id="hero-title">
            Find Your <br />
            <span>Perfect Match</span>
            <Heart className={styles.titleHeart} aria-hidden="true" />
          </h1>
          <p className={styles.heroDescription}>
            Meet amazing people, make meaningful connections, and find someone special.
            Love, friendship, or something in between — it all starts here.
          </p>
          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryButton}>
              Get Started Free <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className={styles.secondaryButton}>
              <CirclePlay size={19} aria-hidden="true" /> How It Works
            </a>
          </div>
          <div className={styles.socialProof}>
            <div className={styles.avatarStack} aria-hidden="true">
              {avatarImages.map((src, index) => (
                <img src={src} alt="" key={src} loading="lazy" />
              ))}
            </div>
            <span className={styles.peopleCount}>10K+</span>
            <p>people are already <br />finding their match!</p>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Couple celebrating a connection">
          <div className={styles.heroPhotoWrap}>
            <img
              className={styles.heroPhoto}
              src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1400&q=90"
              alt="A happy couple sharing a warm moment together"
              fetchPriority="high"
            />
          </div>
          <div className={styles.photoGradient} />
          <div className={styles.handwrittenNote}>Better<br />Together <Heart size={18} fill="currentColor" /></div>
          <div className={styles.matchCard}>
            <div className={styles.matchCardHeading}>It&apos;s a Match! <Heart size={15} fill="currentColor" /></div>
            <div className={styles.matchAvatars}>
              <img src={avatarImages[0]} alt="Member profile" loading="lazy" />
              <span><Heart size={19} fill="currentColor" /></span>
              <img src={avatarImages[1]} alt="Member profile" loading="lazy" />
            </div>
            <p>You both liked each other</p>
          </div>
          <span className={styles.floatingHeart} aria-hidden="true"><Heart fill="currentColor" /></span>
          <span className={styles.floatingSparkle} aria-hidden="true"><Sparkles /></span>
        </div>
      </div>
    </section>
  );
}
