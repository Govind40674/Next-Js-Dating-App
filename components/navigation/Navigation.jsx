import React from 'react'
import Link from 'next/link'
import styles from './Navigation.module.css'
import { Suspense } from 'react'


const Navigation = () => {
  return (
    <>
    <Suspense fallback={<div>Loading...</div>}>
      <div className={styles.navigation}>
        <Link href="/">Home_page</Link>
        <Link href="/explore">Explore</Link>
        <Link href="/about">About</Link>
        <Link href="/blog">Blog</Link>
      </div>
    </Suspense>


    </>
  )
}

export default Navigation








