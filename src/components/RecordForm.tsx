import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Switch, FlatList, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { PurchaseRecord } from '../types';
import type { DrugEntry } from '../data/drugDatabase';
import { searchByName } from '../data/drugDatabase';

interface Props {
  onAdd: (record: PurchaseRecord) => void;
  onCancel: () => void;
  onScanRequest: () => void;
  prefillDrug?: DrugEntry | null;
  editRecord?: PurchaseRecord | null;
  onUpdate?: (record: PurchaseRecord) => void;
}

const GREEN = '#1a6b3c';

export default function RecordForm({ onAdd, onCancel, onScanRequest, prefillDrug, editRecord, onUpdate }: Props) {
  const isEdit = !!editRecord;
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(editRecord?.date ?? today);
  const [productName, setProductName] = useState(editRecord?.productName ?? prefillDrug?.name ?? '');
  const [amount, setAmount] = useState(
    editRecord ? String(editRecord.amount) : prefillDrug ? String(prefillDrug.price) : ''
  );
  const [store, setStore] = useState(editRecord?.store ?? '');
  const [note, setNote] = useState(editRecord?.note ?? '');
  const [eligible, setEligible] = useState(editRecord?.eligible ?? prefillDrug?.eligible ?? true);
  const [suggestions, setSuggestions] = useState<DrugEntry[]>([]);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // YYYY-MM-DD → ローカル時間のDateオブジェクト（タイムゾーンずれ防止）
  const parseDateStr = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const formatDateDisplay = (s: string): string => {
    const [y, m, d] = s.split('-');
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
  };
  const onDateChange = (_: unknown, selected?: Date) => {
    if (selected) {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
    }
    // inline表示では完了ボタンで閉じる（spinner系は即閉じる）
    if (Platform.OS === 'android') setShowDatePicker(false);
  };

  const handleNameChange = (v: string) => {
    setProductName(v);
    setError('');
    setSuggestions(v.length >= 2 ? searchByName(v).slice(0, 5) : []);
  };

  const applySuggestion = (drug: DrugEntry) => {
    setProductName(drug.name);
    if (!amount) setAmount(String(drug.price));
    setEligible(drug.eligible);
    setSuggestions([]);
  };

  const handleSubmit = () => {
    if (!productName.trim()) { setError('商品名を入力してください'); return; }
    if (!amount || Number(amount) <= 0) { setError('金額を正しく入力してください'); return; }
    if (isEdit && editRecord && onUpdate) {
      onUpdate({ ...editRecord, date, productName: productName.trim(), amount: Number(amount), store: store.trim(), note: note.trim(), eligible });
    } else {
      onAdd({ id: Math.random().toString(36).slice(2), date, productName: productName.trim(), amount: Number(amount), store: store.trim(), note: note.trim(), eligible });
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{isEdit ? '記録を編集' : '購入記録を追加'}</Text>
        <Pressable onPress={onCancel}><Text style={s.cancel}>✕</Text></Pressable>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Text style={s.label}>購入日</Text>
      <Pressable style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
        <Text style={s.dateBtnIcon}>📅</Text>
        <Text style={s.dateBtnText}>{formatDateDisplay(date)}</Text>
      </Pressable>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={s.dateOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={s.datePickerCard} onPress={(e) => e.stopPropagation()}>
            <View style={s.datePickerHeader}>
              <Text style={s.datePickerTitle}>購入日を選択</Text>
              <Pressable style={s.datePickerDone} onPress={() => setShowDatePicker(false)}>
                <Text style={s.datePickerDoneText}>完了</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={parseDateStr(date)}
              mode="date"
              display="inline"
              locale="ja-JP"
              onChange={onDateChange}
              maximumDate={new Date()}
              style={s.datePicker}
              accentColor={GREEN}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={s.label}>商品名 <Text style={s.required}>*</Text></Text>
      <View style={s.nameRow}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={productName}
          onChangeText={handleNameChange}
          placeholder="例: ロキソニンS"
          autoComplete="off"
        />
        <Pressable style={s.scanBtn} onPress={onScanRequest}>
          <Text style={s.scanBtnText}>📷</Text>
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(d) => d.name}
          style={s.suggestions}
          renderItem={({ item: d }) => (
            <Pressable style={s.suggestionItem} onPress={() => applySuggestion(d)}>
              <Text style={s.sugName}>{d.name}</Text>
              <Text style={s.sugMaker}>{d.maker}</Text>
              <View style={[s.sugBadge, d.eligible ? s.badgeEligible : s.badgeNot]}>
                <Text style={s.sugBadgeText}>{d.eligible ? '対象' : '対象外'}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Text style={s.label}>購入金額（円） <Text style={s.required}>*</Text></Text>
      <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="例: 1280" keyboardType="numeric" />

      <Text style={s.label}>購入店舗</Text>
      <TextInput style={s.input} value={store} onChangeText={setStore} placeholder="例: ドラッグストア○○店" />

      <Text style={s.label}>メモ</Text>
      <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="例: レシート保管済み" />

      <View style={[s.eligibleBox, eligible ? s.eligibleOn : s.eligibleOff]}>
        <Text style={s.eligibleLabel}>セルフメディケーション税制の対象商品</Text>
        <Switch value={eligible} onValueChange={setEligible} trackColor={{ true: GREEN }} thumbColor="#fff" />
      </View>
      {!eligible && <Text style={s.eligibleHint}>対象外の場合、控除計算には含まれません</Text>}

      <View style={s.actions}>
        <Pressable style={s.btnSecondary} onPress={onCancel}>
          <Text style={s.btnSecondaryText}>キャンセル</Text>
        </Pressable>
        <Pressable style={s.btnPrimary} onPress={handleSubmit}>
          <Text style={s.btnPrimaryText}>{isEdit ? '更新する' : '追加する'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#1a6b3c', borderRadius: 8, padding: 10, backgroundColor: '#f0fdf4', marginBottom: 2 },
  dateBtnIcon: { fontSize: 16 },
  dateBtnText: { fontSize: 15, color: '#1a6b3c', fontWeight: '600' },
  dateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  datePickerCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', width: 340, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  datePickerTitle: { fontSize: 15, fontWeight: '700', color: '#1a202c' },
  datePickerDone: { backgroundColor: '#1a6b3c', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6 },
  datePickerDoneText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  datePicker: { width: 340 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700' },
  cancel: { fontSize: 20, color: '#718096', paddingHorizontal: 4 },
  error: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fc8181', color: '#c53030', padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 4, marginTop: 8 },
  required: { color: '#e53e3e' },
  input: { borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 2 },
  nameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanBtn: { backgroundColor: '#ebf8ff', borderWidth: 1.5, borderColor: '#90cdf4', borderRadius: 8, padding: 10 },
  scanBtnText: { fontSize: 20 },
  suggestions: { maxHeight: 180, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 4 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f4f8', gap: 8 },
  sugName: { flex: 1, fontWeight: '600', fontSize: 13 },
  sugMaker: { fontSize: 11, color: '#718096' },
  sugBadge: { borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  badgeEligible: { backgroundColor: '#c6f6d5' },
  badgeNot: { backgroundColor: '#e2e8f0' },
  sugBadgeText: { fontSize: 10, fontWeight: '700' },
  eligibleBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1.5, marginTop: 12 },
  eligibleOn: { backgroundColor: '#f0fdf4', borderColor: '#9ae6b4' },
  eligibleOff: { backgroundColor: '#f7fafc', borderColor: '#e2e8f0' },
  eligibleLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  eligibleHint: { fontSize: 11, color: '#718096', marginTop: 4, marginBottom: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  btnSecondary: { borderWidth: 1.5, borderColor: '#1a6b3c', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  btnSecondaryText: { color: '#1a6b3c', fontWeight: '700', fontSize: 14 },
  btnPrimary: { backgroundColor: '#1a6b3c', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
