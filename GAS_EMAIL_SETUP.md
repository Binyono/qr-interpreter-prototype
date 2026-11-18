# お土産メール（Google Apps Script）5分セットアップ

QR同時通訳 v10 の「会話を終える → お土産まとめ」で、ゲストが入力したメールアドレスへ要約テキストを自動送信し、あわせてメアドと要約をスプレッドシートに貯めるための手順です。**全部無料**（Googleアカウントだけで動きます）。

```
ゲストのスマホ ──POST──▶ GAS（このスクリプト） ──▶ スプレッドシートに1行追加
                                        └──▶ ゲストのメールへ要約を送信
```

- 送信先URLは**ガイド側の⚙️設定「お土産メール送信URL」**に入れます（ゲストの端末にはガイドから自動で渡ります）。
- URL未設定でもアプリは壊れません。その場合、ゲストの画面ではメール送信の代わりに**テキスト保存（.txt）・コピー**が使えます。

---

## 1. スプレッドシートを作る

1. https://sheets.new を開く（新規スプレッドシート）
2. 名前を「QRお土産ログ」などにする
3. メニューの **拡張機能 → Apps Script** を開く

## 2. コードを貼る

Apps Script の `Code.gs` の中身を全部消して、下を貼り付けて保存（💾）。

```javascript
/**
 * QR同時通訳 v10 — お土産メール
 * 1) スプレッドシートに「受信日時 / メール / 言語 / ROOM / 要約」を1行追加
 * 2) そのメールアドレスへ要約テキストを送信
 * 同じ送信の再送（ブラウザのCORS再送）は id で弾く。
 */

const SHEET_NAME = 'Gifts';   // シート名（無ければ自動作成）
const SECRET = '';            // 任意：URLの末尾に ?key=xxx を付ける場合、同じ文字列を入れる

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // 合言葉（SECRET を設定したときだけチェック）
    if (SECRET && String((e.parameter && e.parameter.key) || '') !== SECRET) {
      return json({ ok: false, error: 'unauthorized' });
    }

    const email = String(body.email || '').trim();
    const lang = String(body.lang || 'en').trim();
    const summary = String(body.summary || '').trim().slice(0, 20000);
    const timestamp = String(body.timestamp || new Date().toISOString());
    const room = String(body.room || '').trim();
    const id = String(body.id || '').trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !summary) {
      return json({ ok: false, error: 'bad request' });
    }

    // 二重送信よけ（同じ id は6時間覚える）
    const cache = CacheService.getScriptCache();
    if (id && cache.get('sent:' + id)) return json({ ok: true, duplicate: true });

    sheet().appendRow([new Date(timestamp), email, lang, room, summary]);
    MailApp.sendEmail({
      to: email,
      subject: subjectFor(lang),
      body: summary,
      name: 'QR同時通訳'
    });

    // ★ 送信できてから「送信済み」を記録する（失敗時に再送できるように）
    if (id) cache.put('sent:' + id, '1', 21600);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  }
}

// ブラウザでURLを開いたときの動作確認用
function doGet() {
  return json({ ok: true, service: 'qr-interpreter-gift' });
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['受信日時', 'メール', '言語', 'ROOM', '要約']);
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function subjectFor(lang) {
  const map = {
    en: 'Your tour summary 🎁',
    'zh-CN': '您的参观小结 🎁',
    'zh-TW': '您的參觀小結 🎁',
    ko: '오늘의 투어 메모 🎁',
    es: 'Resumen del tour 🎁',
    fr: 'Votre souvenir du tour 🎁',
    de: 'Deine Tour-Erinnerung 🎁',
    pt: 'Resumo do tour 🎁',
    it: 'Il tuo ricordo del tour 🎁',
    th: 'สรุปทัวร์วันนี้ 🎁',
    vi: 'Ghi chú tour hôm nay 🎁',
    id: 'Catatan tur hari ini 🎁'
  };
  return map[lang] || 'Your tour summary 🎁';
}
```

## 3. ウェブアプリとして公開する

1. 右上 **デプロイ → 新しいデプロイ**
2. 種類の歯車から **ウェブアプリ** を選ぶ
3. **実行ユーザー：自分** / **アクセスできるユーザー：全員** にする
   - 「全員」にしないと、ゲストのスマホから送れません。
   - 実行ユーザーを「自分」にするので、メールはあなたのGmailから送られます。
4. **デプロイ** → 「アクセスを承認」→ 自分のアカウントを選ぶ →「詳細」→「（安全でないページに）移動」→ 許可
5. 表示された **ウェブアプリのURL**（`https://script.google.com/macros/s/..../exec`）をコピー

> コードを直したときは「デプロイを管理 → 編集（鉛筆）→ バージョン：新バージョン → デプロイ」でURLは変わりません。

## 4. アプリに入れる

1. QR同時通訳を開き、右上 **⚙️ → 「お土産メールの送り先」**
2. コピーしたURLを **お土産メール送信URL** に貼り付け → **保存して閉じる**
3. ガイド画面の下 **🎁 会話を終えて、お土産まとめを送る**（誤タップ防止で2回押し）→ ゲストの画面にポップアップが出ます
4. ゲストがメアドを入れて「メールで受け取る」→ シートに1行増え、メールが届けば成功

**動作確認**：ブラウザでURLを直接開いて `{"ok":true,"service":"qr-interpreter-gift"}` が出れば生きています。

---

## 便利な設定・注意

- **合言葉（推奨）**：URLを知っている人は誰でも送れるので、公開URLを配る場合は `SECRET` に好きな文字列を入れて、アプリの設定URLの末尾に `?key=その文字列` を付けてください（例：`https://script.google.com/macros/s/.../exec?key=abc123`）。アプリはURLをそのまま使うので、これだけで有効になります。
- **送信数の上限**：無料のGmailアカウントは **1日100通**程度、Google Workspaceは1,500通程度です（Googleの上限）。イベントで大量に配る場合は Workspace かメール配信サービスを検討してください。
- **メルマガを続ける場合**：このスクリプトは「1回だけ送る」ものです。今後ニュース等を継続配信するなら、本文に配信停止の連絡先を入れてください（特定電子メール法）。アプリ側には「※ご登録いただいたメールアドレス宛に、今後おすすめのご案内やニュース等をお送りする場合があります。」の同意文を12言語で表示しています。
- **要約が長い**：Gmailの本文上限（約100KB）には余裕がありますが、スクリプト側で20,000文字に切っています。
- **メールが届かない**：迷惑メールフォルダを確認 → シートに行が増えているか確認 → 増えていれば送信は成功しています（受信側の問題）。行が増えていなければ、デプロイの「アクセスできるユーザー：全員」とURL（`/exec`）を確認してください。
- **GAS以外でも可**：送信先はただのURLなので、Cloudflare Workers・Make・Zapier・自前サーバーでも同じJSON（`{email, lang, summary, timestamp, room, id}`）を受け取れば動きます。
