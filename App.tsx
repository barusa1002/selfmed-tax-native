import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { enableScreens } from 'react-native-screens';

import RecordsScreen from './src/screens/RecordsScreen';
import DrugSearchScreen from './src/screens/DrugSearchScreen';
import TaxReportScreen from './src/screens/TaxReportScreen';

enableScreens();

const Tab = createBottomTabNavigator();
const GREEN = '#1a6b3c';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: GREEN,
            tabBarInactiveTintColor: '#718096',
            tabBarStyle: { borderTopColor: '#e2e8f0' },
            tabBarIcon: ({ color, size }) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                '記録・集計': 'document-text-outline',
                '薬品を探す': 'search-outline',
                '確定申告': 'calculator-outline',
              };
              return <Ionicons name={icons[route.name]} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="記録・集計" component={RecordsScreen} />
          <Tab.Screen name="薬品を探す" component={DrugSearchScreen} />
          <Tab.Screen name="確定申告" component={TaxReportScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
