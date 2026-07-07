import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Alert, ScrollView, TextInput, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeReceipt } from '../utils/receiptOcr';
import { DRUG_DATABASE } from '../data/drugDatabase';
import type { OcrItem } from '../utils/receiptOcr';
import type { PurchaseRecord } from '../types';

interface Props {
  onAdd: (records: PurchaseRecord[]) => void;
  onClose: () => void;
}

type Stage = 'ready' | 'scanning' | 'result';
const GREEN = '#1a6b3c';

export default function ReceiptScanner({ onAdd, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('ready');
  const [ocrDate, setOcrDate] = useState(new Date().toISOString().split('T')[0]);
  const [ocrStore, setOcrStore] = useState('');
  const [items, setItems] = useState<(OcrItem & { selected: boolean; eligible: boolean })[]>([]);
  const [error, setError] = useState('');

  const pickImage = async (fromCamera: boolean) => {
    setError('');
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('権限が必要です',
        (fromCamera ? 'カメラ' : 'フォトライブラリ') + 'へのアクセスを許可してください。');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    setStage('scanning');
    try {
      const ocr = await analyzeReceipt(result.assets[0].base64!);
      setOcrDate(ocr.date || new Date().toISOString().split('T')[0]);
      setOcrStore(ocr.store || '');

      const enriched = ocr.items.map((item) => {
        const found = DRUG_DATABASE.find((d) =>
          d.name.includes(item.name) || item.name.includes(d.name.slice(0, 4))
        );
        return { ...item, selected: true, eligible: found?.eligible ?? true };
      });
      setItems(enriched);
      setStage('result');
    } catch (e: any) {
      setError('レシートの読み取りに失敗しました。鮮明な写真で再試行してください。');
      setStage('ready');
    }
  };

  const handleConfirm = () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) {
      Alert.alert('確認', '記録する薬品を1つ以上選択してください');
      return;
    }
    const records: PurchaseRecord[] = selected.map((item) => ({
      id: Math.random().toString(36).slice(2),
      date: ocrDate,
      productName: item.name,
      amount: item.price,
      store: ocrStore,
      note: 'レシートOCR',
      eligible: item.eligible,
    }));
    onAdd(records);
  };

  // ── スキャン中 ──
  if (stage === 'scanning') {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={s.scanningText}>AIがレシートを読み取っています...</Text>
        <Text style={s.scanningNote}>通常5〜15秒かかります</Text>
      </View>
    );
  }

  // ── 結果確認 ──
  if (stage === 'result') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>読み取り結果を確認</Text>
          <Pressable onPress={onClose}><Text style={s.close}>✕</Text></Pressable>
        </View>
        <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
          {items.length === 0 ? (
            <View style={s.noItems}>
              <Text style={s.noItemsText}>医薬品が見つかりませんでした</Text>
              <Text style={s.noItemsNote}>レシートに医薬品が含まれているか確認してください</Text>
              <Pressable style={s.btnSub} onPress={() => setStage('ready')}>
                <Text style={s.btnSubText}>再スキャン</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>購入日</Text>
                  <TextInput
                    style={s.metaInput}
                    value={ocrDate}
                    onChangeText={setOcrDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={[s.metaItem, { flex: 1.5 }]}>
                  <Text style={s.metaLabel}>店舗名</Text>
                  <TextInput
                    style={s.metaInput}
                    value={ocrStore}
                    onChangeText={setOcrStore}
                    placeholder="例: ウエルシア ○○店"
                  />
                </View>
              </View>

              <Text style={s.itemsHeader}>
                検出された医薬品（{items.filter((i) => i.selected).length}/{items.length}件を記録）
              </Text>

              {items.map((item, idx) => (
                <View key={idx} style={[s.itemRow, !item.selected && s.itemRowDimmed]}>
                  <Switch
                    value={item.selected}
                    onValueChange={(v) =>
                      setItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: v } : it))
                    }
                    trackColor={{ true: GREEN }}
                    thumbColor="#fff"
                  />
                  <View style={s.itemInfo}>
                    <TextInput
                      style={s.itemName}
                      value={item.name}
                      onChangeText={(v) =>
                        setItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: v } : it))
                      }
                    />
                    <View style={s.itemBottom}>
                      <TextInput
                        style={s.itemPrice}
                        value={String(item.price)}
                        onChangeText={(v) =>
                          setItems((prev) => prev.map((it, i) => i === idx ? { ...it, price: parseInt(v) || 0 } : it))
                        }
                        keyboardType="numeric"
                      />
                      <Text style={s.itemPriceUnit}>円</Text>
                      <View style={[s.eligBadge, item.eligible ? s.eligOn : s.eligOff]}>
                        <Text style={s.eligText}>{item.eligible ? '税制対象' : '対象外'}</Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setItems((prev) => prev.map((it, i) => i === idx ? { ...it, eligible: !it.eligible } : it))
                        }
                      >
                        <Text style={s.eligToggle}>変更</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}

              <View style={s.actions}>
                <Pressable style={s.btnSub} onPress={() => setStage('ready')}>
                  <Text style={s.btnSubText}>再スキャン</Text>
                </Pressable>
                <Pressable style={s.btnPrimary} onPress={handleConfirm}>
                  <Text style={s.btnPrimaryText}>
                    {items.filter((i) => i.selected).length}件を記録する
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── 初期画面 ──
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>レシートをスキャン</Text>
        <Pressable onPress={onClose}><Text style={s.close}>✕</Text></Pressable>
      </View>
      <View style={[s.body, s.center]}>
        <Text style={s.readyIcon}>🧾</Text>
        <Text style={s.readyTitle}>AIがレシートを読み取り、医薬品を自動抽出します</Text>
        <Text style={s.readyNote}>
          食品・日用品は自動的に除外されます。{'\n'}
          複数の医薬品が含まれていても一括登録できます。
        </Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Pressable style={s.btnPrimary} onPress={() => pickImage(true)}>
          <Text style={s.btnPrimaryText}>📷 カメラで撮影</Text>
        </Pressable>
        <Pressable style={[s.btnSub, { marginTop: 12 }]} onPress={() => pickImage(false)}>
          <Text style={s.btnSubText}>🖼 フォトライブラリから選択</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', borderRadius: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 17, fontWeight: '700' },
  close: { fontSize: 20, color: '#718096' },
  body: { flex: 1, padding: 20 },
  scanningText: { fontSize: 16, fontWeight: '700', color: '#1a202c', marginTop: 20 },
  scanningNote: { fontSize: 13, color: '#718096', marginTop: 8 },
  readyIcon: { fontSize: 56, marginBottom: 16 },
  readyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', color: '#1a202c', marginBottom: 10 },
  readyNote: { fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  error: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fc8181', color: '#c53030', padding: 10, borderRadius: 6, marginBottom: 16, fontSize: 13, textAlign: 'center' },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#718096', marginBottom: 4 },
  metaInput: { borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 6, padding: 8, fontSize: 13 },
  itemsHeader: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
  itemRowDimmed: { opacity: 0.45 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1a202c', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 4, marginBottom: 6 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemPrice: { borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, fontSize: 14, minWidth: 70 },
  itemPriceUnit: { fontSize: 13, color: '#718096' },
  eligBadge: { borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  eligOn: { backgroundColor: '#c6f6d5' },
  eligOff: { backgroundColor: '#e2e8f0' },
  eligText: { fontSize: 10, fontWeight: '700' },
  eligToggle: { fontSize: 11, color: '#718096', textDecorationLine: 'underline' },
  noItems: { alignItems: 'center', paddingVertical: 40 },
  noItemsText: { fontSize: 16, fontWeight: '700', color: '#4a5568', marginBottom: 8 },
  noItemsNote: { fontSize: 13, color: '#a0aec0', textAlign: 'center', marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'flex-end' },
  btnPrimary: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 13, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSub: { borderWidth: 1.5, borderColor: GREEN, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center' },
  btnSubText: { color: GREEN, fontWeight: '700', fontSize: 14 },
});
