import Link from "next/link";
// import { ArrowUpRight, Heart, Instagram, Youtube, Mail, ShieldCheck } from "lucide-react";
// import { FaFacebookF } from "react-icons/fa";


import {
  ArrowUpRight,
  Heart,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";

import styles from "./styles/HomeFooter.module.css";


const quickLinks = [
  { label: "Home", href: "/#home" },
  { label: "Discover", href: "/#discover" },
  { label: "Features", href: "/#features" },
  { label: "Success Stories", href: "/#success-stories" },
  { label: "About Us", href: "/#about" },
];

const supportLinks = [
  { label: "Help Center", href: "/help" },
  { label: "Safety Tips", href: "/safety" },
  { label: "Community Guidelines", href: "/community-guidelines" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function HomeFooter() {
  return (
    <footer className={styles.footer} id="about">
      <div className={styles.footerInner}>
        <div className={styles.brandColumn}>
          <Link href="/#home" className={styles.brand} aria-label="LoveMatch home">
            <span className={styles.brandIcon}><Heart fill="currentColor" aria-hidden="true" /></span>
            <span className={styles.brandName}>Love<span>Match</span></span>
          </Link>
          <p>Real people. Real connections.<br />A little closer to your someone.</p>
          <div className={styles.socialLinks} aria-label="Social media links">
            <a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noreferrer"><FaFacebookF size={17} /></a>
            <a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer"><FaInstagram size={17} /></a>
            <a href="https://www.youtube.com/" aria-label="YouTube" target="_blank" rel="noreferrer"><FaYoutube size={17} /></a>
            <a href="mailto:support@lovematch.example" aria-label="Email LoveMatch"><Mail size={17} /></a>
          </div>
          <div className={styles.safetyNote}><ShieldCheck size={15} aria-hidden="true" /> Your safety matters to us.</div>
        </div>

        <div className={styles.linkColumn}>
          <h3>Explore</h3>
          {quickLinks.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}
        </div>

        <div className={styles.linkColumn}>
          <h3>Support</h3>
          {supportLinks.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}
        </div>

        <div className={styles.appColumn}>
          <h3>LoveMatch on the go</h3>
          <p>Get the best experience on your mobile.</p>
          <a className={styles.storeButton} href="https://play.google.com/store" target="_blank" rel="noreferrer">
            <span className={styles.storeIcon} aria-hidden="true">▶</span>
            <span><small>GET IT ON</small><strong>Google Play</strong></span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <a className={styles.storeButton} href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer">
            <span className={styles.appleIcon} aria-hidden="true">●</span>
            <span><small>Download on the</small><strong>App Store</strong></span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} LoveMatch. All rights reserved.</p>
        <p>Made with <Heart size={13} fill="currentColor" aria-label="love" /> for meaningful connections.</p>
      </div>
    </footer>
  );
}
