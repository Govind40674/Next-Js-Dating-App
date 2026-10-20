import { Heart, Star } from "lucide-react";
import styles from "./styles/SuccessStoriesSection.module.css";

const stories = [
  { quote: "I found my special someone on LoveMatch! The video call feature made it so easy to connect before meeting in person.", names: "Neha & Rohan", note: "Together for 1 year", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80" },
  { quote: "Amazing platform! I met genuine people and had great conversations. The interface is simple and easy to use.", names: "Priya", note: "Found a close friend", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" },
  { quote: "LoveMatch is different. Real people, real connections, and someone who understands me. I am so happy I joined.", names: "Simran & Arjun", note: "Engaged", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" },
];

export default function SuccessStoriesSection() {
  return (
    <section className={styles.storiesSection} id="success-stories" aria-labelledby="stories-title">
      <div className={styles.sectionHeading}>
        <span className={styles.kicker}>SUCCESS STORIES</span>
        <h2 id="stories-title">Real People, <span>Real Connections</span></h2>
        <p>Hear from people who found love, friendship, and meaningful relationships on LoveMatch.</p>
      </div>
      <div className={styles.storiesGrid}>
        {stories.map((story) => (
          <article className={styles.storyCard} key={story.names}>
            <div className={styles.stars} aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill="currentColor" aria-hidden="true" />)}
            </div>
            <p className={styles.quote}>“{story.quote}”</p>
            <div className={styles.storyAuthor}>
              <img src={story.image} alt="" loading="lazy" />
              <div><strong>{story.names}</strong><small><Heart size={12} fill="currentColor" aria-hidden="true" /> {story.note}</small></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
