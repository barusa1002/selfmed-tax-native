import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { lookupByJan } from '../data/drugDatabase';
import type { DrugEntry } from '../data/drugDatabase';

interface Props {
  onDetected: (drug: DrugEntry, jan: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarcode = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const drug = lookupByJan(data);
    onDetected(
      drug ?? { jan: data, name: '', maker: '', category: '', eligible: true, price: 0, symptoms: [] },
      data
    );
  };

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} />;

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

  return (
    <View style={s.container}>
      <CameraView
        style={s.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      >
        <View style={s.overlay}>
          <View style={s.frame} />
          <Text style={s.hint}>薬のパッケージのバーコードに合わせてください</Text>
        </View>
      </CameraView>
      <View style={s.bottom}>
        {scanned && (
          <Pressable style={s.btn} onPress={() => setScanned(false)}>
            <Text style={s.btnText}>再スキャン</Text>
          </Pressable>
        )}
        <Pressable style={s.btnClose} onPress={onClose}>
          <Text style={s.btnCloseText}>閉じる</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 120, borderWidth: 3, borderColor: '#38a169', borderRadius: 8, backgroundColor: 'transparent' },
  hint: { color: '#fff', marginTop: 16, fontSize: 13, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, textAlign: 'center', paddingHorizontal: 20 },
  bottom: { backgroundColor: '#fff', padding: 16, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  permText: { fontSize: 15, color: '#4a5568', textAlign: 'center' },
  btn: { backgroundColor: '#1a6b3c', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnClose: { borderWidth: 1.5, borderColor: '#1a6b3c', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  btnCloseText: { color: '#1a6b3c', fontWeight: '700', fontSize: 15 },
});
