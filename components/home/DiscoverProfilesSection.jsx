"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, MapPin } from "lucide-react";
import styles from "./styles/DiscoverProfilesSection.module.css";

const profiles = [
  { id: 1, name: "Aaradhya", age: 24, city: "Delhi, India", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85", online: true },
  { id: 2, name: "Rohan", age: 26, city: "Mumbai, India", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=85", online: true },
  { id: 3, name: "Priya", age: 22, city: "Bangalore, India", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=85", online: false },
  { id: 4, name: "Arjun", age: 28, city: "Pune, India", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=85", online: true },
  { id: 5, name: "Simran", age: 24, city: "Chandigarh, India", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=85", online: true },
  { id: 6, name: "Karan", age: 27, city: "Hyderabad, India", image: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=600&q=85", online: false },
];

export default function DiscoverProfilesSection() {
  const [likedProfiles, setLikedProfiles] = useState([]);
  const [slide, setSlide] = useState(0);

  const toggleLike = (id) => {
    setLikedProfiles((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const shift = (direction) => {
    setSlide((current) => (current + direction + profiles.length) % profiles.length);
  };

  const visibleProfiles = [...profiles.slice(slide), ...profiles.slice(0, slide)];

  return (
    <section className={styles.discoverSection} id="discover" aria-labelledby="discover-title">
      <div className={styles.discoverInner}>
        <div className={styles.sectionTop}>
          <div>
            <span className={styles.kicker}>DISCOVER</span>
            <h2 id="discover-title">Meet <span>Amazing People</span></h2>
            <p>Swipe, match, and start a conversation with people who share your interests.</p>
          </div>
          <div className={styles.sectionActions}>
            <Link href="/discover" className={styles.viewAll}>View all <ArrowRight size={16} aria-hidden="true" /></Link>
            <button type="button" className={styles.arrowButton} onClick={() => shift(-1)} aria-label="Previous profiles"><ArrowLeft size={17} /></button>
            <button type="button" className={styles.arrowButton} onClick={() => shift(1)} aria-label="Next profiles"><ArrowRight size={17} /></button>
          </div>
        </div>

        <div className={styles.profileGrid}>
          {visibleProfiles.map((profile) => {
            const isLiked = likedProfiles.includes(profile.id);
            return (
              <article className={styles.profileCard} key={profile.id}>
                <img className={styles.profilePhoto} src={profile.image} alt={`${profile.name}'s profile`} loading="lazy" />
                <div className={styles.profileShade} />
                <div className={styles.profileDetails}>
                  <h3>{profile.name}, {profile.age} <span className={`${styles.onlineDot} ${profile.online ? styles.online : ""}`} aria-label={profile.online ? "Online" : "Offline"} /></h3>
                  <p><MapPin size={12} aria-hidden="true" /> {profile.city}</p>
                </div>
                <button type="button" className={`${styles.likeButton} ${isLiked ? styles.liked : ""}`} onClick={() => toggleLike(profile.id)} aria-label={isLiked ? `Unlike ${profile.name}` : `Like ${profile.name}`} aria-pressed={isLiked}>
                  <Heart size={19} fill={isLiked ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
        <p className={styles.likeHint}>Tap the heart on a profile to save someone you like.</p>
      </div>
    </section>
  );
}
