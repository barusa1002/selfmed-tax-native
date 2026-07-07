import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { PurchaseRecord } from '../types';

interface Props {
  records: PurchaseRecord[];
  year: number;
}

const GREEN  = '#1a6b3c';
const ORANGE = '#c05621';
const GRAY   = '#e2e8f0';

function calcMonthlyTotals(records: PurchaseRecord[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    eligible: 0,
    total: 0,
  }));
  records
    .filter((r) => r.date.startsWith(String(year)))
    .forEach((r) => {
      const m = parseInt(r.date.split('-')[1], 10) - 1;
      months[m].total += r.amount;
      if (r.eligible) months[m].eligible += r.amount;
    });
  return months;
}

export default function MonthlyChart({ records, year }: Props) {
  const months = calcMonthlyTotals(records, year);
  const maxVal = Math.max(...months.map((m) => m.total), 1);
  const CHART_H = 100;
  const fmt = (n: number) =>
    n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString('ja-JP')}`;

  const hasData = months.some((m) => m.total > 0);

  return (
    <View style={s.container}>
      <Text style={s.title}>月別購入金額</Text>
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: GREEN }]} />
          <Text style={s.legendText}>税制対象</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: ORANGE }]} />
          <Text style={s.legendText}>対象外含む合計</Text>
        </View>
      </View>

      {!hasData ? (
        <Text style={s.empty}>この年の購入記録がありません</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chart}>
            {months.map((m) => {
              const barH = (m.total / maxVal) * CHART_H;
              const eligH = (m.eligible / maxVal) * CHART_H;
              return (
                <View key={m.month} style={s.col}>
                  <View style={[s.barBg, { height: CHART_H }]}>
                    {m.total > 0 && (
                      <View style={[s.barTotal, { height: barH, backgroundColor: ORANGE }]} />
                    )}
                    {m.eligible > 0 && (
                      <View style={[s.barEligible, { height: eligH, backgroundColor: GREEN }]} />
                    )}
                  </View>
                  {m.total > 0 && (
                    <Text style={s.barLabel}>{fmt(m.total)}</Text>
                  )}
                  <Text style={s.monthLabel}>{m.month}月</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: '#718096' },
  empty: { textAlign: 'center', color: '#a0aec0', paddingVertical: 20, fontSize: 13 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingBottom: 4 },
  col: { alignItems: 'center', width: 42 },
  barBg: { width: 28, justifyContent: 'flex-end', backgroundColor: '#f0f4f8', borderRadius: 4, overflow: 'hidden' },
  barTotal: { width: '100%', borderRadius: 4 },
  barEligible: { position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: 4 },
  barLabel: { fontSize: 8, color: '#718096', textAlign: 'center', marginTop: 2, width: 42 },
  monthLabel: { fontSize: 10, color: '#4a5568', marginTop: 2 },
});
