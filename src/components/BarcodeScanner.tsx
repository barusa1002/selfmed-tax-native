import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  TextInput, FlatList, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { searchByName, DRUG_DATABASE } from '../data/drugDatabase';
import type { DrugEntry } from '../data/drugDatabase';
import { lookupBarcode, registerBarcode } from '../utils/userBarcodes';
import { lookupJanOnYahoo } from '../utils/yahooApi';

interface Props {
  onDetected: (drug: DrugEntry, jan: string) => void;
  onClose: () => void;
}

type Stage = 'scanning' | 'looking_up' | 'registering';
const GREEN = '#1a6b3c';

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>('scanning');
  const [scannedJan, setScannedJan] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DrugEntry[]>([]);
  const [yahooName, setYahooName] = useState('');
  const scanningRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScannedJan(data);

    // ユーザーが以前登録したJANコードを確認
    const savedName = await lookupBarcode(data);
    if (savedName) {
      const drug = DRUG_DATABASE.find((d) => d.name === savedName);
      onDetected(
        drug ?? { name: savedName, maker: '', category: '', eligible: true, price: 0, symptoms: [] },
        data
      );
      return;
    }

    // 未登録 → Yahoo!APIで商品名を取得
    setStage('looking_up');
    const result = await lookupJanOnYahoo(data);
    if (result?.name) {
      setYahooName(result.name);
      setQuery(result.name);
      setSuggestions(searchByName(result.name).slice(0, 6));
    }
    setStage('registering');
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setSuggestions(text.length >= 1 ? searchByName(text).slice(0, 6) : []);
  };

  const handleSelectDrug = async (drug: DrugEntry) => {
    await registerBarcode(scannedJan, drug.name);
    Alert.alert(
      '登録完了',
      `「${drug.name}」のバーコードを登録しました。\n次回から自動で認識されます。`,
      [{ text: 'OK', onPress: () => onDetected(drug, scannedJan) }]
    );
  };

  const handleManualName = async () => {
    const name = query.trim();
    if (!name) return;
    const found = DRUG_DATABASE.find((d) => d.name === name);
    await registerBarcode(scannedJan, name);
    onDetected(
      found ?? { name, maker: '', category: '', eligible: true, price: 0, symptoms: [] },
      scannedJan
    );
  };

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} />;

  // ── Yahoo!API検索中 ──
  if (stage === 'looking_up') {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={s.lookupText}>Yahoo!ショッピングで商品情報を検索中...</Text>
        <Text style={s.lookupJan}>JAN: {scannedJan}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permText}>カメラへのアクセスが必要です</Text>
        <Pressable style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>許可する</Text>
        </Pressable>
        <Pressable style={s.btnClose} onPress={onClose}>
          <Text style={s.btnCloseText}>閉じる</Text>
        </Pressable>
      </View>
    );
  }

  // ── 登録フロー ──
  if (stage === 'registering') {
    return (
      <View style={s.container}>
        <View style={s.regHeader}>
          <Text style={s.regTitle}>この薬を登録する</Text>
          <Text style={s.regJan}>JAN: {scannedJan}</Text>
          {yahooName ? (
            <View style={s.yahooResult}>
              <Text style={s.yahooLabel}>Yahoo!ショッピングで見つかった商品名：</Text>
              <Text style={s.yahooName}>{yahooName}</Text>
              <Text style={s.yahooHint}>下の候補から選択するか、商品名を修正してください</Text>
            </View>
          ) : (
            <Text style={s.regHint}>
              薬品名を入力または候補から選択してください。{'\n'}
              次回から自動で認識されます。
            </Text>
          )}
        </View>

        <TextInput
          style={s.regInput}
          placeholder="薬品名を入力（例: ロキソニンS）"
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
        />

        {suggestions.length > 0 && (
          <FlatList
            data={suggestions}
            keyExtractor={(d) => d.name}
            style={s.sugList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: d }) => (
              <Pressable style={s.sugItem} onPress={() => handleSelectDrug(d)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sugName}>{d.name}</Text>
                  <Text style={s.sugMaker}>{d.maker}{d.activeIngredient ? ` / ${d.activeIngredient}` : ''}</Text>
                </View>
                <View style={[s.sugBadge, d.eligible ? s.badgeGreen : s.badgeGray]}>
                  <Text style={s.sugBadgeText}>{d.eligible ? '税制対象' : '対象外'}</Text>
                </View>
              </Pressable>
            )}
          />
        )}

        <View style={s.regActions}>
          {query.trim().length > 0 && (
            <Pressable style={s.btn} onPress={handleManualName}>
              <Text style={s.btnText}>「{query.trim()}」として登録</Text>
            </Pressable>
          )}
          <Pressable style={s.btnSub} onPress={() => {
            scanningRef.current = false;
            setStage('scanning');
            setQuery('');
            setYahooName('');
            setSuggestions([]);
          }}>
            <Text style={s.btnSubText}>再スキャン</Text>
          </Pressable>
          <Pressable style={s.btnClose} onPress={onClose}>
            <Text style={s.btnCloseText}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── スキャン画面 ──
  return (
    <View style={s.container}>
      <CameraView
        style={s.camera}
        facing="back"
        onBarcodeScanned={handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      >
        <View style={s.overlay}>
          <View style={s.frame} />
          <Text style={s.hint}>薬のパッケージのバーコードに合わせてください</Text>
          <Text style={s.hintSub}>初回スキャン時は薬品名の登録が必要です</Text>
        </View>
      </CameraView>
      <View style={s.bottom}>
        <Pressable style={s.btnClose} onPress={onClose}>
          <Text style={s.btnCloseText}>閉じる</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 120, borderWidth: 3, borderColor: '#38a169', borderRadius: 8 },
  hint: { color: '#fff', marginTop: 16, fontSize: 13, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, textAlign: 'center', paddingHorizontal: 20 },
  hintSub: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 11, textAlign: 'center' },
  bottom: { backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#fff' },
  permText: { fontSize: 15, color: '#4a5568', textAlign: 'center' },

  lookupText: { fontSize: 15, color: '#4a5568', marginTop: 12 },
  lookupJan: { fontSize: 12, color: '#a0aec0', fontFamily: 'monospace' },
  yahooResult: { backgroundColor: '#ebf8ff', borderRadius: 8, padding: 10, marginTop: 4 },
  yahooLabel: { fontSize: 11, color: '#2b6cb0', marginBottom: 2 },
  yahooName: { fontSize: 15, fontWeight: '700', color: '#1a365d', marginBottom: 4 },
  yahooHint: { fontSize: 11, color: '#4a5568' },
  regHeader: { padding: 20, backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  regTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  regJan: { fontSize: 11, color: '#718096', fontFamily: 'monospace', marginBottom: 8 },
  regHint: { fontSize: 13, color: '#4a5568', lineHeight: 20 },

  regInput: { margin: 16, borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 8, padding: 12, fontSize: 15 },
  sugList: { flex: 1, marginHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
  sugItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f0f4f8', gap: 8 },
  sugName: { fontSize: 14, fontWeight: '600' },
  sugMaker: { fontSize: 11, color: '#718096', marginTop: 1 },
  sugBadge: { borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGreen: { backgroundColor: '#c6f6d5' },
  badgeGray: { backgroundColor: '#e2e8f0' },
  sugBadgeText: { fontSize: 10, fontWeight: '700' },
  regActions: { padding: 16, gap: 8 },

  btn: { backgroundColor: GREEN, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSub: { borderWidth: 1.5, borderColor: GREEN, borderRadius: 8, padding: 12, alignItems: 'center' },
  btnSubText: { color: GREEN, fontWeight: '700', fontSize: 14 },
  btnClose: { padding: 12, alignItems: 'center' },
  btnCloseText: { color: '#718096', fontSize: 14 },
});
