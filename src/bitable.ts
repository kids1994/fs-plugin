import { bitable } from '@lark-base-open/js-sdk';

export type BitableField = { id: string; name: string };
export type BitableRecord = { recordId: string; fields: Record<string, unknown> };
export type BitableContext = {
  baseName: string;
  tableName: string;
  tableId: string;
  viewId: string | null;
  selectedRecordIds: string[];
  fields: BitableField[];
  records: BitableRecord[];
};

export async function loadBitableContext(): Promise<BitableContext> {
  const [selection, baseName] = await Promise.all([bitable.base.getSelection(), bitable.base.getBaseName()]);
  const table = selection.tableId
    ? await bitable.base.getTableById(selection.tableId)
    : await bitable.base.getActiveTable();
  const [tableMeta, fieldMeta, activeView] = await Promise.all([
    table.getMeta(), table.getFieldMetaList(), table.getActiveView(),
  ]);
  const viewMeta = await activeView.getMeta();
  const selectedRecordIds = selection.recordId
    ? [selection.recordId]
    : (await activeView.getVisibleRecordIdListByPage({ pageSize: 50 })).recordIds;
  const records = await Promise.all(selectedRecordIds.map(async (recordId) => ({
    recordId,
    fields: (await table.getRecordById(recordId)).fields,
  })));
  return {
    baseName,
    tableName: tableMeta.name,
    tableId: tableMeta.id,
    viewId: viewMeta.id,
    selectedRecordIds,
    fields: fieldMeta.map(({ id, name }) => ({ id, name })),
    records,
  };
}

const CONFIG_KEY = 'pharmcube-document-generator-config';

export async function loadPluginConfig<T>(): Promise<T | null> {
  try {
    return await bitable.bridge.getData<T>(CONFIG_KEY) ?? null;
  } catch {
    return null;
  }
}

export async function savePluginConfig<T>(config: T): Promise<boolean> {
  try {
    return await bitable.bridge.setData(CONFIG_KEY, config);
  } catch {
    return false;
  }
}

export async function selectBitableRecords(tableId: string, viewId: string): Promise<string[]> {
  return bitable.ui.selectRecordIdList(tableId, viewId);
}

export async function getBitableRecords(tableId: string, recordIds: string[]): Promise<BitableRecord[]> {
  const table = await bitable.base.getTableById(tableId);
  return Promise.all(recordIds.map(async (recordId) => ({
    recordId,
    fields: (await table.getRecordById(recordId)).fields,
  })));
}
