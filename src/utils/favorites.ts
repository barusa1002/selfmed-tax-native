import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DrugEntry } from '../data/drugDatabase';

const KEY = 'favorite_drugs';

export async function loadFavorites(): Promise<DrugEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addFavorite(drug: DrugEntry): Promise<DrugEntry[]> {
  const current = await loadFavorites();
  if (current.some((d) => d.name === drug.name)) return current;
  const next = [...current, drug];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeFavorite(name: string): Promise<DrugEntry[]> {
  const current = await loadFavorites();
  const next = current.filter((d) => d.name !== name);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function isFavorite(name: string): Promise<boolean> {
  const current = await loadFavorites();
  return current.some((d) => d.name === name);
}
