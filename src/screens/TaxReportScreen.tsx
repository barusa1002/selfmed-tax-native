import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { loadRecords } from '../utils/storage';
import { filterByYear, calcTaxSummary } from '../utils/tax';
import type { PurchaseRecord, TaxSummary } from '../types';
import { DEDUCTION_THRESHOLD, DEDUCTION_MAX } from '../types';

const GREEN = '#1a6b3c';
const fmt = (n: number) => n.toLocaleString('ja-JP');

const STEPS = [
  { num: 1, title: '健康診断等の証明書類を用意する', body: '健康診断・予防接種・定期検診等を受けた証明が必要です。領収書や結果通知書を保管してください。' },
  { num: 2, title: '対象医薬品の領収書を保管する', body: '購入したOTC薬のレシート・領収書をすべて保管。税制対象製品には「★マーク」が表示されています。' },
  { num: 3, title: '明細書を作成・印刷する', body: '下の「PDF出力・印刷」ボタンから明細書を作成できます。' },
  { num: 4, title: '確定申告書を提出する', body: '確定申告期間（2月16日〜3月15日）にe-Taxまたは税務署窓口で提出します。' },
];

export default function TaxReportScreen() {
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => { loadRecords().then(setRecords); }, []);

  const yearRecords = filterByYear(records, year);
  const summary = calcTaxSummary(yearRecords);
  const { totalAmount, eligibleAmount, deductibleAmount, isEligible } = summary;
  const sorted = [...yearRecords].sort((a, b) => a.date.localeCompare(b.date));

  const handlePrint = async () => {
    const rows = sorted.map((r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.productName}</td>
        <td>${r.store || '—'}</td>
        <td style="text-align:right">${fmt(r.amount)}</td>
        <td style="text-align:right">0</td>
        <td style="text-align:right">${fmt(r.amount)}</td>
      </tr>`).join('');

    const html = `
    <html><head><meta charset="utf-8">
    <style>body{font-family:sans-serif;padding:20px;font-size:12px}h1{font-size:18px;text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#eee}tfoot td{font-weight:bold;background:#f5f5f5}.calc{margin-top:16px;width:50%;border-collapse:collapse}.calc td{border:1px solid #ccc;padding:6px}.hl{background:#e6f9ee;font-weight:bold}</style>
    </head><body>
    <h1>医療費控除の明細書（特例用）</h1>
    <p style="text-align:center">セルフメディケーション税制 ／ ${year}年分</p>
    <table>
      <thead><tr><th>購入日</th><th>医薬品の名称</th><th>購入店舗</th><th>支払金額</th><th>補填金額</th><th>差引金額</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3">合計</td><td style="text-align:right">${fmt(eligibleAmount)}</td><td style="text-align:right">0</td><td style="text-align:right">${fmt(eligibleAmount)}</td></tr></tfoot>
    </table>
    <table class="calc" style="margin-top:16px">
      <tr><td>差引金額の合計（A）</td><td style="text-align:right">¥${fmt(eligibleAmount)}</td></tr>
      <tr><td>A − ¥12,000（基礎控除）</td><td style="text-align:right">¥${fmt(Math.max(eligibleAmount - DEDUCTION_THRESHOLD, 0))}</td></tr>
      <tr class="hl"><td>医療費控除額（上限¥88,000）</td><td style="text-align:right">¥${fmt(deductibleAmount)}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:11px">氏名:___________________ 住所:___________________________________</p>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: '明細書PDF' });
    } catch {
      Alert.alert('エラー', 'PDF作成に失敗しました');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>確定申告サポート</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* 申告要件 */}
        <View style={[s.requireBox, isEligible ? s.requireOk : s.requireNg]}>
          <Text style={s.requireIcon}>{isEligible ? '✓' : '✗'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.requireTitle}>{year}年は{isEligible ? '申告可能です' : 'まだ申告できません'}</Text>
            {isEligible ? (
              <Text style={s.requireBody}>対象薬品合計 ¥{fmt(eligibleAmount)} ／ 控除額 ¥{fmt(deductibleAmount)}</Text>
            ) : (
              <Text style={s.requireBody}>あと ¥{fmt(DEDUCTION_THRESHOLD - eligibleAmount)} の購入で控除対象になります</Text>
            )}
          </View>
        </View>

        {/* 手順ガイド */}
        <Text style={s.sectionTitle}>申告の手順</Text>
        {STEPS.map((step) => (
          <View key={step.num} style={s.stepCard}>
            <View style={s.stepNum}><Text style={s.stepNumText}>{step.num}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}

        {/* 明細書出力 */}
        <Text style={s.sectionTitle}>明細書プレビュー・印刷</Text>
        <View style={s.previewCard}>
          {sorted.length === 0 ? (
            <Text style={s.noRecord}>購入記録がありません。「記録・集計」タブから登録してください。</Text>
          ) : (
            <>
              {sorted.map((r) => (
                <View key={r.id} style={s.previewRow}>
                  <Text style={s.previewDate}>{r.date}</Text>
                  <Text style={s.previewName} numberOfLines={1}>{r.productName}</Text>
                  <Text style={s.previewAmount}>¥{fmt(r.amount)}</Text>
                </View>
              ))}
              <View style={s.previewTotal}>
                <Text style={s.previewTotalLabel}>対象合計</Text>
                <Text style={s.previewTotalValue}>¥{fmt(eligibleAmount)}</Text>
              </View>
              <View style={s.previewTotal}>
                <Text style={s.previewTotalLabel}>控除額</Text>
                <Text style={[s.previewTotalValue, { color: GREEN }]}>¥{fmt(deductibleAmount)}</Text>
              </View>
              <Pressable style={s.printBtn} onPress={handlePrint}>
                <Text style={s.printBtnText}>PDF出力・印刷</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* e-Tax案内 */}
        <Text style={s.sectionTitle}>オンライン申告（e-Tax）</Text>
        <View style={s.etaxCard}>
          <Text style={s.etaxText}>国税庁の「確定申告書等作成コーナー」でオンライン申告が可能です。マイナンバーカードで利用できます。</Text>
          <Text style={s.etaxUrl}>keisan.nta.go.jp</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  content: { padding: 12, gap: 8 },
  requireBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 4 },
  requireOk: { backgroundColor: '#f0fdf4', borderColor: '#9ae6b4' },
  requireNg: { backgroundColor: '#fffaf0', borderColor: '#fbd38d' },
  requireIcon: { fontSize: 22, lineHeight: 26 },
  requireTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  requireBody: { fontSize: 13, color: '#4a5568' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 4, borderBottomWidth: 2, borderBottomColor: '#e2e8f0', paddingBottom: 4 },
  stepCard: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: GREEN, marginBottom: 6 },
  stepNum: { width: 24, height: 24, backgroundColor: GREEN, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  stepTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  stepBody: { fontSize: 12, color: '#4a5568', lineHeight: 18 },
  previewCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 4 },
  noRecord: { color: '#a0aec0', fontSize: 13, textAlign: 'center', padding: 16 },
  previewRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f4f8', gap: 8 },
  previewDate: { fontSize: 11, color: '#718096', width: 80 },
  previewName: { flex: 1, fontSize: 13, fontWeight: '500' },
  previewAmount: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
  previewTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4 },
  previewTotalLabel: { fontSize: 13, fontWeight: '700' },
  previewTotalValue: { fontSize: 15, fontWeight: '700' },
  printBtn: { backgroundColor: '#2b6cb0', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
  printBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  etaxCard: { backgroundColor: '#ebf8ff', borderRadius: 8, padding: 14, marginBottom: 16 },
  etaxText: { fontSize: 13, color: '#2b6cb0', lineHeight: 20 },
  etaxUrl: { fontSize: 12, color: '#2b6cb0', fontWeight: '700', marginTop: 6, fontFamily: 'monospace' },
});
