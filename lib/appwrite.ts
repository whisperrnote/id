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

const SYNC_CACHE_KEY = 'whisperr_identity_synced_v2';
const SESSION_SYNC_KEY = 'whisperr_session_identity_ok';

export const AppwriteService = {
  /**
   * Universal Identity Hook: Efficiently ensures the user is linked in the global directory.
   * Uses caching to minimize database overhead.
   */
  async ensureGlobalProfile(user: any, force = false) {
    if (!user?.$id || typeof window === 'undefined') return null;

    // Layer 1: Session-level skip (Zero DB calls if already checked this tab)
    if (!force && sessionStorage.getItem(SESSION_SYNC_KEY)) return null;

    // Layer 2: Persistent-level skip (24h TTL)
    const lastSync = localStorage.getItem(SYNC_CACHE_KEY);
    if (!force && lastSync && (Date.now() - parseInt(lastSync)) < 24 * 60 * 60 * 1000) {
      sessionStorage.setItem(SESSION_SYNC_KEY, '1');
      return null;
    }

    try {
      console.log('[Identity] Proactive sync checking for:', user.$id);

      // 1. Get current state from Auth and Database
      const [prefs, profile] = await Promise.all([
        account.getPrefs(),
        databases.getDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id).catch(() => null)
      ]);

      // 2. Generate normalized username
      let username = prefs?.username || user.name || user.email.split('@')[0];
      username = String(username).toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 50);
      if (!username) username = `user_${user.$id.slice(0, 8)}`;

      const profileData = {
        username,
        displayName: user.name || username,
        updatedAt: new Date().toISOString(),
        avatarFileId: prefs?.profilePicId || user.profilePicId || null,
        walletAddress: prefs?.walletEth || prefs?.walletAddress || null,
        bio: prefs?.bio || profile?.bio || "",
        privacySettings: JSON.stringify({ public: true, searchable: true })
      };

      const permissions = [
        'read("any")',
        `update("user:${user.$id}")`,
        `delete("user:${user.$id}")`
      ];

      // 3. Selective Update: Only write if data is missing or different
      if (!profile) {
        await databases.createDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id, {
          ...profileData,
          createdAt: new Date().toISOString()
        }, permissions);
      } else {
        const needsHealing = profile.username !== username || 
                           !profile.avatarFileId && profileData.avatarFileId ||
                           !profile.privacySettings;
        
        if (needsHealing) {
          await databases.updateDocument(CONNECT_DATABASE_ID, CONNECT_COLLECTION_ID_USERS, user.$id, profileData);
        }
      }

      // 4. Update Auth Prefs if out of sync
      if (prefs.username !== username) {
        await account.updatePrefs({ ...prefs, username });
      }

      // 5. Update Caches
      localStorage.setItem(SYNC_CACHE_KEY, Date.now().toString());
      sessionStorage.setItem(SESSION_SYNC_KEY, '1');

      return { success: true, username };
    } catch (error) {
      console.warn('[Identity] Background sync deferred:', error);
      return null;
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
