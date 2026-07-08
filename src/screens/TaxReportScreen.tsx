import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { loadRecords } from '../utils/storage';
import { filterByYear, calcTaxSummary } from '../utils/tax';
import type { PurchaseRecord, TaxSummary } from '../types';
import { DEDUCTION_THRESHOLD, DEDUCTION_MAX } from '../types';
import { loadHealthCheck, saveHealthCheck, isEligibleForTax } from '../utils/healthCheck';
import type { HealthCheckData } from '../utils/healthCheck';
import { requestNotificationPermission, scheduleTaxReminders, cancelAllReminders } from '../utils/notifications';

const GREEN = '#1a6b3c';
const fmt = (n: number) => n.toLocaleString('ja-JP');

const STEPS = [
  { num: 1, title: '健康診断等の証明書類を用意する', body: '健康診断・予防接種・定期検診等を受けた証明が必要です。領収書や結果通知書を保管してください。' },
  { num: 2, title: '対象医薬品の領収書を保管する', body: '購入したOTC薬のレシート・領収書をすべて保管。税制対象製品には「★マーク」が表示されています。' },
  { num: 3, title: '明細書を作成・印刷する', body: 'MediSelfの「明細書PDF出力」ボタンから医療費控除の明細書（特例用）を自動生成できます。' },
  { num: 4, title: '確定申告書を提出する', body: '確定申告期間（2月16日〜3月15日）に提出します。e-Tax・マイナポータル・郵送・税務署窓口の4通りの方法があります。' },
];

// 確定申告の提出方法詳細
const FILING_METHODS = [
  {
    title: 'e-Tax（推奨）',
    icon: '💻',
    color: '#2b6cb0',
    bg: '#ebf8ff',
    steps: [
      '国税庁「確定申告書等作成コーナー」にアクセス',
      'マイナンバーカードまたはID・パスワードでログイン',
      '医療費控除（特例）を選択し、金額を入力',
      'MediSelfで作成した明細書のデータを参照して入力',
      '送信ボタンで申告完了（書類の郵送不要）',
    ],
    note: '還付申告は1月1日から申告可能。24時間受付。',
    url: 'https://www.keisan.nta.go.jp/',
  },
  {
    title: 'マイナポータル連携',
    icon: '📱',
    color: '#1a6b3c',
    bg: '#f0fdf4',
    steps: [
      'マイナポータル（myna.go.jp）にマイナンバーカードでログイン',
      '「確定申告」または「医療費通知情報」を選択',
      '健康診断結果・薬局の購入記録が自動連携される場合あり',
      'MediSelfの明細書データと照合・補完',
      'e-Taxと連携して申告を送信',
    ],
    note: '連携している薬局・医療機関のデータは自動取込可能。',
    url: 'https://myna.go.jp/',
  },
  {
    title: '書面提出（郵送）',
    icon: '📮',
    color: '#718096',
    bg: '#f7fafc',
    steps: [
      'MediSelfで明細書PDFを印刷',
      '確定申告書A（または確定申告書B）を税務署で入手 or 国税庁サイトからダウンロード',
      '明細書・源泉徴収票・健康診断証明書を添付',
      '税務署に郵送（消印有効：3月15日）',
    ],
    note: '還付金は申告から1〜2ヶ月後に銀行口座に振込。',
    url: null,
  },
  {
    title: '税務署窓口',
    icon: '🏛️',
    color: '#718096',
    bg: '#f7fafc',
    steps: [
      '住所地を管轄する税務署に必要書類を持参',
      '明細書・源泉徴収票・健康診断証明書・印鑑が必要',
      '2月16日〜3月15日の受付期間中に提出',
      '混雑する場合があるため事前予約を推奨',
    ],
    note: '還付申告のみの場合は確定申告期間外（1月〜）でも受付。',
    url: 'https://www.nta.go.jp/',
  },
];

export default function TaxReportScreen() {
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [year] = useState(new Date().getFullYear());
  const [healthCheck, setHealthCheck] = useState<HealthCheckData | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRecords().then(setRecords);
      loadHealthCheck(year).then(setHealthCheck);
    }, [year])
  );

  const toggleHealthItem = async (key: string, value: boolean) => {
    if (!healthCheck) return;
    const updated = { ...healthCheck, items: { ...healthCheck.items, [key]: value } };
    setHealthCheck(updated);
    await saveHealthCheck(updated);
  };

  const updateMemo = async (text: string) => {
    if (!healthCheck) return;
    const updated = { ...healthCheck, memo: text };
    setHealthCheck(updated);
    await saveHealthCheck(updated);
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('エラー', 'リンクを開けませんでした');
    }
  };

  const toggleNotif = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('通知の許可が必要です', '設定アプリから通知を許可してください。');
        return;
      }
      await scheduleTaxReminders();
      Alert.alert('通知を設定しました', '1月〜3月の確定申告シーズンにリマインダーが届きます。');
    } else {
      await cancelAllReminders();
    }
    setNotifEnabled(val);
  };

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

        {/* 健康診断メモ */}
        <Text style={s.sectionTitle}>健康診断受診チェック（申告要件）</Text>
        <View style={s.healthCard}>
          <Text style={s.healthNote}>
            セルフメディケーション税制を申告するには、その年に以下のいずれかを受けていることが必要です。
          </Text>
          {healthCheck && Object.entries(healthCheck.items).map(([key, checked]) => (
            <View key={key} style={s.healthRow}>
              <Switch
                value={checked}
                onValueChange={(v) => toggleHealthItem(key, v)}
                trackColor={{ true: GREEN }}
                thumbColor="#fff"
              />
              <Text style={[s.healthLabel, checked && s.healthLabelChecked]}>{key}</Text>
            </View>
          ))}
          {healthCheck && (
            <View style={s.memoBox}>
              <Text style={s.memoLabel}>メモ（受診日・証明書の保管場所など）</Text>
              <TextInput
                style={s.memoInput}
                value={healthCheck.memo}
                onChangeText={updateMemo}
                placeholder="例：2026/04/15 職場健診 受診済み、結果通知書は自宅保管"
                multiline
              />
            </View>
          )}
          {healthCheck && (
            <View style={[s.eligibleBanner, isEligibleForTax(healthCheck) ? s.bannerOk : s.bannerNg]}>
              <Text style={s.eligibleBannerText}>
                {isEligibleForTax(healthCheck)
                  ? '✓ 申告要件（健康増進の取り組み）を満たしています'
                  : '✗ いずれか1つにチェックが必要です'}
              </Text>
            </View>
          )}
        </View>

        {/* 確定申告リマインダー通知 */}
        <Text style={s.sectionTitle}>確定申告リマインダー通知</Text>
        <View style={s.notifCard}>
          <View style={s.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.notifTitle}>確定申告シーズンに通知を受け取る</Text>
              <Text style={s.notifDesc}>1月・2月・3月に申告を促す通知が届きます</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotif}
              trackColor={{ true: GREEN }}
              thumbColor="#fff"
            />
          </View>
          {notifEnabled && (
            <View style={s.notifSchedule}>
              {['1月10日：申告準備を開始しよう', '2月1日：申告まであと2週間', '2月16日：申告受付開始！', '3月10日：締め切りまであと5日'].map((t) => (
                <Text key={t} style={s.notifScheduleItem}>📅 {t}</Text>
              ))}
            </View>
          )}
        </View>

        {/* 確定申告の提出方法 詳細 */}
        <Text style={s.sectionTitle}>申告の提出方法（詳細）</Text>
        {FILING_METHODS.map((method) => (
          <View key={method.title} style={[s.methodCard, { backgroundColor: method.bg, borderColor: method.color }]}>
            <View style={s.methodHeader}>
              <Text style={s.methodIcon}>{method.icon}</Text>
              <Text style={[s.methodTitle, { color: method.color }]}>{method.title}</Text>
              {method.url && (
                <Pressable style={[s.methodLinkBtn, { borderColor: method.color }]}
                  onPress={() => openLink(method.url!)}>
                  <Text style={[s.methodLinkText, { color: method.color }]}>開く →</Text>
                </Pressable>
              )}
            </View>
            {method.steps.map((step, i) => (
              <View key={i} style={s.methodStep}>
                <View style={[s.methodStepNum, { backgroundColor: method.color }]}>
                  <Text style={s.methodStepNumText}>{i + 1}</Text>
                </View>
                <Text style={s.methodStepText}>{step}</Text>
              </View>
            ))}
            <View style={s.methodNote}>
              <Text style={[s.methodNoteText, { color: method.color }]}>💡 {method.note}</Text>
            </View>
          </View>
        ))}

        {/* マイナポータル連携 */}
        <Text style={s.sectionTitle}>マイナポータルとの連携</Text>
        <View style={s.mynaportalCard}>
          <View style={s.mynaportalHeader}>
            <Text style={s.mynaportalTitle}>マイナポータルでできること</Text>
            <Pressable style={s.mynaportalBtn}
              onPress={() => openLink('https://myna.go.jp/')}>
              <Text style={s.mynaportalBtnText}>サイトを開く</Text>
            </Pressable>
          </View>
          {[
            { icon: '🏥', text: '健康診断の結果・証明書を取得（申告要件の確認）' },
            { icon: '💊', text: '参加薬局の購入履歴を自動連携（一部薬局のみ）' },
            { icon: '📋', text: 'e-Taxと連携し確定申告をワンストップで完了' },
            { icon: '🔒', text: 'マイナンバーカードで安全に本人確認' },
          ].map((item) => (
            <View key={item.text} style={s.mynaportalItem}>
              <Text style={s.mynaportalItemIcon}>{item.icon}</Text>
              <Text style={s.mynaportalItemText}>{item.text}</Text>
            </View>
          ))}
          <View style={s.mynaportalNote}>
            <Text style={s.mynaportalNoteText}>
              ※ MediSelfで作成した明細書PDFをマイナポータル経由のe-Tax申告に添付できます。{'\n'}
              ※「サイトを開く」はブラウザでマイナポータル（myna.go.jp）を開きます。
            </Text>
          </View>
        </View>

        {/* 必要書類チェック */}
        <Text style={s.sectionTitle}>提出時の必要書類</Text>
        <View style={s.docsCard}>
          {[
            { req: true,  text: '医療費控除の明細書（特例用）← MediSelfで自動生成' },
            { req: true,  text: '源泉徴収票（給与所得者）または確定申告書' },
            { req: true,  text: '健康診断等の証明書類（受診証明書・領収書）' },
            { req: false, text: '対象医薬品の領収書（明細書提出の場合は添付不要・5年間保管）' },
            { req: false, text: 'マイナンバーカード（e-Tax・マイナポータル利用時）' },
          ].map((doc) => (
            <View key={doc.text} style={s.docRow}>
              <Text style={[s.docBadge, doc.req ? s.docRequired : s.docOptional]}>
                {doc.req ? '必須' : '任意'}
              </Text>
              <Text style={s.docText}>{doc.text}</Text>
            </View>
          ))}
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
  // 提出方法
  methodCard: { borderRadius: 10, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  methodIcon: { fontSize: 20 },
  methodTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  methodLinkBtn: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  methodLinkText: { fontSize: 12, fontWeight: '700' },
  methodStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  methodStepNum: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  methodStepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  methodStepText: { fontSize: 12, color: '#2d3748', flex: 1, lineHeight: 18 },
  methodNote: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  methodNoteText: { fontSize: 11, lineHeight: 16 },
  // マイナポータル
  mynaportalCard: { backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1.5, borderColor: '#38a169', padding: 14, marginBottom: 12 },
  mynaportalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  mynaportalTitle: { fontSize: 14, fontWeight: '700', color: '#1a6b3c' },
  mynaportalBtn: { backgroundColor: '#1a6b3c', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  mynaportalBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mynaportalItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  mynaportalItemIcon: { fontSize: 16, marginTop: 1 },
  mynaportalItemText: { fontSize: 13, color: '#2d3748', flex: 1, lineHeight: 19 },
  mynaportalNote: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#9ae6b4' },
  mynaportalNoteText: { fontSize: 10, color: '#718096', lineHeight: 16 },
  // 必要書類
  docsCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, marginBottom: 16 },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  docBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, fontWeight: '700', flexShrink: 0, marginTop: 2 },
  docRequired: { backgroundColor: '#fed7d7', color: '#c53030' },
  docOptional: { backgroundColor: '#e2e8f0', color: '#718096' },
  docText: { fontSize: 12, color: '#2d3748', flex: 1, lineHeight: 18 },
  // 健康診断
  healthCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 8 },
  healthNote: { fontSize: 12, color: '#4a5568', marginBottom: 10, lineHeight: 18 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
  healthLabel: { fontSize: 14, color: '#718096', flex: 1 },
  healthLabelChecked: { color: '#1a6b3c', fontWeight: '600' },
  memoBox: { marginTop: 12 },
  memoLabel: { fontSize: 11, color: '#718096', marginBottom: 4 },
  memoInput: { borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 6, padding: 10, fontSize: 13, minHeight: 60 },
  eligibleBanner: { borderRadius: 6, padding: 10, marginTop: 10 },
  bannerOk: { backgroundColor: '#f0fdf4' },
  bannerNg: { backgroundColor: '#fffaf0' },
  eligibleBannerText: { fontSize: 13, fontWeight: '600' },
  // 通知
  notifCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 8 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#1a202c' },
  notifDesc: { fontSize: 11, color: '#718096', marginTop: 2 },
  notifSchedule: { marginTop: 10, gap: 4 },
  notifScheduleItem: { fontSize: 12, color: '#4a5568' },
});
