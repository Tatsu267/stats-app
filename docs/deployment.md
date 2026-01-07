# デプロイガイド

このアプリをインターネット上に公開（デプロイ）するための手順を詳しく説明します。

## 1. ビルド手順（準備）

デプロイする前に、アプリを最適化された「ビルド済みファイル」に変換する必要があります。

1.  プロジェクトのルートディレクトリ（`stats-app`）でターミナルを開きます。
2.  以下のコマンドを実行します：
    ```bash
    npm run build
    ```
3.  実行後、プロジェクト内に `dist` というフォルダが作成されます。このフォルダの中身が公開に必要な全ファイルです。

---

## 2. デプロイ方法

いくつかの推奨されるプラットフォームを紹介します。

### A. Vercel（最も簡単）

VercelはViteアプリ（このアプリ）と非常に相性が良く、無料で簡単にデプロイできます。

1.  [Vercel](https://vercel.com/) にサインアップ（GitHubアカウントを使うとスムーズです）。
2.  **Add New** > **Project** をクリック。
3.  このアプリのソースコードが GitHub にある場合は、リポジトリを **Import** します。
4.  設定画面で以下の項目を確認します：
    - **Framework Preset**: `Vite`
    - **Build Command**: `npm run build`
    - **Output Directory**: `dist`
5.  **Deploy** をクリックして完了です。

### B. Netlify

Vercelと同様に使いやすく、無料枠が充実しています。

1.  [Netlify](https://www.netlify.com/) にサインアップ。
2.  **Add new site** > **Import an existing project** を選択。
3.  GitHub リポジトリを連携。
4.  ビルド設定（Vercelと同様）を確認して **Deploy**。

### C. GitHub Pages

GitHubのリポジトリ設定から無料で公開できます。

1.  `gh-pages` パッケージをインストール： `npm install gh-pages --save-dev`
2.  `package.json` に `"homepage": "https://<your-username>.github.io/stats-app"` を追加。
3.  `package.json` の `scripts` に以下を追加：
    - `"predeploy": "npm run build"`
    - `"deploy": "gh-pages -d dist"`
4.  `npm run deploy` を実行。

---

## 3. 重要：APIキーの設定

アプリをデプロイした後、Gemini APIキーを正しく動作させる必要があります。

- **現在の仕様**: このアプリはブラウザ内の IndexedDB（開発者設定画面）にAPIキーを保存して動作します。
- **デプロイ後の注意**: デプロイしたURLにアクセスし、**設定画面から再度APIキーを入力**して保存してください。

> [!WARNING]
> ソースコード（`ai.js` など）に直接APIキーを書き込んで GitHub にプッシュしないように注意してください。APIキーが全世界に漏洩するリスクがあります。

---

## 4. モデルの自動切り替えについて

現在、以下の優先順位でモデルを試行するように設定されています：
1. `gemini-3-flash`
2. `gemini-2.5-flash`
3. `gemini-2.0-flash`

各モデルにクォータ（利用制限）がある場合や、将来的にリリースされた場合に自動で最適なモデルが選択されるようになります。現在は `gemini-2.0-flash` が主流ですが、次世代モデルが登場した際にそのまま利用可能です。
