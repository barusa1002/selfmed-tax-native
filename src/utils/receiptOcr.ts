import { GEMINI_API_KEY } from '../config/gemini';

export interface OcrItem {
  name: string;
  price: number;
}

export interface OcrResult {
  date: string;
  store: string;
  items: OcrItem[];
}

const PROMPT = `このドラッグストアのレシートから市販薬（OTC薬・医薬品）の購入情報を抽出してください。
食品・日用品・化粧品など医薬品以外の商品は除いてください。
以下のJSON形式のみで返してください（説明文は不要）：
{
  "date": "YYYY-MM-DD（レシートの日付。不明なら今日の日付）",
  "store": "店舗名（レシートに記載の場合、なければ空文字）",
  "items": [
    {"name": "商品名（医薬品名）", "price": 金額の整数},
    ...
  ]
}
医薬品が見つからない場合は items を空配列にしてください。`;

export async function analyzeReceipt(base64Image: string): Promise<OcrResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: PROMPT },
        ],
      }],
      generationConfig: { maxOutputTokens: 600, temperature: 0 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GEMINI_ERROR: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('PARSE_ERROR');

  return JSON.parse(match[0]) as OcrResult;
}
