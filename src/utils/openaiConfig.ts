import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gemini_api_key';

export async function getOpenAIKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function saveOpenAIKey(key: string): Promise<void> {
  await AsyncStorage.setItem(KEY, key.trim());
}

export async function clearOpenAIKey(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
