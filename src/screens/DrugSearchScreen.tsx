import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DRUG_DATABASE, SYMPTOM_CATEGORIES, DRUG_CATEGORIES, searchBySymptom, searchByCategory } from '../data/drugDatabase';
import type { DrugEntry } from '../data/drugDatabase';
import { addFavorite, removeFavorite, isFavorite } from '../utils/favorites';

type Mode = 'symptom' | 'category' | 'keyword';
const GREEN = '#1a6b3c';

export default function DrugSearchScreen() {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<Mode>('symptom');
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());
  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const getResults = (): DrugEntry[] => {
    let r: DrugEntry[] = [];
    if (mode === 'symptom' && selectedSymptom) r = searchBySymptom(selectedSymptom);
    else if (mode === 'category' && selectedCategory) r = searchByCategory(selectedCategory);
    else if (mode === 'keyword' && keyword.trim()) {
      const q = keyword.toLowerCase();
      r = DRUG_DATABASE.filter((d) => d.name.toLowerCase().includes(q) || d.maker.toLowerCase().includes(q) || d.symptoms.some((s) => s.includes(q)) || (d.activeIngredient ?? '').toLowerCase().includes(q));
    }
    return eligibleOnly ? r.filter((d) => d.eligible) : r;
  };

  const results = getResults();
  const fmt = (n: number) => n.toLocaleString('ja-JP');

  const renderDrugCard = ({ item: drug }: { item: DrugEntry }) => (
    <View style={[s.card, drug.eligible && s.cardEligible]}>
      <Pressable style={s.cardHeader} onPress={() => setExpanded(expanded === drug.name ? null : drug.name)}>
        <View style={s.cardTitle}>
          <View style={[s.badge, drug.eligible ? s.badgeGreen : s.badgeGray]}>
            <Text style={[s.badgeText, !drug.eligible && s.badgeTextGray]}>{drug.eligible ? '税制対象' : '対象外'}</Text>
          </View>
          <Text style={s.cardName}>{drug.name}</Text>
        </View>
        <View style={s.cardMeta}>
          <Text style={s.cardCategory}>{drug.category}</Text>
          <Text style={s.cardPrice}>¥{fmt(drug.price)}</Text>
          <Text style={s.expandIcon}>{expanded === drug.name ? '▲' : '▼'}</Text>
        </View>
      </Pressable>
      {expanded === drug.name && (
        <View style={s.cardDetail}>
          <Text style={s.detailMaker}>{drug.maker}</Text>
          {drug.activeIngredient ? <Text style={s.detailIngredient}>主成分: {drug.activeIngredient}</Text> : null}
          <View style={s.symptomsRow}>
            {drug.symptoms.map((sym) => (
              <View key={sym} style={s.symTag}><Text style={s.symTagText}>{sym}</Text></View>
            ))}
          </View>
          <View style={s.detailActions}>
            <Pressable
              style={s.addBtn}
              onPress={() => navigation.navigate('記録・集計', { prefillDrug: drug })}
            >
              <Text style={s.addBtnText}>＋ 購入記録に追加</Text>
            </Pressable>
            <Pressable
              style={[s.favBtn, favoriteNames.has(drug.name) && s.favBtnActive]}
              onPress={async () => {
                if (favoriteNames.has(drug.name)) {
                  await removeFavorite(drug.name);
                  setFavoriteNames(prev => { const ns = new Set(prev); ns.delete(drug.name); return ns; });
                } else {
                  await addFavorite(drug);
                  setFavoriteNames(prev => new Set([...prev, drug.name]));
                  Alert.alert('登録完了', `「${drug.name}」をお気に入りに追加しました`);
                }
              }}
            >
              <Text style={s.favBtnText}>{favoriteNames.has(drug.name) ? '⭐ 解除' : '☆ お気に入り'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>薬品を探す</Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(d) => d.name}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* モード切替 */}
            <View style={s.modeTabs}>
              {(['symptom', 'category', 'keyword'] as Mode[]).map((m) => (
                <Pressable key={m} style={[s.modeTab, mode === m && s.modeTabActive]}
                  onPress={() => { setMode(m); setSelectedSymptom(''); setSelectedCategory(''); setKeyword(''); }}>
                  <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
                    {m === 'symptom' ? '症状から' : m === 'category' ? '薬効から' : 'キーワード'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* 症状チップ */}
            {mode === 'symptom' && (
              <ScrollView>
                {Object.entries(SYMPTOM_CATEGORIES).map(([group, syms]) => (
                  <View key={group} style={s.symptomGroup}>
                    <Text style={s.groupLabel}>{group}</Text>
                    <View style={s.chips}>
                      {syms.map((sym) => (
                        <Pressable key={sym} style={[s.chip, selectedSymptom === sym && s.chipActive]}
                          onPress={() => setSelectedSymptom(selectedSymptom === sym ? '' : sym)}>
                          <Text style={[s.chipText, selectedSymptom === sym && s.chipTextActive]}>{sym}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* 薬効カテゴリ */}
            {mode === 'category' && (
              <View style={s.chips}>
                {DRUG_CATEGORIES.map((c) => (
                  <Pressable key={c} style={[s.chip, selectedCategory === c && s.chipActive]}
                    onPress={() => setSelectedCategory(selectedCategory === c ? '' : c)}>
                    <Text style={[s.chipText, selectedCategory === c && s.chipTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* キーワード */}
            {mode === 'keyword' && (
              <TextInput style={s.keywordInput} value={keyword} onChangeText={setKeyword}
                placeholder="商品名・成分名・症状で検索" autoFocus />
            )}

            {/* フィルター */}
            <Pressable style={s.filterRow} onPress={() => setEligibleOnly(!eligibleOnly)}>
              <View style={[s.checkbox, eligibleOnly && s.checkboxOn]}>
                {eligibleOnly && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.filterLabel}>セルフメディケーション税制対象のみ</Text>
              {results.length > 0 && <Text style={s.resultCount}>{results.length}件</Text>}
            </Pressable>

            {results.length === 0 && (selectedSymptom || selectedCategory || keyword) && (
              <Text style={s.noResults}>該当する医薬品が見つかりませんでした</Text>
            )}
          </>
        }
        renderItem={renderDrugCard}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  listContent: { padding: 12, gap: 0 },
  modeTabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  modeTab: { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', paddingVertical: 6, alignItems: 'center', backgroundColor: '#f7fafc' },
  modeTabActive: { backgroundColor: GREEN, borderColor: GREEN },
  modeTabText: { fontSize: 12, fontWeight: '600', color: '#4a5568' },
  modeTabTextActive: { color: '#fff' },
  symptomGroup: { marginBottom: 10 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: '#718096', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderRadius: 20, borderWidth: 1.5, borderColor: '#cbd5e0', paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#f7fafc' },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 12, color: '#4a5568', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  keywordInput: { borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff', marginBottom: 10 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 8 },
  checkbox: { width: 18, height: 18, borderWidth: 2, borderColor: '#cbd5e0', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: GREEN, borderColor: GREEN },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  filterLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  resultCount: { fontSize: 12, color: '#718096' },
  noResults: { textAlign: 'center', padding: 24, color: '#a0aec0', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardEligible: { borderColor: '#9ae6b4' },
  cardHeader: { padding: 12 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: { borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGreen: { backgroundColor: '#c6f6d5' },
  badgeGray: { backgroundColor: '#e2e8f0' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#276749' },
  badgeTextGray: { color: '#718096' },
  cardName: { fontSize: 14, fontWeight: '700', flex: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardCategory: { fontSize: 11, color: '#718096', flex: 1 },
  cardPrice: { fontSize: 13, fontWeight: '600' },
  expandIcon: { fontSize: 10, color: '#a0aec0' },
  cardDetail: { backgroundColor: '#f7fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', padding: 12, gap: 4 },
  detailMaker: { fontSize: 12, color: '#718096' },
  detailIngredient: { fontSize: 12, color: '#4a5568' },
  symptomsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  symTag: { backgroundColor: '#ebf8ff', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  symTagText: { fontSize: 11, color: '#2b6cb0' },
  detailActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addBtn: { flex: 1, backgroundColor: GREEN, borderRadius: 8, padding: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  favBtn: { borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 100 },
  favBtnActive: { borderColor: '#f6ad55', backgroundColor: '#fffaf0' },
  favBtnText: { fontSize: 12, fontWeight: '700', color: '#718096' },
});
