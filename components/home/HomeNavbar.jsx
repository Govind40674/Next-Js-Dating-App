"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, Menu, X } from "lucide-react";
import styles from "./styles/HomeNavbar.module.css";

const navigationItems = [
  { label: "Home", href: "/#home", key: "home" },
  { label: "Discover", href: "/#discover", key: "discover" },
  { label: "Features", href: "/#features", key: "features" },
  {
    label: "Success Stories",
    href: "/#success-stories",
    key: "success-stories",
  },
  { label: "About", href: "/#about", key: "about" },
];

export default function HomeNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => setIsMenuOpen((isOpen) => !isOpen);

  // Close the mobile menu when the user presses Escape.
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          {/* Brand logo */}
          <Link
            href="/#home"
            className={styles.brand}
            aria-label="LoveMatch home"
            onClick={closeMenu}
          >
            <span className={styles.brandIcon} aria-hidden="true">
              <Heart
                className={styles.brandHeart}
                fill="currentColor"
              />
            </span>

            <span className={styles.brandName}>
              Love<span>Match</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav
            className={styles.desktopNav}
            aria-label="Main navigation"
          >
            {navigationItems.map((item, index) => (
              <Link
                key={item.key}
                href={item.href}
                className={`${styles.navLink} ${
                  index === 0 ? styles.navLinkActive : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop login/signup buttons */}
          <div className={styles.desktopActions}>
            <Link
              href="/login"
              className={styles.loginButton}
            >
              Log In
            </Link>

            <Link
              href="/signup"
              className={styles.signupButton}
            >
              Sign Up
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className={styles.menuButton}
            onClick={toggleMenu}
            aria-label={
              isMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="lovematch-mobile-navigation"
          >
            {isMenuOpen ? (
              <X
                size={24}
                strokeWidth={2}
                aria-hidden="true"
              />
            ) : (
              <Menu
                size={24}
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* Mobile navigation dropdown */}
        <div
          id="lovematch-mobile-navigation"
          className={`${styles.mobilePanel} ${
            isMenuOpen ? styles.mobilePanelOpen : ""
          }`}
          aria-hidden={!isMenuOpen}
        >
          <nav
            className={styles.mobileNav}
            aria-label="Mobile navigation"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={styles.mobileNavLink}
                tabIndex={isMenuOpen ? 0 : -1}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.mobileActions}>
            <Link
              href="/login"
              className={styles.mobileLoginButton}
              tabIndex={isMenuOpen ? 0 : -1}
              onClick={closeMenu}
            >
              Log In
            </Link>

            <Link
              href="/signup"
              className={styles.mobileSignupButton}
              tabIndex={isMenuOpen ? 0 : -1}
              onClick={closeMenu}
            >
              Create an Account
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Keeps page content below the fixed header. */}
      <div
        className={styles.navbarSpacer}
        aria-hidden="true"
      />
    </>
  );
}