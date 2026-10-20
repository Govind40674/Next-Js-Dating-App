import { Bell, Camera, CheckCircle2, Heart, MessageCircle, MessageSquare, Phone, Video } from "lucide-react";
import styles from "./styles/CommunicationSection.module.css";

const communicationFeatures = [
  { title: "Instant Messaging", description: "Start meaningful conversations", Icon: MessageCircle },
  { title: "High-Quality Audio Calls", description: "Crystal-clear audio for better conversations", Icon: Phone },
  { title: "HD Video Calls", description: "See and talk to your matches face-to-face", Icon: Video },
  { title: "Share Photos & Moments", description: "Share your interests, lifestyle, and more", Icon: Camera },
  { title: "Real-Time Notifications", description: "Never miss a special message", Icon: Bell },
];

export default function CommunicationSection() {
  return (
    <section className={styles.communicationSection} aria-labelledby="communication-title">
      <div className={styles.communicationInner}>
        <div className={styles.phoneShowcase} aria-label="Example of chatting and video calling">
          <div className={styles.videoPhone}>
            <div className={styles.phoneTop}><span /><span /></div>
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85" alt="A member smiling during a video call" loading="lazy" />
            <div className={styles.videoBadge}><span className={styles.liveDot} /> Aaradhya · 00:14</div>
            <div className={styles.callControls}>
              <span><Phone size={17} /></span><span><Video size={17} /></span><span className={styles.hangup}><Phone size={17} /></span>
            </div>
          </div>
          <div className={styles.chatPhone}>
            <div className={styles.chatHeader}>
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Rohan profile" loading="lazy" />
              <div><strong>Rohan</strong><small><span /> Online</small></div>
              <Heart size={18} color="#f20b52" aria-hidden="true" />
            </div>
            <div className={styles.chatBody}>
              <div className={styles.messageLeft}>Hey! 👋</div>
              <div className={styles.messageLeft}>You look amazing!</div>
              <div className={styles.messageRight}>Thank you! 😊</div>
              <div className={styles.messageLeft}>Would you like to video call?</div>
              <div className={styles.messageRight}>Sure! Let&apos;s connect 💗</div>
            </div>
            <div className={styles.chatInput}>Type a message... <span><ArrowSendIcon /></span></div>
          </div>
          <span className={styles.floatingLike}><Heart size={24} fill="currentColor" /></span>
          <span className={styles.floatingMiniHeart}><Heart size={18} fill="currentColor" /></span>
        </div>

        <div className={styles.communicationCopy}>
          <span className={styles.kicker}>STAY CONNECTED</span>
          <h2 id="communication-title">Chat, <span>Audio & Video</span> Calls</h2>
          <p className={styles.intro}>Get closer with high-quality calls and real-time messaging. Build deeper connections, anytime, anywhere.</p>
          <div className={styles.communicationList}>
            {communicationFeatures.map(({ title, description, Icon }) => (
              <div className={styles.communicationItem} key={title}>
                <span className={styles.communicationIcon}><Icon size={20} aria-hidden="true" /></span>
                <span className={styles.communicationText}><strong>{title}</strong><small>{description}</small></span>
                <CheckCircle2 className={styles.checkIcon} size={15} aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowSendIcon() {
  return <MessageSquare size={14} aria-hidden="true" />;
}
