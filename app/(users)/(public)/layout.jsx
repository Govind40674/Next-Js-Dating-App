
import PublicRoute from "@/components/auth/PublicRoute";
export default function PublicLayout({ children }) {
  console.log("Public layout rendered");
  return (
    <>
      
      <PublicRoute>{children}</PublicRoute>
    </>
  );
}