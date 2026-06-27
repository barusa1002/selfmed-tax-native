// Yahoo!ショッピング商品検索API設定ファイル
// このファイルをコピーして yahooApi.ts にリネームし、Client IDを入力してください
// 取得先: https://e.developer.yahoo.co.jp/

const YAHOO_CLIENT_ID = 'ここにYahoo!ショッピングのClient IDを入力';

// 以下は yahooApi.ts と同じ内容をコピーしてください
export async function lookupJanOnYahoo(_jan: string): Promise<{ name: string; price: number } | null> {
  console.warn('yahooApi.ts が設定されていません。yahooApi.example.ts を参照してください。');
  return null;
}
