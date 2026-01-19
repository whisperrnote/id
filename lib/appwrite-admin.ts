import { Client, Account, Databases, Users } from 'node-appwrite';

/**
 * Creates an admin client with full permissions.
 * ALWAYS use this on the server only.
 */
export function createAdminClient() {
  const client = new Client();
  
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT || '')
    .setKey(process.env.APPWRITE_KEY || ''); // Ensure this env is set

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    users: new Users(client),
  };
}
