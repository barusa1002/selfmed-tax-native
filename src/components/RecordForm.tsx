import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Switch, FlatList, Alert } from 'react-native';
import type { PurchaseRecord } from '../types';
import type { DrugEntry } from '../data/drugDatabase';
import { searchByName } from '../data/drugDatabase';

interface Props {
  onAdd: (record: PurchaseRecord) => void;
  onCancel: () => void;
  onScanRequest: () => void;
  prefillDrug?: DrugEntry | null;
}

const GREEN = '#1a6b3c';

export default function RecordForm({ onAdd, onCancel, onScanRequest, prefillDrug }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [productName, setProductName] = useState(prefillDrug?.name ?? '');
  const [amount, setAmount] = useState(prefillDrug ? String(prefillDrug.price) : '');
  const [store, setStore] = useState('');
  const [note, setNote] = useState('');
  const [eligible, setEligible] = useState(prefillDrug?.eligible ?? true);
  const [suggestions, setSuggestions] = useState<DrugEntry[]>([]);
  const [error, setError] = useState('');

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
    onAdd({
      id: Math.random().toString(36).slice(2),
      date,
      productName: productName.trim(),
      amount: Number(amount),
      store: store.trim(),
      note: note.trim(),
      eligible,
    });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>購入記録を追加</Text>
        <Pressable onPress={onCancel}><Text style={s.cancel}>✕</Text></Pressable>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Text style={s.label}>購入日</Text>
      <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

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
      <TextInput style={s.input} value={store} onChangeText={setStore} placeholder="例: ウエルシア ○○店" />

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
          <Text style={s.btnPrimaryText}>追加する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
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
