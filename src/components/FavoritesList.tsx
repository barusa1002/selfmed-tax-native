import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import type { DrugEntry } from '../data/drugDatabase';
import { loadFavorites, removeFavorite } from '../utils/favorites';

interface Props {
  onSelect: (drug: DrugEntry) => void;
  refreshKey?: number;
}

const GREEN = '#1a6b3c';

export default function FavoritesList({ onSelect, refreshKey }: Props) {
  const [favorites, setFavorites] = useState<DrugEntry[]>([]);

  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, [refreshKey]);

  if (favorites.length === 0) return null;

  const handleRemove = async (name: string) => {
    const next = await removeFavorite(name);
    setFavorites(next);
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>⭐ お気に入り（ワンタップで追加）</Text>
      <FlatList
        data={favorites}
        keyExtractor={(d) => d.name}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.list}
        renderItem={({ item: drug }) => (
          <View style={s.chip}>
            <Pressable style={s.chipMain} onPress={() => onSelect(drug)}>
              <Text style={s.chipName} numberOfLines={1}>{drug.name}</Text>
              <Text style={s.chipPrice}>¥{drug.price.toLocaleString('ja-JP')}</Text>
            </Pressable>
            <Pressable style={s.chipRemove} onPress={() => handleRemove(drug.name)}>
              <Text style={s.chipRemoveText}>✕</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#9ae6b4' },
  title: { fontSize: 12, fontWeight: '700', color: GREEN, marginBottom: 8 },
  list: { gap: 8 },
  chip: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1.5, borderColor: '#9ae6b4', overflow: 'hidden' },
  chipMain: { paddingHorizontal: 10, paddingVertical: 6, minWidth: 80, maxWidth: 140 },
  chipName: { fontSize: 12, fontWeight: '700', color: '#1a202c' },
  chipPrice: { fontSize: 10, color: '#718096', marginTop: 2 },
  chipRemove: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#9ae6b4' },
  chipRemoveText: { fontSize: 11, color: '#718096' },
});
