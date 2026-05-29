# Claude Utilities

Claude (Chrome 版) をより快適に使うための Chrome 拡張機能です。

[English](README.md)

<div align="center">
  <img src="assets/top.jpg" width="55%" style="vertical-align: middle">
  <img src="assets/popup.jpg" width="28.75%" style="vertical-align: middle">
</div>

## 機能

### チャット幅調整

チャット本文エリアの最大幅を自由に変更できます。

- 650〜2000px の範囲で調整可能（デフォルト 1000px）
- 拡張機能アイコンのポップアップからスライダーまたは数値入力で設定

### サイドバー幅調整

Claude のサイドバー幅を自由に変更できます。

- ポップアップのトグルで有効/無効を切り替え
- サイドバー右端のハンドルをドラッグしてリサイズ
- デスクトップ表示（横幅 1024px 以上）のみ有効

### 使用量

チャット入力欄の上に使用量をリアルタイムで表示します。

- 3種類の表示モードを切り替え可能: **グラフ**（入力欄上部にドーナツチャート）/ **バー**（入力欄上部にプログレスバー）/ **最小化**（ツールバーにミニドーナツ3つを埋め込み、ホバーで詳細表示）
- 残り10%未満で赤色に変化
- Claudeの返答完了後に自動更新

### 言語

ポップアップから日本語・英語を切り替えられます。

## 利用方法

1. [Releases](../../releases) から最新の `claude-utilities-vX.X.X.zip` をダウンロード
2. 解凍する
3. Chrome で `chrome://extensions/` を開く
4. 右上の **「デベロッパーモード」** をオンにする
5. 左上の **「パッケージ化されていない拡張機能を読み込む」** をクリック
6. 解凍したフォルダを選択する

<details>
<summary>オプション: git clone から入れる（開発者向け）</summary>

最新の `main` を試したい場合や、ソースを改変して使う場合のみ、こちらでも同じように入れられます。

```bash
git clone https://github.com/otanitakeru/claude-utilities-chrome-extension.git
cd claude-utilities-chrome-extension
```

手順 3〜5 は上と同じです。手順 6 では、clone したリポジトリ内の **`src` フォルダ** を選んでください（Release ZIP を解凍したフォルダと同じ中身です）。

</details>

## スクリーンショット

### Before

<img src="assets/before.jpg" width="900">

### After

<img src="assets/after.jpg" width="900">

## ライセンス

MIT

## クレジット

アイコンのピクセルアートキャラクター（Clawd）は [marciogranzotto/clawd-tank](https://github.com/marciogranzotto/clawd-tank) の SVG アセットを一部改変して使用しています。
原作者: Marcio Granzotto Rodrigues（MIT License）
