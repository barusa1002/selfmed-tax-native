import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await Notifications.requestPermissionsAsync();
  return (result as any).granted === true;
}

export async function scheduleTaxReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const reminders = [
    {
      month: 1, day: 10,
      title: '確定申告シーズン到来！',
      body: '今年もセルフメディケーション税制の申告準備を始めましょう。MediSelfで記録を確認してください。',
    },
    {
      month: 2, day: 1,
      title: '確定申告まであと約2週間',
      body: 'OTC薬の購入記録はお揃いですか？MediSelfで明細書を確認しましょう。',
    },
    {
      month: 2, day: 16,
      title: '確定申告受付開始！',
      body: '本日から確定申告の受付が始まりました。MediSelfで明細書PDFを出力して申告しましょう。',
    },
    {
      month: 3, day: 10,
      title: '確定申告 締め切りまで5日！',
      body: '3月15日が締め切りです。MediSelfで今すぐ明細書を準備しましょう。',
    },
  ];

  const nextYear = new Date().getFullYear() + 1;

  for (const r of reminders) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          year: nextYear,
          month: r.month,
          day: r.day,
          hour: 9,
          minute: 0,
        },
      });
    } catch {
      // スケジュール失敗は無視
    }
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
