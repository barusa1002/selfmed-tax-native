import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'user_barcode_map';

// JAN → 商品名 のマッピング（ユーザーが実物スキャンで登録）
export type BarcodeMap = Record<string, string>;

export async function loadBarcodeMap(): Promise<BarcodeMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function registerBarcode(jan: string, productName: string): Promise<void> {
  const map = await loadBarcodeMap();
  map[jan] = productName;
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function deleteBarcode(jan: string): Promise<void> {
  const map = await loadBarcodeMap();
  delete map[jan];
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function lookupBarcode(jan: string): Promise<string | undefined> {
  const map = await loadBarcodeMap();
  return map[jan];
}
