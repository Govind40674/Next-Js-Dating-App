import React from 'react'
import HomePage from './(public)/HomePage/page'
import PublicRoute from "@/components/auth/PublicRoute";

const page = () => {
  return (
    <>
      <PublicRoute>
        <HomePage />
      </PublicRoute>
    </>

  )
}

export default page