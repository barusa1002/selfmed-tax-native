import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { TaxSummary } from '../types';
import { DEDUCTION_THRESHOLD, DEDUCTION_MAX } from '../types';

interface Props {
  summary: TaxSummary;
  year: number;
  onYearChange: (year: number) => void;
}

const COLORS = { green: '#1a6b3c', lightGreen: '#f0fdf4', gray: '#718096', orange: '#c05621' };
const fmt = (n: number) => n.toLocaleString('ja-JP');

export default function Dashboard({ summary, year, onYearChange }: Props) {
  const { totalAmount, eligibleAmount, deductibleAmount, taxSavingEstimate, isEligible } = summary;
  const progressPct = Math.min((eligibleAmount / DEDUCTION_THRESHOLD) * 100, 100);
  const currentYear = new Date().getFullYear();

  return (
    <View style={s.container}>
      {/* 年度切替 */}
      <View style={s.yearRow}>
        <Text style={s.sectionTitle}>年間集計</Text>
        <View style={s.yearTabs}>
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <Pressable key={y} style={[s.yearTab, year === y && s.yearTabActive]} onPress={() => onYearChange(y)}>
              <Text style={[s.yearTabText, year === y && s.yearTabTextActive]}>{y}年</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* カード */}
      <View style={s.cards}>
        <View style={s.card}>
          <Text style={s.cardLabel}>購入合計（全品）</Text>
          <Text style={s.cardValue}>¥{fmt(totalAmount)}</Text>
        </View>
        <View style={[s.card, isEligible && s.cardEligible]}>
          <Text style={s.cardLabel}>控除対象額</Text>
          <Text style={s.cardValue}>¥{fmt(deductibleAmount)}</Text>
          {isEligible && <View style={s.badge}><Text style={s.badgeText}>適用可能</Text></View>}
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>節税概算(20%)</Text>
          <Text style={s.cardValue}>¥{fmt(taxSavingEstimate)}</Text>
        </View>
      </View>

      {/* プログレスバー */}
      <View style={s.progressSection}>
        <View style={s.progressLabels}>
          <Text style={s.progressLabel}>対象薬品合計: ¥{fmt(eligibleAmount)}</Text>
          <Text style={s.progressLabel}>目標 ¥{fmt(DEDUCTION_THRESHOLD)}</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <View style={s.progressInfo}>
          <Text style={s.progressNote}>※ 対象外の薬品は含まれません</Text>
          {!isEligible && (
            <Text style={s.progressRemaining}>あと¥{fmt(DEDUCTION_THRESHOLD - eligibleAmount)}で控除対象</Text>
          )}
          {isEligible && (
            <Text style={s.progressOk}>上限まで¥{fmt(DEDUCTION_MAX - deductibleAmount)}余裕あり</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  yearTabs: { flexDirection: 'row', gap: 4 },
  yearTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e0' },
  yearTabActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  yearTabText: { fontSize: 12, color: '#4a5568' },
  yearTabTextActive: { color: '#fff', fontWeight: '700' },
  cards: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  card: { flex: 1, backgroundColor: '#f7fafc', borderRadius: 8, padding: 10 },
  cardEligible: { backgroundColor: COLORS.lightGreen, borderWidth: 1, borderColor: '#68d391' },
  cardLabel: { fontSize: 10, color: COLORS.gray, marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: '700' },
  badge: { backgroundColor: COLORS.green, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  progressSection: {},
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 11, color: COLORS.gray },
  progressBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 99 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  progressNote: { fontSize: 10, color: '#a0aec0' },
  progressRemaining: { fontSize: 11, color: COLORS.orange, fontWeight: '600' },
  progressOk: { fontSize: 11, color: COLORS.green, fontWeight: '600' },
});
