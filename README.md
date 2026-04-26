# Resonance Map

思考の共鳴装置。AIが「異物」を混入させることで新しい発見を生むマインドマップ。

🌐 **デモ**: https://yutate.github.io/resonance-map/

## 2つの動作モード

| モード | 説明 |
|--------|------|
| **Stoic Mode** | APIキー不要。Business/Philosophyそれぞれ20問のローカルプロンプトプールからランダム返却 |
| **AI Mode** | Anthropic APIキーを設定するとClaude Sonnetがリアルタイム生成 |

画面左上の **STOIC / AI ON** バッジをクリックしてAPIキーを設定できます。

## セットアップ（ローカル開発）

```bash
npm install
npm run dev
# → http://localhost:5173
```

APIキーなしでも動作します（Stoic Mode）。

AIを有効にする場合は画面上のバッジからランタイムで設定、またはenv変数で指定：
```bash
cp .env.local.example .env.local
# VITE_ANTHROPIC_API_KEY=sk-ant-... を設定
```

## GitHub Pages へのデプロイ

1. このリポジトリを GitHub に push
2. Settings → Pages → Source: **GitHub Actions** に設定
3. `main` ブランチに push するたびに自動デプロイ

> **Note**: `vite.config.js` の `base` をリポジトリ名に合わせてください
> 例: リポジトリが `resonance-map` なら `base: '/resonance-map/'`

## 操作

| 操作 | アクション |
|------|-----------|
| ダブルクリック | ノードテキスト編集 |
| ドラッグ（ノード） | ノード移動 |
| ドラッグ（背景） | キャンバスパン |
| スクロール | ズーム |
| ⚡ PROVOKE | 問いを生成（Stoic or AI） |
| ADD | 新しいノード追加 |
| BUSINESS ⇄ PHILOSOPHY | 思考OSを切替 |
| MANUAL / AUTO | 配置モード切替 |
