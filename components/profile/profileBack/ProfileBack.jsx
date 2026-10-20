import React from 'react'
import styles from './ProfileBack.module.css'
import { Button } from '@nextui-org/react'
import { useRouter } from 'next/navigation'
import { setOnlineStatus } from "@/lib/presence";

const ProfileBack = () => {
  const router = useRouter()

  const handleLogout =async  () => {
    await setOnlineStatus(false);
    localStorage.clear()
    router.push('/login')
  }
  const handleEditProfile = () => {

    router.push('/Edit-profile')
  }

  return (
    <>
      <h1 className={styles.title}>Profile Back</h1>
      <Button className={styles.button} onPress={handleEditProfile}>Edit Profile</Button>
      <Button className={styles.button} onPress={handleLogout}>
        LogOut
      </Button>
    </>
  )
}

export default ProfileBack