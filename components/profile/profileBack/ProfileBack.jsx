import React from 'react'
import styles from './ProfileBack.module.css'
import { Button } from '@nextui-org/react'
import { useRouter } from 'next/navigation'
import { setOnlineStatus } from "@/lib/presence";
import { MyContext } from '../../myContext/MyContext';
import { useContext } from 'react';

const ProfileBack = () => {
  const router = useRouter()
  const {
  
  setIsMessageBox,
  setIsMatchBox,
  setIsMatching,
  setIsEditpage,
  setIsProfilepage
  } = useContext(MyContext);

  const handleLogout =async  () => {
    await setOnlineStatus(false);
    localStorage.clear()
    router.push('/login')
  }
  const handleEditProfile = () => {
    setIsMessageBox(false);
    setIsMatchBox(false);
    setIsMatching(false);
    setIsEditpage(true);
    setIsProfilepage(false);

  
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