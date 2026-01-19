import { createAdminClient } from '../appwrite-admin';
import { SubscriptionTier, SubscriptionStatus, PaymentMethod } from './types';
import { ID, Query } from 'node-appwrite';

const DATABASE_ID = 'whisperrBilling';
const SUB_COLLECTION_ID = 'subscriptions';
const AUDIT_COLLECTION_ID = 'audit_logs';

export class SubscriptionService {
  /**
   * Manually enable a subscription.
   * Includes strict 'toggled' flag to prevent abuse.
   */
  async manualEnablePro(userId: string, adminId: string, reason: string) {
    const { databases } = createAdminClient();

    const subData = {
      userId,
      tier: SubscriptionTier.PRO,
      isActive: true,
      expiresAt: null, // Lifetime or indefinite manual pro
      paymentMethod: PaymentMethod.MANUAL,
      isToggled: true, // NON-NEGOTIABLE
      metadata: JSON.stringify({
        manuallyEnabledBy: adminId,
        reason,
        timestamp: new Date().toISOString()
      })
    };

    // Check if subscription exists
    const existing = await databases.listDocuments(DATABASE_ID, SUB_COLLECTION_ID, [
      Query.equal('userId', userId)
    ]);

    if (existing.total > 0) {
      await databases.updateDocument(DATABASE_ID, SUB_COLLECTION_ID, existing.documents[0].$id, subData);
    } else {
      await databases.createDocument(DATABASE_ID, SUB_COLLECTION_ID, ID.unique(), subData);
    }

    // Audit Log
    await databases.createDocument(DATABASE_ID, AUDIT_COLLECTION_ID, ID.unique(), {
      action: 'MANUAL_ENABLE_PRO',
      actorId: adminId,
      targetId: userId,
      details: JSON.stringify({ reason, toggled: true }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Grant access to a category of people (e.g. Students)
   * This uses a specific tier and flags it in metadata.
   */
  async grantCategoryAccess(userIds: string[], category: string, adminId: string) {
    const { databases } = createAdminClient();

    for (const userId of userIds) {
      const subData = {
        userId,
        tier: SubscriptionTier.PRO, // Or a specific tier like STUDENT
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        paymentMethod: PaymentMethod.MANUAL,
        isToggled: true,
        metadata: JSON.stringify({
          category,
          grantedBy: adminId,
          grantedAt: new Date().toISOString(),
        })
      };

      const existing = await databases.listDocuments(DATABASE_ID, SUB_COLLECTION_ID, [
        Query.equal('userId', userId)
      ]);

      if (existing.total > 0) {
        await databases.updateDocument(DATABASE_ID, SUB_COLLECTION_ID, existing.documents[0].$id, subData);
      } else {
        await databases.createDocument(DATABASE_ID, SUB_COLLECTION_ID, ID.unique(), subData);
      }
    }

    // Audit Log for batch action
    await databases.createDocument(DATABASE_ID, AUDIT_COLLECTION_ID, ID.unique(), {
      action: 'GRANT_CATEGORY_ACCESS',
      actorId: adminId,
      targetId: 'BATCH',
      details: JSON.stringify({ category, count: userIds.length }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Setup a group/employer subscription
   */
  async setupEmployerCloud(employerId: string, employeeIds: string[], discount: number) {
    // Logic to create subsidies for each employee mapping back to employer
  }

  /**
   * Grant student discount
   */
  async grantStudentAccess(userId: string, adminId: string) {
      // Logic for categorization
  }
}

export const subscriptionService = new SubscriptionService();
