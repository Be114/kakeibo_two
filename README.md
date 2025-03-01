# カップル家計簿アプリ (kakeibo_two)

シンプルなカップル向け家計簿アプリです。共同費用と個人費用、固定費と変動費を明確に区分し、日々の支出も記録できます。

## 特徴

- **4つのタブ**：「自分」「パートナー」「共同」「日別」の4タブで支出を管理
- **費用の区分**：固定費/変動費、共同/個人を明確に区分
- **簡単入力**：テンプレートから素早く入力できる
- **シンプル設計**：余計な機能を省いたミニマルな設計

## インストール手順

### 開発環境の準備

```bash
# リポジトリをクローン
git clone https://github.com/[あなたのユーザー名]/kakeibo_two.git
cd kakeibo_two

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm start
```

### Firebase の設定（オプション）

1. [Firebase Console](https://console.firebase.google.com/) で新しいプロジェクトを作成
2. Webアプリを追加して設定を取得
3. `src/firebase.js` ファイルに設定情報を入力
4. Firestore データベースを作成

## 使い方

### 基本操作

- 上部のタブで「自分」「パートナー」「共同」「日別」を切り替え
- 右下の「+」ボタンで新しい支出を追加
- 金額の入力欄をクリックして直接編集

### 支出の追加方法

1. テンプレートから追加：
   - 「+」ボタン → テンプレート選択 → 金額入力 → 保存

2. 詳細入力：
   - 「+」ボタン → 「詳細入力に切り替え」 → 情報入力 → 保存

## デプロイ

### Vercel でのデプロイ（推奨）

1. [Vercel](https://vercel.com/) にアカウント作成
2. GitHubリポジトリと連携
3. デプロイボタンをクリック

## カスタマイズ

### テンプレートの追加

`App.js` 内の `templates` 配列を編集：

```javascript
const templates = [
  // 既存のテンプレート
  // 追加例
  { id: 'temp7', name: 'ランチ', category: 'dining', icon: '🍱', split: false, owner: 'me', type: 'variable' },
];
```

### カテゴリの追加

`ExpenseInputModal` コンポーネント内の `categories` オブジェクトを編集：

```javascript
const categories = {
  // 既存のカテゴリ
  // 追加例
  health: { name: '健康・医療', icon: '💊' },
};
```

## ライセンス

MIT

## 作者

あなたの名前
