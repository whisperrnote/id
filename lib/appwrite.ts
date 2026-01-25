import { Client, Account, Functions, Databases, Query, ID } from 'appwrite';
import { Keychain } from '@/types/appwrite';

const client = new Client();

const FALLBACK_PROJECT_ID = '67fe9627001d97e37ef3';
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "main";
const APPWRITE_COLLECTION_KEYCHAIN_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_KEYCHAIN_ID || "keychain";
const APPWRITE_COLLECTION_USERS_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USERS_ID || "users";

// Ensure connection even if env is missing
client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1');
client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || FALLBACK_PROJECT_ID);

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
    if (!user?.$id) throw new Error("No active session found");

    console.log('[Identity] Starting global sync for:', user.$id);

    // 1. Get or Generate Username
    const prefs = await account.getPrefs();
    // Prioritize prefs, then name, then email
    let username = prefs?.username || user.name || user.email.split('@')[0];
    
    // Strict Normalization: lowercase, no @, alphanumeric + underscores, max 50 chars
    username = String(username).toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 50);
    if (!username) username = `user_${user.$id.slice(0, 8)}`;

    // 2. Force Write to Global Table
    const now = new Date().toISOString();
    const profileData = {
      username,
      displayName: user.name || username,
      updatedAt: now,
      avatarUrl: prefs?.avatarUrl || user.avatarUrl || null,
      walletAddress: prefs?.walletEth || null,
      bio: prefs?.bio || ""
    };

    try {
      // Check if exists first to decide Create vs Update
      let existingProfile = null;
      try {
        existingProfile = await databases.getDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id);
      } catch (e: any) {
        if (e.code !== 404) throw e;
      }

      if (!existingProfile) {
        await databases.createDocument(
          CONNECT_DATABASE_ID,
          CONNECT_COLLECTION_ID_USERS,
          user.$id,
          { ...profileData, createdAt: now }
        );
      } else {
        await databases.updateDocument(
          CONNECT_DATABASE_ID,
          CONNECT_COLLECTION_ID_USERS,
          user.$id,
          profileData
        );
      }

      // 3. Force Sync back to Account Prefs (The UI source)
      if (prefs.username !== username) {
        await account.updatePrefs({ ...prefs, username });
      }

      return { success: true, username };
    } catch (syncErr: any) {
      console.error('[Identity] Critical Sync Failure:', syncErr);
      throw syncErr;
    }
  },

  async getGlobalProfileStatus(userId: string) {
    try {
      const profile = await databases.getDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, userId);
      return { exists: true, profile };
    } catch (e: any) {
      return { exists: false, error: e.code === 404 ? 'Not Found' : e.message };
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
