import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'health_check_memo';

export interface HealthCheckData {
  year: number;
  items: Record<string, boolean>;
  memo: string;
}

const DEFAULT_ITEMS: Record<string, boolean> = {
  '健康診断（職場・学校）': false,
  '特定健康診査（メタボ検診）': false,
  'がん検診': false,
  '予防接種': false,
  '人間ドック': false,
};

export async function loadHealthCheck(year: number): Promise<HealthCheckData> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY}_${year}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { year, items: { ...DEFAULT_ITEMS }, memo: '' };
}

export async function saveHealthCheck(data: HealthCheckData): Promise<void> {
  await AsyncStorage.setItem(`${KEY}_${data.year}`, JSON.stringify(data));
}

export function isEligibleForTax(data: HealthCheckData): boolean {
  return Object.values(data.items).some(Boolean);
}
