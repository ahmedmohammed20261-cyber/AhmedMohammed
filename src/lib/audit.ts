import { supabase } from './supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'CONTRACT' | 'SUPPLIER' | 'CONTRACT_ITEM' | 'DELIVERY' | 'PAYMENT' | 'ATTACHMENT' | 'CONTRACT_PURCHASE' | 'CONTRACT_EXPENSE';

export async function logAction(
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  details?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || null,
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}
