import { Client, Account, Functions, Databases, Query, ID } from 'appwrite';
import { Keychain } from '@/types/appwrite';

const client = new Client();

const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "main";
const APPWRITE_COLLECTION_KEYCHAIN_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_KEYCHAIN_ID || "keychain";
const APPWRITE_COLLECTION_USERS_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USERS_ID || "users";

// These values should be provided via environment variables at runtime
if (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
  client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
}
if (process.env.NEXT_PUBLIC_APPWRITE_PROJECT) {
  client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT);
}

const account = new Account(client);
const functions = new Functions(client);
const databases = new Databases(client);

// Ecosystem: WhisperrConnect (The Global Directory)
export const CONNECT_DATABASE_ID = 'chat';
export const CONNECT_COLLECTION_ID_USERS = 'users';

export const AppwriteService = {
  /**
   * Proactively ensures the user has a normalized, discoverable profile in the 
   * global ecosystem directory (chat.users).
   */
  async ensureGlobalProfile(user: any) {
    if (!user?.$id) return null;

    try {
      // 1. Get or Generate Username
      const prefs = await account.getPrefs();
      let username = prefs?.username || user.name || user.email.split('@')[0];
      
      // Strict Normalization: lowercase, no @, alphanumeric + underscores
      username = username.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
      if (!username) username = `user_${user.$id.slice(0, 8)}`;

      // 2. Check for existing document
      let profile;
      try {
        profile = await databases.getDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id);
      } catch (e: any) {
        if (e.code !== 404) throw e;
        profile = null;
      }

      const now = new Date().toISOString();
      const profileData = {
        username,
        displayName: user.name || username,
        updatedAt: now,
        privacySettings: JSON.stringify({ public: true, searchable: true }),
        avatarUrl: prefs?.avatarUrl || user.avatarUrl || null,
        walletAddress: prefs?.walletEth || null,
      };

      if (!profile) {
        // Self-Healing: Create if missing
        console.log('[Identity] Creating global profile for:', user.$id);
        await databases.createDocument(
          CONNECT_DATABASE_ID,
          CONNECT_COLLECTION_ID_USERS,
          user.$id,
          {
            ...profileData,
            createdAt: now,
            appsActive: ['id'],
          }
        );
      } else {
        // Self-Healing: Fix malformed or non-discoverable data
        const needsFix = 
          profile.username !== username || 
          !profile.privacySettings || 
          profile.privacySettings.includes('"public":false');

        if (needsFix) {
          console.log('[Identity] Healing global profile for:', user.$id);
          await databases.updateDocument(
            CONNECT_DATABASE_ID,
            CONNECT_COLLECTION_ID_USERS,
            user.$id,
            profileData
          );
        }
      }

      // 3. Keep Prefs in sync
      if (prefs.username !== username) {
        await account.updatePrefs({ ...prefs, username });
      }

      return username;
    } catch (error) {
      console.warn('[Identity] Global sync failed:', error);
      return null;
    }
  },

  /**
   * Syncs the user's discoverability and profile to the global ecosystem directory.
   */
  async syncGlobalProfile(user: any, prefs: any) {
    return this.ensureGlobalProfile(user);
  },

  /**
   * Checks if a username is available in the global ecosystem directory.
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    if (!username) return false;
    const normalized = username.toLowerCase().replace(/\s/g, '');
    try {
      const res = await databases.listDocuments(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, [
        Query.equal('username', normalized),
        Query.limit(1)
      ]);
      return res.total === 0;
    } catch (e) {
      console.error('[AppwriteService] Failed to check username availability:', e);
      return true; // Assume available on error to avoid blocking user
    }
  },

  // Keychain management
  async createKeychainEntry(data: Omit<Keychain, "$id" | "$createdAt" | "$updatedAt">): Promise<Keychain> {
    const doc = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_KEYCHAIN_ID,
      ID.unique(),
      data
    );
    return doc as unknown as Keychain;
  },

  async listKeychainEntries(userId: string): Promise<Keychain[]> {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_KEYCHAIN_ID,
      [Query.equal('userId', userId)]
    );
    return response.documents as unknown as Keychain[];
  },

  async deleteKeychainEntry(id: string): Promise<void> {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_KEYCHAIN_ID,
      id
    );
  },

  // Masterpass status
  async hasMasterpass(userId: string): Promise<boolean> {
    try {
      const doc = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USERS_ID,
        userId
      );
      return !!doc?.masterpass;
    } catch {
      return false;
    }
  },

  async setMasterpassFlag(userId: string, status: boolean = true): Promise<void> {
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USERS_ID,
      userId,
      { masterpass: status }
    );
  }
};

export { client, account, functions, databases };
