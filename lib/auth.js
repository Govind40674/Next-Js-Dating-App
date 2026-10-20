import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import connectDB from "@/lib/connectDB";
import User from "@/models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,

      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider !== "google") {
          return true;
        }

        await connectDB();

        const googleId = account.providerAccountId;
        const email = user.email?.toLowerCase().trim();

        if (!email || !googleId) {
          return false;
        }

        // -----------------------------------------
        // 1. Find user by Google ID
        // -----------------------------------------

        let existingUser = await User.findOne({
          googleId,
        });

        // -----------------------------------------
        // 2. If not found, find by email
        // -----------------------------------------

        if (!existingUser) {
          existingUser = await User.findOne({
            email,
          });
        }

        // -----------------------------------------
        // 3. Existing user
        // -----------------------------------------

        if (existingUser) {
          // Link Google account if it wasn't linked before
          if (!existingUser.googleId) {
            existingUser.googleId = googleId;
            existingUser.authProvider = "google";

            await existingUser.save();
          }

          console.log(
            "Existing Google user:",
            existingUser._id.toString()
          );

          return true;
        }

        // -----------------------------------------
        // 4. Create new user
        // -----------------------------------------

        const newUser = await User.create({
          name: user.name || "",
          email,
          googleId,
          authProvider: "google",
          password: null,
        });

        console.log(
          "New Google user created:",
          newUser._id.toString()
        );

        return true;
      } catch (error) {
        console.error("Google signup error:", error);

        return false;
      }
    },

    // -----------------------------------------
    // JWT
    // -----------------------------------------

    async jwt({ token }) {
      if (token.email && !token.userId) {
        await connectDB();

        const dbUser = await User.findOne({
          email: token.email.toLowerCase(),
        });

        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.isVIP=dbUser.isVIP;
          token.todayViewCount=dbUser.todayViewCount;
          token.profile_photo=dbUser.photo[0] || "";
          token.name=dbUser.name || "";

        }
      }

      return token;
    },

    // -----------------------------------------
    // SESSION
    // -----------------------------------------

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.isVIP=token.isVIP;
        session.user.todayViewCount=token.todayViewCount;
        session.user.image=token.profile_photo || "";
        session.user.name=token.name || "";

      }

      return session;
    },
  },
});