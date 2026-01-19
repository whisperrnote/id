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

export const AppwriteService = {
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
