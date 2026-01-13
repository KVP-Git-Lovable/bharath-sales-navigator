import { supabase } from "@/integrations/supabase/client";

interface MoveToRecycleBinParams {
  tableName: string;
  recordId: string;
  recordData: Record<string, any>;
  moduleName: string;
  recordName?: string;
}

export const moveToRecycleBin = async ({
  tableName,
  recordId,
  recordData,
  moduleName,
  recordName
}: MoveToRecycleBinParams): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('recycle_bin')
      .insert({
        original_table: tableName,
        original_id: recordId,
        record_data: recordData,
        deleted_by: user.id,
        module_name: moduleName,
        record_name: recordName || recordData.name || recordData.title || 'Unknown'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error moving to recycle bin:', error);
    return false;
  }
};

export const restoreFromRecycleBin = async (
  recycleBinId: string,
  originalTable: string,
  recordData: Record<string, any>,
  originalId: string
): Promise<boolean> => {
  try {
    // Remove metadata fields that shouldn't be restored
    const { created_at, updated_at, ...dataToRestoreUnsafe } = recordData;
    // Never attempt to restore a raw `id` from record_data (tables differ)
    const { id: _id, ...dataToRestore } = dataToRestoreUnsafe;

    // Some entities (like beats) use non-UUID identifiers in the app (beat_id).
    // In that case, restore without forcing the primary key `id`.
    const insertPayload =
      originalTable === 'beats'
        ? {
            ...dataToRestore,
            beat_id: dataToRestore.beat_id ?? originalId,
          }
        : {
            ...dataToRestore,
            id: originalId,
          };

    // Insert back to original table
    const { error: insertError } = await supabase
      .from(originalTable as any)
      .insert(insertPayload as any);

    if (insertError) throw insertError;

    // Delete from recycle bin
    const { error: deleteError } = await supabase
      .from('recycle_bin')
      .delete()
      .eq('id', recycleBinId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Error restoring from recycle bin:', error);
    return false;
  }
};

export const permanentlyDelete = async (recycleBinId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get the record first to log it
    const { data: recycleBinRecord, error: fetchError } = await supabase
      .from('recycle_bin')
      .select('*')
      .eq('id', recycleBinId)
      .single();

    if (fetchError) throw fetchError;

    // Log to permanent deletion log
    const { error: logError } = await supabase
      .from('permanent_deletion_log')
      .insert({
        original_table: recycleBinRecord.original_table,
        original_id: recycleBinRecord.original_id,
        record_data: recycleBinRecord.record_data,
        module_name: recycleBinRecord.module_name,
        record_name: recycleBinRecord.record_name,
        deleted_from_bin_by: user.id,
        original_deleted_by: recycleBinRecord.deleted_by,
        original_deleted_at: recycleBinRecord.deleted_at
      });

    if (logError) throw logError;

    // Delete from recycle bin
    const { error: deleteError } = await supabase
      .from('recycle_bin')
      .delete()
      .eq('id', recycleBinId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Error permanently deleting:', error);
    return false;
  }
};

export const clearRecycleBin = async (ids?: string[]): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get all records to be deleted
    let query = supabase.from('recycle_bin').select('*');
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    }
    
    const { data: records, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!records || records.length === 0) return true;

    // Log all to permanent deletion log
    const logEntries = records.map(record => ({
      original_table: record.original_table,
      original_id: record.original_id,
      record_data: record.record_data,
      module_name: record.module_name,
      record_name: record.record_name,
      deleted_from_bin_by: user.id,
      original_deleted_by: record.deleted_by,
      original_deleted_at: record.deleted_at
    }));

    const { error: logError } = await supabase
      .from('permanent_deletion_log')
      .insert(logEntries);

    if (logError) throw logError;

    // Delete from recycle bin
    let deleteQuery = supabase.from('recycle_bin').delete();
    if (ids && ids.length > 0) {
      deleteQuery = deleteQuery.in('id', ids);
    } else {
      deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Error clearing recycle bin:', error);
    return false;
  }
};
