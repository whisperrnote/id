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
   * Syncs the user's discoverability and profile to the global ecosystem directory.
   */
  async syncGlobalProfile(user: any, prefs: any) {
    if (!user?.$id) return;

    try {
      const isPublic = prefs?.publicProfile !== false;
      const username = prefs?.username || user.name || user.email.split('@')[0];
      const displayName = user.name || username;

      // Try to get existing global profile
      let profile;
      try {
        profile = await databases.getDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id);
      } catch (e: any) {
        if (e.code === 404) {
          // Profile doesn't exist, create it if public or if we want to ensure it exists
          profile = null;
        } else {
          throw e;
        }
      }

      const profileData = {
        username: username.toLowerCase().replace(/\s/g, ''),
        displayName: displayName,
        updatedAt: new Date().toISOString(),
        privacySettings: JSON.stringify({ public: isPublic, searchable: isPublic }),
        avatarUrl: prefs?.avatarUrl || null,
      };

      if (profile) {
        await databases.updateDocument(
          CONNECT_DATABASE_ID,
          CONNECT_COLLECTION_ID_USERS,
          user.$id,
          profileData
        );
      } else {
        // Create new global profile
        await databases.createDocument(
          CONNECT_DATABASE_ID,
          CONNECT_COLLECTION_ID_USERS,
          user.$id,
          {
            ...profileData,
            createdAt: new Date().toISOString(),
            appsActive: ['id'],
          }
        );
      }
    } catch (error) {
      console.error('[AppwriteService] Global profile sync failed:', error);
      // Non-fatal
    }
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
