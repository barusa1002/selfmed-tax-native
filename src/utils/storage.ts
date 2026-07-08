import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PurchaseRecord } from '../types';

const KEY = 'selfmed_records';

export async function loadRecords(): Promise<PurchaseRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const records: PurchaseRecord[] = raw ? JSON.parse(raw) : [];
    return records.map((r) => ({ ...r, eligible: r.eligible ?? true }));
  } catch {
    return [];
  }
}

export async function saveRecords(records: PurchaseRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(records));
}

export async function addRecord(records: PurchaseRecord[], record: PurchaseRecord): Promise<PurchaseRecord[]> {
  const next = [...records, record];
  await saveRecords(next);
  return next;
}

export async function updateRecord(records: PurchaseRecord[], record: PurchaseRecord): Promise<PurchaseRecord[]> {
  const next = records.map((r) => (r.id === record.id ? record : r));
  await saveRecords(next);
  return next;
}

export async function deleteRecord(records: PurchaseRecord[], id: string): Promise<PurchaseRecord[]> {
  const next = records.filter((r) => r.id !== id);
  await saveRecords(next);
  return next;
}
