import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { PurchaseRecord } from '../types';
import { loadRecords, addRecord, deleteRecord } from '../utils/storage';
import { filterByYear, calcTaxSummary } from '../utils/tax';
import { exportToCsv } from '../utils/exportCsv';
import Dashboard from '../components/Dashboard';
import RecordForm from '../components/RecordForm';
import BarcodeScanner from '../components/BarcodeScanner';
import type { DrugEntry } from '../data/drugDatabase';

const GREEN = '#1a6b3c';
const fmt = (n: number) => n.toLocaleString('ja-JP');

export default function RecordsScreen() {
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [prefillDrug, setPrefillDrug] = useState<DrugEntry | null>(null);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  useEffect(() => { loadRecords().then(setRecords); }, []);

  // 薬品検索タブからの「購入記録に追加」を受け取る
  useFocusEffect(
    useCallback(() => {
      const incoming = route.params?.prefillDrug as DrugEntry | undefined;
      if (incoming) {
        setPrefillDrug(incoming);
        setShowForm(true);
        navigation.setParams({ prefillDrug: undefined });
      }
    }, [route.params?.prefillDrug])
  );

  const yearRecords = filterByYear(records, year);
  const summary = calcTaxSummary(yearRecords);
  const sorted = [...yearRecords].sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = useCallback(async (record: PurchaseRecord) => {
    const next = await addRecord(records, record);
    setRecords(next);
    setShowForm(false);
    setPrefillDrug(null);
  }, [records]);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('削除確認', 'この記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        const next = await deleteRecord(records, id);
        setRecords(next);
      }},
    ]);
  }, [records]);

  const handleScanDetected = (drug: DrugEntry, jan: string) => {
    // DB未登録の場合はJANコードをnoteにセットして手入力へ誘導
    const resolved = drug.name
      ? drug
      : { ...drug, note: `JAN: ${jan}` };
    setPrefillDrug(resolved);
    setShowScanner(false);
    setShowForm(true);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ヘッダー */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>記録・集計</Text>
        </View>
        <View style={s.headerActions}>
          <Pressable style={s.btnExport} onPress={() => exportToCsv(yearRecords, year)} disabled={yearRecords.length === 0}>
            <Text style={s.btnExportText}>CSV</Text>
          </Pressable>
          <Pressable style={s.btnAdd} onPress={() => { setPrefillDrug(null); setShowForm(true); }}>
            <Text style={s.btnAddText}>＋ 追加</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(r) => r.id}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <Dashboard summary={summary} year={year} onYearChange={setYear} />
            <Text style={s.listTitle}>{year}年の購入記録（{yearRecords.length}件）</Text>
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>購入記録がありません</Text>
            <Text style={s.emptyHint}>「＋ 追加」から登録してください</Text>
          </View>
        }
        renderItem={({ item: r }) => (
          <View style={[s.row, !r.eligible && s.rowDimmed]}>
            <View style={s.rowLeft}>
              <Text style={s.rowDate}>{r.date}</Text>
              <Text style={s.rowName}>{r.productName}</Text>
              {r.store ? <Text style={s.rowSub}>{r.store}</Text> : null}
            </View>
            <View style={s.rowRight}>
              <View style={[s.tagBadge, r.eligible ? s.tagEligible : s.tagNot]}>
                <Text style={s.tagText}>{r.eligible ? '対象' : '対象外'}</Text>
              </View>
              <Text style={s.rowAmount}>¥{fmt(r.amount)}</Text>
              <Pressable onPress={() => handleDelete(r.id)}>
                <Text style={s.deleteBtn}>削除</Text>
              </Pressable>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />

      {/* 記録追加モーダル */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={s.modalSafe}>
          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            <RecordForm
              key={prefillDrug?.jan ?? 'manual'}
              onAdd={handleAdd}
              onCancel={() => { setShowForm(false); setPrefillDrug(null); }}
              onScanRequest={() => { setShowForm(false); setShowScanner(true); }}
              prefillDrug={prefillDrug}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* バーコードスキャナー */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner onDetected={handleScanDetected} onClose={() => setShowScanner(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a6b3c', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  btnExport: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  btnExportText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnAdd: { backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  btnAddText: { color: GREEN, fontWeight: '700', fontSize: 13 },
  listContent: { padding: 12, gap: 0 },
  listTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: '#a0aec0', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#cbd5e0', marginTop: 4 },
  row: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8 },
  rowDimmed: { opacity: 0.55 },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 11, color: '#718096', marginBottom: 2 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 11, color: '#718096', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  tagBadge: { borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  tagEligible: { backgroundColor: '#c6f6d5' },
  tagNot: { backgroundColor: '#e2e8f0' },
  tagText: { fontSize: 10, fontWeight: '700' },
  rowAmount: { fontSize: 15, fontWeight: '700' },
  deleteBtn: { color: '#e53e3e', fontSize: 12 },
  separator: { height: 6 },
  modalSafe: { flex: 1, backgroundColor: '#f0f4f8' },
  modalScroll: { padding: 16 },
});
