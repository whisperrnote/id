'use client';

import { useEffect } from 'react';
import { Client, Account } from 'appwrite';

const client = new Client();
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APPWRITE_PROJECT) client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT);
const account = new Account(client);

export default function SilentCheckPage() {
    useEffect(() => {
        async function performCheck() {
            try {
                const user = await account.get();
                window.parent.postMessage({ type: 'idm:auth-status', status: 'authenticated', userId: user.$id, user }, '*');
            } catch (error: any) {
                window.parent.postMessage({ type: 'idm:auth-status', status: 'unauthenticated', errorCode: error.code }, '*');
            }
        }
        performCheck();
    }, []);

    return null; // Silent
}
