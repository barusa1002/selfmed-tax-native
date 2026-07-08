import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';

interface Props {
  date: string;           // YYYY-MM-DD
  onSelect: (d: string) => void;
}

const GREEN = '#1a6b3c';
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DOW = ['日','月','火','水','木','金','土'];

export default function CalendarPicker({ date, onSelect }: Props) {
  const [selY, selM] = date.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selY);
  const [viewMonth, setViewMonth] = useState(selM - 1); // 0-indexed

  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

  // カレンダーグリッド用セル（null = 空白）
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const cellDateStr = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const goToPrev = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const goToNext = () => {
    // 現在の表示月が今月以降なら進めない
    const nextFirst = new Date(viewYear, viewMonth + 1, 1);
    const thisMonthFirst = new Date(today.getFullYear(), today.getMonth(), 1);
    if (nextFirst > thisMonthFirst) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const isNextDisabled =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={s.container}>
      {/* ── 月移動ヘッダー ── */}
      <View style={s.navRow}>
        <Pressable onPress={goToPrev} style={s.navBtn}>
          <Text style={s.navArrow}>‹</Text>
        </Pressable>
        <Text style={s.monthLabel}>{viewYear}年 {MONTH_NAMES[viewMonth]}</Text>
        <Pressable onPress={goToNext} style={s.navBtn} disabled={isNextDisabled}>
          <Text style={[s.navArrow, isNextDisabled && s.navDisabled]}>›</Text>
        </Pressable>
      </View>

      {/* ── 曜日ヘッダー ── */}
      <View style={s.row}>
        {DOW.map((d, i) => (
          <Text
            key={d}
            style={[s.dowLabel, i === 0 && s.sun, i === 6 && s.sat]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* ── 日付グリッド ── */}
      {weeks.map((week, wi) => (
        <View key={wi} style={s.row}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={s.cell} />;
            const ds = cellDateStr(day);
            const isSelected = ds === date;
            const isFuture = ds > todayStr;
            const isToday = ds === todayStr;

            return (
              <Pressable
                key={di}
                style={[s.cell, isSelected && s.cellSel, isFuture && s.cellFuture]}
                onPress={() => { if (!isFuture) onSelect(ds); }}
                disabled={isFuture}
              >
                <Text style={[
                  s.dayText,
                  di === 0 && s.sun,
                  di === 6 && s.sat,
                  isSelected && s.daySelText,
                  isToday && !isSelected && s.todayText,
                  isFuture && s.futureText,
                ]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL = 42;

const s = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingBottom: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 24, color: GREEN, fontWeight: '700', lineHeight: 28 },
  navDisabled: { color: '#cbd5e0' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1a202c' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 2 },
  dowLabel: { width: CELL, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#718096', paddingVertical: 4 },
  sun: { color: '#e53e3e' },
  sat: { color: '#2b6cb0' },
  cell: { width: CELL, height: CELL, justifyContent: 'center', alignItems: 'center', borderRadius: CELL / 2 },
  cellSel: { backgroundColor: GREEN },
  cellFuture: { opacity: 0.3 },
  dayText: { fontSize: 15, color: '#1a202c', fontWeight: '500' },
  daySelText: { color: '#fff', fontWeight: '700' },
  todayText: { color: GREEN, fontWeight: '700' },
  futureText: { color: '#a0aec0' },
});
