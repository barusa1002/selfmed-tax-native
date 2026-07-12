import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { PurchaseRecord } from '../types';

// カンマ・引用符・改行を含むフィールドを RFC 4180 に沿ってエスケープする
function escapeCsvField(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportToCsv(records: PurchaseRecord[], year: number): Promise<void> {
  const header = '日付,商品名,税制対象,購入金額(円),購入店舗,メモ';
  const rows = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) =>
      [
        r.date,
        r.productName,
        r.eligible ? '対象' : '対象外',
        r.amount,
        r.store || '',
        r.note || '',
      ]
        .map(escapeCsvField)
        .join(',')
    );
  const bom = '﻿';
  const csv = bom + [header, ...rows].join('\n');

  const path = `${FileSystem.cacheDirectory}selfmed_${year}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'CSVを共有' });
  }
}
