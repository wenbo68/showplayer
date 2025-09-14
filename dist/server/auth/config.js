import { DrizzleAdapter } from '@auth/drizzle-adapter';
import {} from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import Google from 'next-auth/providers/google';
import GoogleProvider from 'next-auth/providers/google'; // ✨ 1. Import GoogleProvider
import { db } from '~/server/db';
import { accounts, sessions, users, verificationTokens, } from '~/server/db/schema';
/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
    providers: [
        DiscordProvider,
        GoogleProvider,
        /**
         * ...add more providers here.
         *
         * Most other providers require a bit more work than the Discord provider. For example, the
         * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
         * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
         *
         * @see https://next-auth.js.org/providers/github
         */
    ],
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    callbacks: {
        session: ({ session, user }) => ({
            ...session,
            user: {
                ...session.user,
                id: user.id,
            },
        }),
    },
};
