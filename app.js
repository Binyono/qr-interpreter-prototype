/* =========================================================
   QR Live Interpreter — プロトタイプ
   受信機不要のリアルタイムAI同時通訳
   Guide（配信）と Participant（受信）を1枚の静的ページで動かす。
   バックエンドなし / PeerJS(WebRTC) P2P / 翻訳はブラウザから直接APIへ
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     0. 基本定義
  --------------------------------------------------------- */
  const LS_KEY = 'qri.settings.v1';

  const LANGS = [
    { code:'en',    bcp47:'en-US', flag:'🇺🇸', ja:'英語',            native:'English' },
    { code:'zh-CN', bcp47:'zh-CN', flag:'🇨🇳', ja:'中国語（簡体）',  native:'简体中文' },
    { code:'zh-TW', bcp47:'zh-TW', flag:'🇹🇼', ja:'中国語（繁体）',  native:'繁體中文' },
    { code:'ko',    bcp47:'ko-KR', flag:'🇰🇷', ja:'韓国語',          native:'한국어' },
    { code:'es',    bcp47:'es-ES', flag:'🇪🇸', ja:'スペイン語',      native:'Español' },
    { code:'fr',    bcp47:'fr-FR', flag:'🇫🇷', ja:'フランス語',      native:'Français' },
    { code:'de',    bcp47:'de-DE', flag:'🇩🇪', ja:'ドイツ語',        native:'Deutsch' },
    { code:'pt',    bcp47:'pt-BR', flag:'🇧🇷', ja:'ポルトガル語',    native:'Português' },
    { code:'it',    bcp47:'it-IT', flag:'🇮🇹', ja:'イタリア語',      native:'Italiano' },
    { code:'th',    bcp47:'th-TH', flag:'🇹🇭', ja:'タイ語',          native:'ไทย' },
    { code:'vi',    bcp47:'vi-VN', flag:'🇻🇳', ja:'ベトナム語',      native:'Tiếng Việt' },
    { code:'id',    bcp47:'id-ID', flag:'🇮🇩', ja:'インドネシア語',  native:'Bahasa Indonesia' }
  ];
  const LANG_MAP = Object.fromEntries(LANGS.map(l => [l.code, l]));

  /* ---------------------------------------------------------
     0-b. 参加者画面の多言語辞書（12言語）
     参加者が選んだ言語で、ボタン・ラベル・案内文をすべて切り替える
  --------------------------------------------------------- */
  const TEXTS = {
    en: {
      langTitle: 'Choose your language', langSub: 'Tap a language to start',
      langNote: 'Tap a language and captions and sound start right away. You can change it later.',
      iosMuteNote: '※On iPhone, turn off the silent switch (side switch) to hear the sound.',
      voiceEnable: '🔈 Turn on sound', voiceOn: '🔊 Sound ON', voiceOff: '🔇 Sound OFF',
      rate: 'Speed', font: 'Text size', jump: 'Latest ↓',
      displayBoth: 'Translation + original', displayTr: 'Translation only', displayOrig: 'Original only',
      connecting: 'Connecting…', connected: 'Connected',
      disconnected: 'Disconnected. Reconnecting…', netError: 'Network error. Reconnecting…',
      waitGuide: 'Waiting for the guide', libFail: 'Could not load the connection library',
      cannotConnect: 'Cannot connect',
      waitStart: 'Waiting for the guide to start…', waitLang: 'Waiting for captions in this language…',
      liveLabel: '● Live interpreting', listening: 'Listening…', translating: 'Translating…',
      askShort: 'Ask', askTitle: 'Ask the guide', micHint: 'Tap the mic and speak',
      micListening: 'Listening… tap to stop', close: 'Close', sent: 'Question sent',
      qClosed: 'Questions are closed', qClosedHint: 'The guide is not taking questions right now.',
      qNoConn: 'Not connected yet. Please wait a moment.',
      micUnsupported: 'Voice input is not available on this device.',
      micNoSpeech: 'No speech was heard. Tap the mic and try again.',
      micDenied: 'The microphone is blocked. Allow the mic in the browser settings.',
      micNoDevice: 'No microphone was found on this device.',
      micNetwork: 'Voice input needs a connection. Check your network.',
      micError: 'Voice input failed ({err}). Tap the mic and try again.',
      micEmpty: 'No words were heard, so nothing was sent.',
      voiceMuteHint: 'No sound? Turn off silent mode and raise the volume (on iPhone the side switch mutes it).',
      voiceUnsupported: 'This device cannot read text aloud.',
      voiceOnToast: 'Sound is on. You will hear the translation from the speaker.',
      speakOk: 'Sound on',
      setTitle: 'Settings', setDisplay: 'Display', setCaptionStyle: 'Captions',
      optBoth: 'Translation + Japanese original', optTr: 'Translation only (large)', optOrig: 'Japanese original only',
      setFontSize: 'Text size', setLang: 'Language', setLangNote: 'New captions will switch to this language.',
      setVoice: 'Speak aloud', setAutoTts: 'Read captions aloud (TTS)',
      setVoiceNote: 'Plays from the phone speaker. The screen stays awake while sound is on.',
      giftTitle: '🎁 Your tour gift',
      giftSub: 'Here is a summary of today’s conversation. Receive it by email, or save it as text.',
      giftCopy: 'Copy', giftDownload: 'Save as text',
      giftEmailLabel: 'Email address',
      giftConsent: '※We may send you recommendations and news to the email address you register.',
      giftSend: 'Send it to my email', giftSending: 'Sending…',
      giftSent: 'Sent. Please check your inbox.',
      giftSentUnconfirmed: 'Sent. If the email does not arrive, use “Save as text”.',
      giftSendFailed: 'Could not send. Please use “Save as text” to keep it.',
      giftTestSaved: 'Saved on this device for testing (no email service is set up). Use “Save as text” to keep it.',
      giftEmailBad: 'Please check the email address.',
      giftNoUrl: '※Email delivery is not set up for this tour. Use “Save as text” to keep it.',
      giftShort: 'Gift'
    },
    'zh-CN': {
      langTitle: '请选择你的语言', langSub: '点一下即可开始',
      langNote: '点一下语言，字幕和声音马上开始。之后也可以更改。',
      iosMuteNote: '※iPhone 请关闭侧边的静音开关，否则没有声音。',
      voiceEnable: '🔈 开启声音', voiceOn: '🔊 声音开', voiceOff: '🔇 声音关',
      rate: '速度', font: '字体大小', jump: '最新 ↓',
      displayBoth: '译文＋原文', displayTr: '只看译文', displayOrig: '只看原文',
      connecting: '连接中…', connected: '已连接',
      disconnected: '连接断开，正在重连…', netError: '网络错误，正在重连…',
      waitGuide: '等待主持人开始', libFail: '无法加载连接组件', cannotConnect: '无法连接',
      waitStart: '正在等待主持人开始…', waitLang: '正在等待这种语言的字幕…',
      liveLabel: '● 实时翻译中', listening: '正在听…', translating: '翻译中…',
      askShort: '提问', askTitle: '向主持人提问', micHint: '按下麦克风后说话',
      micListening: '正在听…点一下可停止', close: '关闭', sent: '已发送提问',
      qClosed: '已停止接收提问', qClosedHint: '主持人现在不接受提问。',
      qNoConn: '还没有连接上，请稍等。',
      micUnsupported: '此设备无法使用语音输入。', voiceUnsupported: '此设备无法朗读文字。',
      micNoSpeech: '没有听到声音，请再按一次麦克风说话。',
      micDenied: '麦克风被禁止了，请在浏览器设置里允许麦克风。',
      micNoDevice: '此设备没有找到麦克风。',
      micNetwork: '语音输入需要网络，请检查连接。',
      micError: '语音输入失败（{err}）。请再按一次麦克风试试。',
      micEmpty: '没有听到内容，所以没有发送。',
      voiceMuteHint: '没有声音？请关闭静音模式并调大音量（iPhone 侧边开关会静音）。',
      voiceOnToast: '声音已开启，会从扬声器播放译文。', speakOk: '声音已开启',
      setTitle: '设置', setDisplay: '显示', setCaptionStyle: '字幕',
      optBoth: '译文＋日文原文', optTr: '只看译文（大字）', optOrig: '只看日文原文',
      setFontSize: '字体大小', setLang: '语言', setLangNote: '之后到达的字幕会切换成这个语言。',
      setVoice: '朗读', setAutoTts: '自动朗读字幕（TTS）',
      setVoiceNote: '从手机扬声器播放。开启声音时屏幕不会熄灭。',
      giftTitle: '🎁 今日的参观礼物',
      giftSub: '已把今天的对话整理好了。可以发到邮箱，也可以直接保存成文本。',
      giftCopy: '复制', giftDownload: '保存为文本',
      giftEmailLabel: '邮箱地址',
      giftConsent: '※我们可能会向您登记的邮箱发送今后的推荐和资讯。',
      giftSend: '发送到我的邮箱', giftSending: '发送中…',
      giftSent: '已发送，请查看邮箱。',
      giftSentUnconfirmed: '已发送。如果没收到邮件，请用“保存为文本”带走。',
      giftSendFailed: '发送失败。请用“保存为文本”带走。',
      giftTestSaved: '已保存在本机（测试模式，未设置发送地址）。请用“保存为文本”带走。',
      giftEmailBad: '请检查邮箱地址的格式。',
      giftNoUrl: '※本次行程未设置邮件发送。请用“保存为文本”带走。',
      giftShort: '礼物'
    },
    'zh-TW': {
      langTitle: '請選擇你的語言', langSub: '點一下即可開始',
      langNote: '點一下語言，字幕和聲音馬上開始。之後也可以更改。',
      iosMuteNote: '※iPhone 請關閉側邊的靜音開關，否則沒有聲音。',
      voiceEnable: '🔈 開啟聲音', voiceOn: '🔊 聲音開', voiceOff: '🔇 聲音關',
      rate: '速度', font: '字體大小', jump: '最新 ↓',
      displayBoth: '譯文＋原文', displayTr: '只看譯文', displayOrig: '只看原文',
      connecting: '連線中…', connected: '已連線',
      disconnected: '連線中斷，正在重連…', netError: '網路錯誤，正在重連…',
      waitGuide: '等待主持人開始', libFail: '無法載入連線元件',
      waitStart: '正在等待主持人開始…', waitLang: '正在等待這種語言的字幕…',
      liveLabel: '● 即時翻譯中', listening: '正在聽…', translating: '翻譯中…',
      askShort: '提問', askTitle: '向主持人提問', micHint: '按下麥克風後說話',
      micListening: '正在聽…點一下可停止', close: '關閉', sent: '已送出提問',
      qClosed: '已停止接收提問', qClosedHint: '主持人現在不接受提問。',
      qNoConn: '還沒連上，請稍等。',
      micUnsupported: '此裝置無法使用語音輸入。', voiceUnsupported: '此裝置無法朗讀文字。',
      micNoSpeech: '沒有聽到聲音，請再按一次麥克風說話。',
      micDenied: '麥克風被封鎖了，請在瀏覽器設定裡允許麥克風。',
      micNoDevice: '此裝置找不到麥克風。',
      micNetwork: '語音輸入需要網路，請檢查連線。',
      micError: '語音輸入失敗（{err}）。請再按一次麥克風試試。',
      micEmpty: '沒有聽到內容，所以沒有送出。',
      voiceMuteHint: '沒有聲音？請關閉靜音模式並調大音量（iPhone 側邊開關會靜音）。',
      voiceOnToast: '聲音已開啟，會從喇叭播放譯文。', speakOk: '聲音已開啟',
      setTitle: '設定', setDisplay: '顯示', setCaptionStyle: '字幕',
      optBoth: '譯文＋日文原文', optTr: '只看譯文（大字）', optOrig: '只看日文原文',
      setFontSize: '字體大小', setLang: '語言', setLangNote: '之後到達的字幕會切換成這個語言。',
      setVoice: '朗讀', setAutoTts: '自動朗讀字幕（TTS）',
      setVoiceNote: '從手機喇叭播放。開啟聲音時螢幕不會熄滅。',
      giftTitle: '🎁 今天的參觀禮物',
      giftSub: '已把今天的對話整理好了。可以寄到信箱，也可以直接儲存成文字。',
      giftCopy: '複製', giftDownload: '儲存為文字',
      giftEmailLabel: '電子郵件地址',
      giftConsent: '※我們可能會向您登記的信箱寄送今後的推薦與資訊。',
      giftSend: '寄到我的信箱', giftSending: '傳送中…',
      giftSent: '已寄出，請查看信箱。',
      giftSentUnconfirmed: '已寄出。如果沒收到信，請用「儲存為文字」帶走。',
      giftSendFailed: '寄送失敗。請用「儲存為文字」帶走。',
      giftTestSaved: '已存在本機（測試模式，未設定寄送網址）。請用「儲存為文字」帶走。',
      giftEmailBad: '請檢查信箱地址的格式。',
      giftNoUrl: '※本次行程未設定郵件寄送。請用「儲存為文字」帶走。',
      giftShort: '禮物'
    },
    ko: {
      langTitle: '언어를 선택해 주세요', langSub: '누르면 바로 시작됩니다',
      langNote: '언어를 누르면 자막과 소리가 바로 시작됩니다. 나중에 바꿀 수 있습니다.',
      iosMuteNote: '※iPhone은 측면 무음 스위치를 해제해야 소리가 납니다.',
      voiceEnable: '🔈 소리 켜기', voiceOn: '🔊 소리 켜짐', voiceOff: '🔇 소리 꺼짐',
      rate: '속도', font: '글자 크기', jump: '최신 ↓',
      displayBoth: '번역＋원문', displayTr: '번역만', displayOrig: '원문만',
      connecting: '연결 중…', connected: '연결되었습니다',
      disconnected: '연결이 끊겼습니다. 다시 연결 중…', netError: '통신 오류. 다시 연결 중…',
      waitGuide: '가이드 시작을 기다리는 중', libFail: '연결 라이브러리를 불러오지 못했습니다',
      waitStart: '가이드가 시작되기를 기다리고 있습니다…', waitLang: '이 언어의 자막을 기다리고 있습니다…',
      liveLabel: '● 동시 통역 중', listening: '듣는 중…', translating: '번역 중…',
      askShort: '질문', askTitle: '가이드에게 질문', micHint: '마이크를 누르고 말하세요',
      micListening: '듣는 중… 누르면 멈춥니다', close: '닫기', sent: '질문을 보냈습니다',
      qClosed: '질문 접수 중지', qClosedHint: '가이드가 지금은 질문을 받지 않습니다.',
      qNoConn: '아직 연결되지 않았습니다. 잠시 기다려 주세요.',
      micUnsupported: '이 기기에서는 음성 입력을 쓸 수 없습니다.',
      micNoSpeech: '소리가 들리지 않았어요. 마이크를 다시 누르고 말해 주세요.',
      micDenied: '마이크가 차단되어 있어요. 브라우저 설정에서 마이크를 허용해 주세요.',
      micNoDevice: '이 기기에서 마이크를 찾을 수 없어요.',
      micNetwork: '음성 입력에 네트워크가 필요해요. 연결을 확인해 주세요.',
      micError: '음성 입력에 실패했어요({err}). 마이크를 다시 눌러 주세요.',
      micEmpty: '아무 말도 들리지 않아 보내지 않았어요.',
      voiceMuteHint: '소리가 안 나면 무음 모드를 끄고 볼륨을 올려 주세요 (iPhone은 측면 스위치가 무음입니다).',
      voiceUnsupported: '이 기기는 읽어주기를 지원하지 않습니다.',
      voiceOnToast: '소리를 켰습니다. 스피커로 통역이 나옵니다.', speakOk: '소리 켜짐',
      setTitle: '설정', setDisplay: '표시', setCaptionStyle: '자막',
      optBoth: '번역＋일본어 원문', optTr: '번역만 (크게)', optOrig: '일본어 원문만',
      setFontSize: '글자 크기', setLang: '언어', setLangNote: '이후 자막이 이 언어로 바뀝니다.',
      setVoice: '읽어주기', setAutoTts: '자막 자동 읽기 (TTS)',
      setVoiceNote: '휴대폰 스피커로 나옵니다. 소리가 켜져 있는 동안 화면이 꺼지지 않습니다.',
      giftTitle: '🎁 오늘의 선물',
      giftSub: '오늘 나눈 이야기를 정리했습니다. 메일로 받거나 텍스트로 저장할 수 있습니다.',
      giftCopy: '복사', giftDownload: '텍스트로 저장',
      giftEmailLabel: '이메일 주소',
      giftConsent: '※등록하신 이메일 주소로 앞으로 추천 안내나 소식을 보내드릴 수 있습니다.',
      giftSend: '내 메일로 받기', giftSending: '보내는 중…',
      giftSent: '보냈습니다. 메일함을 확인해 주세요.',
      giftSentUnconfirmed: '보냈습니다. 메일이 오지 않으면 “텍스트로 저장”으로 보관해 주세요.',
      giftSendFailed: '보내지 못했습니다. “텍스트로 저장”으로 보관해 주세요.',
      giftTestSaved: '테스트로 이 기기에 저장했습니다(보낼 주소 미설정). “텍스트로 저장”으로 보관해 주세요.',
      giftEmailBad: '이메일 주소 형식을 확인해 주세요.',
      giftNoUrl: '※이번 투어는 메일 발송이 설정되지 않았습니다. “텍스트로 저장”으로 보관해 주세요.',
      giftShort: '선물'
    },
    es: {
      langTitle: 'Elige tu idioma', langSub: 'Toca un idioma para empezar',
      langNote: 'Toca un idioma y empiezan los subtítulos y el sonido. Puedes cambiarlo después.',
      iosMuteNote: '※En iPhone, desactiva el interruptor de silencio lateral para oír el sonido.',
      voiceEnable: '🔈 Activar el sonido', voiceOn: '🔊 Sonido ON', voiceOff: '🔇 Sonido OFF',
      rate: 'Velocidad', font: 'Tamaño de letra', jump: 'Lo último ↓',
      displayBoth: 'Traducción + original', displayTr: 'Solo traducción', displayOrig: 'Solo original',
      connecting: 'Conectando…', connected: 'Conectado',
      disconnected: 'Desconectado. Reconectando…', netError: 'Error de red. Reconectando…',
      waitGuide: 'Esperando al guía', libFail: 'No se pudo cargar la conexión', cannotConnect: 'No se puede conectar',
      waitStart: 'Esperando a que el guía empiece…', waitLang: 'Esperando subtítulos en este idioma…',
      liveLabel: '● Interpretación en vivo', listening: 'Escuchando…', translating: 'Traduciendo…',
      askShort: 'Preguntar', askTitle: 'Pregunta al guía', micHint: 'Toca el micrófono y habla',
      micListening: 'Escuchando… toca para parar', close: 'Cerrar', sent: 'Pregunta enviada',
      qClosed: 'Preguntas cerradas', qClosedHint: 'El guía no acepta preguntas ahora mismo.',
      qNoConn: 'Aún no hay conexión. Espera un momento.',
      micUnsupported: 'Este dispositivo no admite entrada de voz.',
      micNoSpeech: 'No se oyó nada. Toca el micrófono y vuelve a hablar.',
      micDenied: 'El micrófono está bloqueado. Permite el micrófono en los ajustes del navegador.',
      micNoDevice: 'No se encontró ningún micrófono en este dispositivo.',
      micNetwork: 'La entrada de voz necesita conexión. Revisa tu red.',
      micError: 'Falló la entrada de voz ({err}). Toca el micrófono otra vez.',
      micEmpty: 'No se oyó nada, así que no se envió.',
      voiceMuteHint: '¿No hay sonido? Desactiva el modo silencio y sube el volumen (en iPhone el interruptor lateral silencia).',
      voiceUnsupported: 'Este dispositivo no puede leer en voz alta.',
      voiceOnToast: 'Sonido activado. Oirás la traducción por el altavoz.', speakOk: 'Sonido activado',
      setTitle: 'Ajustes', setDisplay: 'Pantalla', setCaptionStyle: 'Subtítulos',
      optBoth: 'Traducción + original japonés', optTr: 'Solo traducción (grande)', optOrig: 'Solo original japonés',
      setFontSize: 'Tamaño de letra', setLang: 'Idioma', setLangNote: 'Los próximos subtítulos cambiarán a este idioma.',
      setVoice: 'Lectura en voz alta', setAutoTts: 'Leer los subtítulos (TTS)',
      setVoiceNote: 'Suena por el altavoz del teléfono. La pantalla no se apaga mientras el sonido está activo.',
      giftTitle: '🎁 Tu recuerdo del tour',
      giftSub: 'Aquí tienes un resumen de la conversación de hoy. Recíbelo por correo o guárdalo como texto.',
      giftCopy: 'Copiar', giftDownload: 'Guardar como texto',
      giftEmailLabel: 'Correo electrónico',
      giftConsent: '※Es posible que enviemos recomendaciones y noticias al correo que registres.',
      giftSend: 'Enviar a mi correo', giftSending: 'Enviando…',
      giftSent: 'Enviado. Revisa tu correo.',
      giftSentUnconfirmed: 'Enviado. Si el correo no llega, usa «Guardar como texto».',
      giftSendFailed: 'No se pudo enviar. Usa «Guardar como texto» para llevártelo.',
      giftTestSaved: 'Guardado en este dispositivo (modo prueba, sin servicio de envío). Usa «Guardar como texto».',
      giftEmailBad: 'Revisa el formato del correo.',
      giftNoUrl: '※Este tour no tiene envío por correo configurado. Usa «Guardar como texto».',
      giftShort: 'Recuerdo'
    },
    fr: {
      langTitle: 'Choisissez votre langue', langSub: 'Touchez une langue pour commencer',
      langNote: 'Touchez une langue : sous-titres et son démarrent aussitôt. Modifiable ensuite.',
      iosMuteNote: '※Sur iPhone, désactivez le commutateur silencieux sur le côté pour entendre.',
      voiceEnable: '🔈 Activer le son', voiceOn: '🔊 Son ON', voiceOff: '🔇 Son OFF',
      rate: 'Vitesse', font: 'Taille du texte', jump: 'Plus récent ↓',
      displayBoth: 'Traduction + original', displayTr: 'Traduction seule', displayOrig: 'Original seul',
      connecting: 'Connexion…', connected: 'Connecté',
      disconnected: 'Déconnecté. Reconnexion…', netError: 'Erreur réseau. Reconnexion…',
      waitGuide: 'En attente du guide', libFail: 'Impossible de charger la connexion', cannotConnect: 'Connexion impossible',
      waitStart: 'En attente du démarrage du guide…', waitLang: 'En attente des sous-titres dans cette langue…',
      liveLabel: '● Interprétation en direct', listening: 'Écoute…', translating: 'Traduction…',
      askShort: 'Demander', askTitle: 'Poser une question', micHint: 'Touchez le micro et parlez',
      micListening: 'Écoute… touchez pour arrêter', close: 'Fermer', sent: 'Question envoyée',
      qClosed: 'Questions fermées', qClosedHint: 'Le guide ne prend pas de questions pour le moment.',
      qNoConn: 'Pas encore connecté. Patientez un instant.',
      micUnsupported: 'La saisie vocale n’est pas disponible sur cet appareil.',
      micNoSpeech: 'Rien n’a été entendu. Touchez le micro et reparlez.',
      micDenied: 'Le micro est bloqué. Autorisez le micro dans les réglages du navigateur.',
      micNoDevice: 'Aucun micro trouvé sur cet appareil.',
      micNetwork: 'La saisie vocale a besoin d’une connexion. Vérifiez votre réseau.',
      micError: 'La saisie vocale a échoué ({err}). Touchez de nouveau le micro.',
      micEmpty: 'Rien n’a été entendu, donc rien n’a été envoyé.',
      voiceMuteHint: 'Pas de son ? Désactivez le mode silencieux et montez le volume (sur iPhone, le commutateur latéral coupe le son).',
      voiceUnsupported: 'Cet appareil ne peut pas lire le texte à voix haute.',
      voiceOnToast: 'Son activé. La traduction sort par le haut-parleur.', speakOk: 'Son activé',
      setTitle: 'Réglages', setDisplay: 'Affichage', setCaptionStyle: 'Sous-titres',
      optBoth: 'Traduction + original japonais', optTr: 'Traduction seule (grande)', optOrig: 'Original japonais seul',
      setFontSize: 'Taille du texte', setLang: 'Langue', setLangNote: 'Les prochains sous-titres passeront dans cette langue.',
      setVoice: 'Lecture à voix haute', setAutoTts: 'Lire les sous-titres (TTS)',
      setVoiceNote: 'Sort par le haut-parleur du téléphone. L’écran reste allumé quand le son est actif.',
      giftTitle: '🎁 Votre souvenir du tour',
      giftSub: 'Voici un résumé de la conversation du jour. Recevez-le par e-mail ou enregistrez-le en texte.',
      giftCopy: 'Copier', giftDownload: 'Enregistrer en texte',
      giftEmailLabel: 'Adresse e-mail',
      giftConsent: '※Nous pourrons envoyer des recommandations et des nouvelles à l’adresse e-mail que vous enregistrez.',
      giftSend: 'Recevoir par e-mail', giftSending: 'Envoi…',
      giftSent: 'Envoyé. Vérifiez votre boîte mail.',
      giftSentUnconfirmed: 'Envoyé. Si l’e-mail n’arrive pas, utilisez « Enregistrer en texte ».',
      giftSendFailed: 'Envoi impossible. Utilisez « Enregistrer en texte » pour le garder.',
      giftTestSaved: 'Enregistré sur cet appareil (mode test, aucun envoi configuré). Utilisez « Enregistrer en texte ».',
      giftEmailBad: 'Vérifiez le format de l’adresse e-mail.',
      giftNoUrl: '※L’envoi par e-mail n’est pas configuré pour ce tour. Utilisez « Enregistrer en texte ».',
      giftShort: 'Souvenir'
    },
    de: {
      langTitle: 'Wählen Sie Ihre Sprache', langSub: 'Sprache antippen und loslegen',
      langNote: 'Sprache antippen: Untertitel und Ton starten sofort. Später änderbar.',
      iosMuteNote: '※Beim iPhone den Stummschalter an der Seite ausschalten, sonst bleibt es still.',
      voiceEnable: '🔈 Ton einschalten', voiceOn: '🔊 Ton AN', voiceOff: '🔇 Ton AUS',
      rate: 'Tempo', font: 'Schriftgröße', jump: 'Neueste ↓',
      displayBoth: 'Übersetzung + Original', displayTr: 'Nur Übersetzung', displayOrig: 'Nur Original',
      connecting: 'Verbinden…', connected: 'Verbunden',
      disconnected: 'Getrennt. Verbinde neu…', netError: 'Netzwerkfehler. Verbinde neu…',
      waitGuide: 'Warte auf den Guide', libFail: 'Verbindungsbibliothek nicht geladen', cannotConnect: 'Keine Verbindung möglich',
      waitStart: 'Warte, bis der Guide startet…', waitLang: 'Warte auf Untertitel in dieser Sprache…',
      liveLabel: '● Live-Übersetzung', listening: 'Höre zu…', translating: 'Übersetze…',
      askShort: 'Fragen', askTitle: 'Guide fragen', micHint: 'Mikrofon antippen und sprechen',
      micListening: 'Höre zu… zum Stoppen antippen', close: 'Schließen', sent: 'Frage gesendet',
      qClosed: 'Fragen geschlossen', qClosedHint: 'Der Guide nimmt gerade keine Fragen an.',
      qNoConn: 'Noch nicht verbunden. Bitte kurz warten.',
      micUnsupported: 'Spracheingabe ist auf diesem Gerät nicht verfügbar.',
      micNoSpeech: 'Es war nichts zu hören. Tippe das Mikrofon an und sprich noch einmal.',
      micDenied: 'Das Mikrofon ist blockiert. Erlaube das Mikrofon in den Browsereinstellungen.',
      micNoDevice: 'Auf diesem Gerät wurde kein Mikrofon gefunden.',
      micNetwork: 'Spracheingabe braucht eine Verbindung. Prüfe dein Netz.',
      micError: 'Spracheingabe fehlgeschlagen ({err}). Tippe erneut auf das Mikrofon.',
      micEmpty: 'Nichts gehört, daher nicht gesendet.',
      voiceMuteHint: 'Kein Ton? Schalte den Stumm-Modus aus und erhöhe die Lautstärke (beim iPhone schaltet der Seitenschalter stumm).',
      voiceUnsupported: 'Dieses Gerät kann Text nicht vorlesen.',
      voiceOnToast: 'Ton ist an. Die Übersetzung kommt aus dem Lautsprecher.', speakOk: 'Ton an',
      setTitle: 'Einstellungen', setDisplay: 'Anzeige', setCaptionStyle: 'Untertitel',
      optBoth: 'Übersetzung + japanisches Original', optTr: 'Nur Übersetzung (groß)', optOrig: 'Nur japanisches Original',
      setFontSize: 'Schriftgröße', setLang: 'Sprache', setLangNote: 'Neue Untertitel erscheinen in dieser Sprache.',
      setVoice: 'Vorlesen', setAutoTts: 'Untertitel vorlesen (TTS)',
      setVoiceNote: 'Ton kommt aus dem Telefonlautsprecher. Der Bildschirm bleibt an, solange Ton aktiv ist.',
      giftTitle: '🎁 Deine Tour-Erinnerung',
      giftSub: 'Hier ist eine Zusammenfassung des heutigen Gesprächs. Per E-Mail erhalten oder als Text speichern.',
      giftCopy: 'Kopieren', giftDownload: 'Als Text speichern',
      giftEmailLabel: 'E-Mail-Adresse',
      giftConsent: '※An die von dir angegebene E-Mail-Adresse können wir künftig Empfehlungen und Neuigkeiten senden.',
      giftSend: 'An meine E-Mail senden', giftSending: 'Senden…',
      giftSent: 'Gesendet. Bitte prüfe dein Postfach.',
      giftSentUnconfirmed: 'Gesendet. Falls die E-Mail nicht ankommt, nutze „Als Text speichern“.',
      giftSendFailed: 'Senden fehlgeschlagen. Bitte nutze „Als Text speichern“.',
      giftTestSaved: 'Auf diesem Gerät gespeichert (Testmodus, kein Versand eingerichtet). Nutze „Als Text speichern“.',
      giftEmailBad: 'Bitte prüfe die E-Mail-Adresse.',
      giftNoUrl: '※Für diese Tour ist kein E-Mail-Versand eingerichtet. Nutze „Als Text speichern“.',
      giftShort: 'Erinnerung'
    },
    pt: {
      langTitle: 'Escolha o seu idioma', langSub: 'Toque no idioma para começar',
      langNote: 'Toque num idioma: legendas e som começam na hora. Dá para mudar depois.',
      iosMuteNote: '※No iPhone, desligue a chave de silêncio na lateral para ouvir o som.',
      voiceEnable: '🔈 Ativar o som', voiceOn: '🔊 Som LIG', voiceOff: '🔇 Som DESL',
      rate: 'Velocidade', font: 'Tamanho do texto', jump: 'Mais recente ↓',
      displayBoth: 'Tradução + original', displayTr: 'Só tradução', displayOrig: 'Só original',
      connecting: 'Conectando…', connected: 'Conectado',
      disconnected: 'Desconectado. Reconectando…', netError: 'Erro de rede. Reconectando…',
      waitGuide: 'Aguardando o guia', libFail: 'Não foi possível carregar a conexão', cannotConnect: 'Não é possível conectar',
      waitStart: 'Aguardando o guia começar…', waitLang: 'Aguardando legendas neste idioma…',
      liveLabel: '● Interpretação ao vivo', listening: 'Ouvindo…', translating: 'Traduzindo…',
      askShort: 'Perguntar', askTitle: 'Pergunte ao guia', micHint: 'Toque no microfone e fale',
      micListening: 'Ouvindo… toque para parar', close: 'Fechar', sent: 'Pergunta enviada',
      qClosed: 'Perguntas fechadas', qClosedHint: 'O guia não está aceitando perguntas agora.',
      qNoConn: 'Ainda não conectado. Aguarde um instante.',
      micUnsupported: 'Entrada de voz não disponível neste aparelho.',
      micNoSpeech: 'Não foi ouvido nada. Toque no microfone e fale de novo.',
      micDenied: 'O microfone está bloqueado. Permita o microfone nas configurações do navegador.',
      micNoDevice: 'Nenhum microfone foi encontrado neste aparelho.',
      micNetwork: 'A entrada de voz precisa de conexão. Verifique sua rede.',
      micError: 'Falha na entrada de voz ({err}). Toque no microfone de novo.',
      micEmpty: 'Nada foi ouvido, então não foi enviado.',
      voiceMuteHint: 'Sem som? Desative o modo silencioso e aumente o volume (no iPhone a chave lateral silencia).',
      voiceUnsupported: 'Este aparelho não lê texto em voz alta.',
      voiceOnToast: 'Som ativado. A tradução sai pelo alto-falante.', speakOk: 'Som ativado',
      setTitle: 'Ajustes', setDisplay: 'Tela', setCaptionStyle: 'Legendas',
      optBoth: 'Tradução + original em japonês', optTr: 'Só tradução (grande)', optOrig: 'Só original em japonês',
      setFontSize: 'Tamanho do texto', setLang: 'Idioma', setLangNote: 'As próximas legendas passam a usar este idioma.',
      setVoice: 'Leitura em voz alta', setAutoTts: 'Ler as legendas (TTS)',
      setVoiceNote: 'Sai pelo alto-falante do celular. A tela fica acesa enquanto o som está ativo.',
      giftTitle: '🎁 Sua lembrança do tour',
      giftSub: 'Aqui está um resumo da conversa de hoje. Receba por e-mail ou salve como texto.',
      giftCopy: 'Copiar', giftDownload: 'Salvar como texto',
      giftEmailLabel: 'E-mail',
      giftConsent: '※Podemos enviar recomendações e novidades para o e-mail que você cadastrar.',
      giftSend: 'Enviar para o meu e-mail', giftSending: 'Enviando…',
      giftSent: 'Enviado. Confira sua caixa de entrada.',
      giftSentUnconfirmed: 'Enviado. Se o e-mail não chegar, use “Salvar como texto”.',
      giftSendFailed: 'Não foi possível enviar. Use “Salvar como texto”.',
      giftTestSaved: 'Salvo neste aparelho (modo teste, sem envio configurado). Use “Salvar como texto”.',
      giftEmailBad: 'Confira o formato do e-mail.',
      giftNoUrl: '※Este tour não tem envio por e-mail configurado. Use “Salvar como texto”.',
      giftShort: 'Lembrança'
    },
    it: {
      langTitle: 'Scegli la tua lingua', langSub: 'Tocca una lingua per iniziare',
      langNote: 'Tocca una lingua: sottotitoli e audio partono subito. Puoi cambiarli dopo.',
      iosMuteNote: '※Su iPhone disattiva l’interruttore del silenzioso sul lato per sentire l’audio.',
      voiceEnable: '🔈 Attiva l’audio', voiceOn: '🔊 Audio ON', voiceOff: '🔇 Audio OFF',
      rate: 'Velocità', font: 'Dimensione testo', jump: 'Ultimo ↓',
      displayBoth: 'Traduzione + originale', displayTr: 'Solo traduzione', displayOrig: 'Solo originale',
      connecting: 'Connessione…', connected: 'Connesso',
      disconnected: 'Disconnesso. Riconnessione…', netError: 'Errore di rete. Riconnessione…',
      waitGuide: 'In attesa della guida', libFail: 'Impossibile caricare la connessione', cannotConnect: 'Connessione impossibile',
      waitStart: 'In attesa che la guida inizi…', waitLang: 'In attesa dei sottotitoli in questa lingua…',
      liveLabel: '● Interpretariato dal vivo', listening: 'In ascolto…', translating: 'Traduzione…',
      askShort: 'Chiedi', askTitle: 'Chiedi alla guida', micHint: 'Tocca il microfono e parla',
      micListening: 'In ascolto… tocca per fermare', close: 'Chiudi', sent: 'Domanda inviata',
      qClosed: 'Domande chiuse', qClosedHint: 'La guida non accetta domande in questo momento.',
      qNoConn: 'Non ancora connesso. Attendi un momento.',
      micUnsupported: 'L’input vocale non è disponibile su questo dispositivo.',
      micNoSpeech: 'Non si è sentito nulla. Tocca il microfono e parla di nuovo.',
      micDenied: 'Il microfono è bloccato. Consenti il microfono nelle impostazioni del browser.',
      micNoDevice: 'Nessun microfono trovato su questo dispositivo.',
      micNetwork: 'L’input vocale richiede una connessione. Controlla la rete.',
      micError: 'Input vocale non riuscito ({err}). Tocca di nuovo il microfono.',
      micEmpty: 'Non si è sentito nulla, quindi non è stato inviato.',
      voiceMuteHint: 'Nessun suono? Disattiva la modalità silenziosa e alza il volume (su iPhone l’interruttore laterale disattiva l’audio).',
      voiceUnsupported: 'Questo dispositivo non legge il testo ad alta voce.',
      voiceOnToast: 'Audio attivo. La traduzione esce dall’altoparlante.', speakOk: 'Audio attivo',
      setTitle: 'Impostazioni', setDisplay: 'Schermo', setCaptionStyle: 'Sottotitoli',
      optBoth: 'Traduzione + originale giapponese', optTr: 'Solo traduzione (grande)', optOrig: 'Solo originale giapponese',
      setFontSize: 'Dimensione testo', setLang: 'Lingua', setLangNote: 'I prossimi sottotitoli useranno questa lingua.',
      setVoice: 'Lettura ad alta voce', setAutoTts: 'Leggi i sottotitoli (TTS)',
      setVoiceNote: 'Esce dall’altoparlante del telefono. Lo schermo resta acceso con l’audio attivo.',
      giftTitle: '🎁 Il tuo ricordo del tour',
      giftSub: 'Ecco un riassunto della conversazione di oggi. Ricevilo via email o salvalo come testo.',
      giftCopy: 'Copia', giftDownload: 'Salva come testo',
      giftEmailLabel: 'Indirizzo email',
      giftConsent: '※Potremo inviare consigli e novità all’indirizzo email che registri.',
      giftSend: 'Invia alla mia email', giftSending: 'Invio…',
      giftSent: 'Inviato. Controlla la casella.',
      giftSentUnconfirmed: 'Inviato. Se l’email non arriva, usa «Salva come testo».',
      giftSendFailed: 'Invio non riuscito. Usa «Salva come testo».',
      giftTestSaved: 'Salvato su questo dispositivo (modalità test, invio non configurato). Usa «Salva come testo».',
      giftEmailBad: 'Controlla il formato dell’indirizzo email.',
      giftNoUrl: '※Per questo tour l’invio via email non è configurato. Usa «Salva come testo».',
      giftShort: 'Ricordo'
    },
    th: {
      langTitle: 'เลือกภาษาของคุณ', langSub: 'แตะภาษาเพื่อเริ่ม',
      langNote: 'แตะภาษา แล้วคำบรรยายและเสียงจะเริ่มทันที เปลี่ยนภายหลังได้',
      iosMuteNote: '※iPhone ต้องปิดสวิตช์ปิดเสียงด้านข้างจึงจะมีเสียง',
      voiceEnable: '🔈 เปิดเสียง', voiceOn: '🔊 เสียงเปิด', voiceOff: '🔇 เสียงปิด',
      rate: 'ความเร็ว', font: 'ขนาดตัวอักษร', jump: 'ล่าสุด ↓',
      displayBoth: 'คำแปล＋ต้นฉบับ', displayTr: 'คำแปลเท่านั้น', displayOrig: 'ต้นฉบับเท่านั้น',
      connecting: 'กำลังเชื่อมต่อ…', connected: 'เชื่อมต่อแล้ว',
      disconnected: 'หลุดการเชื่อมต่อ กำลังเชื่อมใหม่…', netError: 'เครือข่ายขัดข้อง กำลังเชื่อมใหม่…',
      waitGuide: 'รอไกด์เริ่ม', libFail: 'โหลดไลบรารีการเชื่อมต่อไม่ได้', cannotConnect: 'เชื่อมต่อไม่ได้',
      waitStart: 'กำลังรอให้ไกด์เริ่ม…', waitLang: 'กำลังรอคำบรรยายภาษานี้…',
      liveLabel: '● กำลังแปลสด', listening: 'กำลังฟัง…', translating: 'กำลังแปล…',
      askShort: 'ถาม', askTitle: 'ถามไกด์', micHint: 'แตะไมโครโฟนแล้วพูด',
      micListening: 'กำลังฟัง… แตะเพื่อหยุด', close: 'ปิด', sent: 'ส่งคำถามแล้ว',
      qClosed: 'ปิดรับคำถาม', qClosedHint: 'ตอนนี้ไกด์ไม่รับคำถาม',
      qNoConn: 'ยังไม่ได้เชื่อมต่อ กรุณารอสักครู่',
      micUnsupported: 'อุปกรณ์นี้ใช้การพิมพ์ด้วยเสียงไม่ได้',
      micNoSpeech: 'ไม่ได้ยินเสียง กดไมโครโฟนแล้วพูดอีกครั้ง',
      micDenied: 'ไมโครโฟนถูกบล็อก กรุณาอนุญาตไมโครโฟนในการตั้งค่าเบราว์เซอร์',
      micNoDevice: 'ไม่พบไมโครโฟนบนเครื่องนี้',
      micNetwork: 'การพูดต้องใช้อินเทอร์เน็ต กรุณาตรวจสอบการเชื่อมต่อ',
      micError: 'พูดไม่สำเร็จ ({err}) แตะไมโครโฟนอีกครั้ง',
      micEmpty: 'ไม่ได้ยินคำพูด จึงยังไม่ส่ง',
      voiceMuteHint: 'ไม่มีเสียง? ปิดโหมดเงียบและเพิ่มเสียง (iPhone สวิตช์ด้านข้างจะปิดเสียง)',
      voiceUnsupported: 'อุปกรณ์นี้อ่านออกเสียงไม่ได้',
      voiceOnToast: 'เปิดเสียงแล้ว คำแปลจะออกจากลำโพง', speakOk: 'เสียงเปิดแล้ว',
      setTitle: 'ตั้งค่า', setDisplay: 'การแสดงผล', setCaptionStyle: 'คำบรรยาย',
      optBoth: 'คำแปล＋ต้นฉบับภาษาญี่ปุ่น', optTr: 'คำแปลเท่านั้น (ใหญ่)', optOrig: 'ต้นฉบับภาษาญี่ปุ่นเท่านั้น',
      setFontSize: 'ขนาดตัวอักษร', setLang: 'ภาษา', setLangNote: 'คำบรรยายต่อไปจะเปลี่ยนเป็นภาษานี้',
      setVoice: 'อ่านออกเสียง', setAutoTts: 'อ่านคำบรรยายอัตโนมัติ (TTS)',
      setVoiceNote: 'ออกเสียงจากลำโพงมือถือ หน้าจอจะไม่ดับขณะเปิดเสียง',
      giftTitle: '🎁 ของฝากจากทัวร์วันนี้',
      giftSub: 'สรุปบทสนทนาวันนี้ให้แล้ว รับทางอีเมลหรือบันทึกเป็นข้อความเก็บไว้ได้เลย',
      giftCopy: 'คัดลอก', giftDownload: 'บันทึกเป็นข้อความ',
      giftEmailLabel: 'อีเมล',
      giftConsent: '※เราอาจส่งคำแนะนำและข่าวสารไปยังอีเมลที่คุณลงทะเบียนไว้',
      giftSend: 'ส่งไปยังอีเมลของฉัน', giftSending: 'กำลังส่ง…',
      giftSent: 'ส่งแล้ว กรุณาตรวจสอบอีเมล',
      giftSentUnconfirmed: 'ส่งแล้ว หากไม่ได้รับอีเมล กรุณาใช้ “บันทึกเป็นข้อความ”',
      giftSendFailed: 'ส่งไม่สำเร็จ กรุณาใช้ “บันทึกเป็นข้อความ”',
      giftTestSaved: 'บันทึกในเครื่องนี้แล้ว (โหมดทดสอบ ยังไม่ได้ตั้งค่าการส่ง) กรุณาใช้ “บันทึกเป็นข้อความ”',
      giftEmailBad: 'กรุณาตรวจสอบรูปแบบอีเมล',
      giftNoUrl: '※ทัวร์นี้ยังไม่ได้ตั้งค่าการส่งอีเมล กรุณาใช้ “บันทึกเป็นข้อความ”',
      giftShort: 'ของฝาก'
    },
    vi: {
      langTitle: 'Chọn ngôn ngữ của bạn', langSub: 'Chạm một ngôn ngữ để bắt đầu',
      langNote: 'Chạm vào ngôn ngữ là phụ đề và âm thanh bắt đầu ngay. Có thể đổi sau.',
      iosMuteNote: '※Trên iPhone, hãy tắt công tắc im lặng ở cạnh máy để có tiếng.',
      voiceEnable: '🔈 Bật âm thanh', voiceOn: '🔊 Âm thanh BẬT', voiceOff: '🔇 Âm thanh TẮT',
      rate: 'Tốc độ', font: 'Cỡ chữ', jump: 'Mới nhất ↓',
      displayBoth: 'Bản dịch + nguyên văn', displayTr: 'Chỉ bản dịch', displayOrig: 'Chỉ nguyên văn',
      connecting: 'Đang kết nối…', connected: 'Đã kết nối',
      disconnected: 'Mất kết nối. Đang kết nối lại…', netError: 'Lỗi mạng. Đang kết nối lại…',
      waitGuide: 'Đang chờ hướng dẫn viên', libFail: 'Không tải được thư viện kết nối', cannotConnect: 'Không kết nối được',
      waitStart: 'Đang chờ hướng dẫn viên bắt đầu…', waitLang: 'Đang chờ phụ đề bằng ngôn ngữ này…',
      liveLabel: '● Đang phiên dịch trực tiếp', listening: 'Đang nghe…', translating: 'Đang dịch…',
      askShort: 'Hỏi', askTitle: 'Hỏi hướng dẫn viên', micHint: 'Chạm vào mic và nói',
      micListening: 'Đang nghe… chạm để dừng', close: 'Đóng', sent: 'Đã gửi câu hỏi',
      qClosed: 'Đã đóng nhận câu hỏi', qClosedHint: 'Hiện hướng dẫn viên không nhận câu hỏi.',
      qNoConn: 'Chưa kết nối. Vui lòng đợi một chút.',
      micUnsupported: 'Thiết bị này không hỗ trợ nhập bằng giọng nói.',
      micNoSpeech: 'Không nghe thấy gì. Hãy nhấn micro và nói lại.',
      micDenied: 'Micro đang bị chặn. Hãy cho phép micro trong cài đặt trình duyệt.',
      micNoDevice: 'Không tìm thấy micro trên thiết bị này.',
      micNetwork: 'Nhập bằng giọng nói cần mạng. Hãy kiểm tra kết nối.',
      micError: 'Nhập giọng nói thất bại ({err}). Nhấn lại mic và thử lại.',
      micEmpty: 'Không nghe thấy gì nên chưa gửi.',
      voiceMuteHint: 'Không có tiếng? Hãy tắt chế độ im lặng và tăng âm lượng (iPhone bị tắt tiếng bằng công tắc bên hông).',
      voiceUnsupported: 'Thiết bị này không đọc được văn bản.',
      voiceOnToast: 'Đã bật âm thanh. Bản dịch sẽ phát ra loa.', speakOk: 'Đã bật âm thanh',
      setTitle: 'Cài đặt', setDisplay: 'Hiển thị', setCaptionStyle: 'Phụ đề',
      optBoth: 'Bản dịch + nguyên văn tiếng Nhật', optTr: 'Chỉ bản dịch (lớn)', optOrig: 'Chỉ nguyên văn tiếng Nhật',
      setFontSize: 'Cỡ chữ', setLang: 'Ngôn ngữ', setLangNote: 'Phụ đề tiếp theo sẽ chuyển sang ngôn ngữ này.',
      setVoice: 'Đọc thành tiếng', setAutoTts: 'Tự động đọc phụ đề (TTS)',
      setVoiceNote: 'Phát ra loa điện thoại. Màn hình không tắt khi bật âm thanh.',
      giftTitle: '🎁 Quà lưu niệm chuyến đi',
      giftSub: 'Đây là bản tóm tắt cuộc trò chuyện hôm nay. Nhận qua email hoặc lưu thành văn bản.',
      giftCopy: 'Sao chép', giftDownload: 'Lưu thành văn bản',
      giftEmailLabel: 'Địa chỉ email',
      giftConsent: '※Chúng tôi có thể gửi gợi ý và tin tức đến địa chỉ email bạn đăng ký.',
      giftSend: 'Gửi đến email của tôi', giftSending: 'Đang gửi…',
      giftSent: 'Đã gửi. Vui lòng kiểm tra hộp thư.',
      giftSentUnconfirmed: 'Đã gửi. Nếu không nhận được email, hãy dùng “Lưu thành văn bản”.',
      giftSendFailed: 'Không gửi được. Hãy dùng “Lưu thành văn bản”.',
      giftTestSaved: 'Đã lưu trên máy này (chế độ thử, chưa cấu hình gửi). Hãy dùng “Lưu thành văn bản”.',
      giftEmailBad: 'Vui lòng kiểm tra địa chỉ email.',
      giftNoUrl: '※Chuyến này chưa cấu hình gửi email. Hãy dùng “Lưu thành văn bản”.',
      giftShort: 'Quà'
    },
    id: {
      langTitle: 'Pilih bahasa Anda', langSub: 'Ketuk bahasa untuk mulai',
      langNote: 'Ketuk bahasa, teks dan suara langsung mulai. Bisa diubah nanti.',
      iosMuteNote: '※Di iPhone, matikan sakelar senyap di samping agar ada suara.',
      voiceEnable: '🔈 Nyalakan suara', voiceOn: '🔊 Suara AKTIF', voiceOff: '🔇 Suara NONAKTIF',
      rate: 'Kecepatan', font: 'Ukuran huruf', jump: 'Terbaru ↓',
      displayBoth: 'Terjemahan + asli', displayTr: 'Hanya terjemahan', displayOrig: 'Hanya asli',
      connecting: 'Menghubungkan…', connected: 'Terhubung',
      disconnected: 'Terputus. Menghubungkan ulang…', netError: 'Gangguan jaringan. Menghubungkan ulang…',
      waitGuide: 'Menunggu pemandu', libFail: 'Gagal memuat pustaka koneksi', cannotConnect: 'Tidak bisa terhubung',
      waitStart: 'Menunggu pemandu memulai…', waitLang: 'Menunggu teks dalam bahasa ini…',
      liveLabel: '● Penerjemahan langsung', listening: 'Mendengarkan…', translating: 'Menerjemahkan…',
      askShort: 'Tanya', askTitle: 'Tanya pemandu', micHint: 'Ketuk mikrofon lalu bicara',
      micListening: 'Mendengarkan… ketuk untuk berhenti', close: 'Tutup', sent: 'Pertanyaan terkirim',
      qClosed: 'Pertanyaan ditutup', qClosedHint: 'Pemandu sedang tidak menerima pertanyaan.',
      qNoConn: 'Belum terhubung. Mohon tunggu sebentar.',
      micUnsupported: 'Input suara tidak tersedia di perangkat ini.',
      micNoSpeech: 'Tidak ada suara yang terdengar. Ketuk mikrofon dan bicara lagi.',
      micDenied: 'Mikrofon diblokir. Izinkan mikrofon di pengaturan browser.',
      micNoDevice: 'Mikrofon tidak ditemukan di perangkat ini.',
      micNetwork: 'Input suara butuh koneksi. Periksa jaringanmu.',
      micError: 'Input suara gagal ({err}). Ketuk mic lagi.',
      micEmpty: 'Tidak ada yang terdengar, jadi belum dikirim.',
      voiceMuteHint: 'Tidak ada suara? Matikan mode senyap dan naikkan volume (di iPhone, sakelar samping membisukan).',
      voiceUnsupported: 'Perangkat ini tidak bisa membacakan teks.',
      voiceOnToast: 'Suara aktif. Terjemahan keluar dari speaker.', speakOk: 'Suara aktif',
      setTitle: 'Pengaturan', setDisplay: 'Tampilan', setCaptionStyle: 'Teks',
      optBoth: 'Terjemahan + asli Jepang', optTr: 'Hanya terjemahan (besar)', optOrig: 'Hanya asli Jepang',
      setFontSize: 'Ukuran huruf', setLang: 'Bahasa', setLangNote: 'Teks berikutnya akan memakai bahasa ini.',
      setVoice: 'Bacakan', setAutoTts: 'Bacakan teks otomatis (TTS)',
      setVoiceNote: 'Keluar dari speaker ponsel. Layar tetap menyala saat suara aktif.',
      giftTitle: '🎁 Oleh-oleh tur hari ini',
      giftSub: 'Ini ringkasan percakapan hari ini. Terima lewat email atau simpan sebagai teks.',
      giftCopy: 'Salin', giftDownload: 'Simpan sebagai teks',
      giftEmailLabel: 'Alamat email',
      giftConsent: '※Kami dapat mengirim rekomendasi dan berita ke alamat email yang Anda daftarkan.',
      giftSend: 'Kirim ke email saya', giftSending: 'Mengirim…',
      giftSent: 'Terkirim. Silakan periksa email Anda.',
      giftSentUnconfirmed: 'Terkirim. Jika email tidak datang, gunakan “Simpan sebagai teks”.',
      giftSendFailed: 'Gagal mengirim. Gunakan “Simpan sebagai teks”.',
      giftTestSaved: 'Disimpan di perangkat ini (mode uji, pengiriman belum diatur). Gunakan “Simpan sebagai teks”.',
      giftEmailBad: 'Periksa format alamat email.',
      giftNoUrl: '※Tur ini belum mengatur pengiriman email. Gunakan “Simpan sebagai teks”.',
      giftShort: 'Oleh-oleh'
    }
  };

  /* ---------------------------------------------------------
     0-c. お土産メモの見出し（ゲストの言語で出す）
  --------------------------------------------------------- */
  const GIFT_DOC = {
    en:    { title:'🎁 Tour memo', date:'Date', lang:'Language', duration:'Duration', summaryHead:'What we talked about', qHead:'Your questions', thanks:'Thank you for joining the tour!', min:'min', noTalk:'(No conversation was recorded)' },
    'zh-CN':{ title:'🎁 参观小结', date:'日期', lang:'语言', duration:'时长', summaryHead:'今天的要点', qHead:'你的提问', thanks:'感谢参加本次参观！', min:'分钟', noTalk:'（本次没有记录到对话）' },
    'zh-TW':{ title:'🎁 參觀小結', date:'日期', lang:'語言', duration:'時長', summaryHead:'今天的重點', qHead:'你的提問', thanks:'感謝參加本次參觀！', min:'分鐘', noTalk:'（本次沒有記錄到對話）' },
    ko:    { title:'🎁 투어 메모', date:'일시', lang:'언어', duration:'소요 시간', summaryHead:'오늘의 정리', qHead:'질문', thanks:'투어에 참가해 주셔서 감사합니다!', min:'분', noTalk:'(기록된 대화가 없습니다)' },
    es:    { title:'🎁 Resumen del tour', date:'Fecha', lang:'Idioma', duration:'Duración', summaryHead:'Lo que vimos', qHead:'Tus preguntas', thanks:'¡Gracias por participar!', min:'min', noTalk:'(No se grabó ninguna conversación)' },
    fr:    { title:'🎁 Mémo du tour', date:'Date', lang:'Langue', duration:'Durée', summaryHead:'Ce dont nous avons parlé', qHead:'Vos questions', thanks:'Merci de votre participation !', min:'min', noTalk:'(Aucune conversation enregistrée)' },
    de:    { title:'🎁 Tour-Notiz', date:'Datum', lang:'Sprache', duration:'Dauer', summaryHead:'Das haben wir besprochen', qHead:'Ihre Fragen', thanks:'Danke für Ihre Teilnahme!', min:'Min.', noTalk:'(Kein Gespräch aufgezeichnet)' },
    pt:    { title:'🎁 Resumo do tour', date:'Data', lang:'Idioma', duration:'Duração', summaryHead:'O que falamos', qHead:'Suas perguntas', thanks:'Obrigado por participar!', min:'min', noTalk:'(Nenhuma conversa registrada)' },
    it:    { title:'🎁 Promemoria del tour', date:'Data', lang:'Lingua', duration:'Durata', summaryHead:'Di cosa abbiamo parlato', qHead:'Le tue domande', thanks:'Grazie per aver partecipato!', min:'min', noTalk:'(Nessuna conversazione registrata)' },
    th:    { title:'🎁 สรุปทัวร์', date:'วันที่', lang:'ภาษา', duration:'ระยะเวลา', summaryHead:'สิ่งที่เราเล่าในวันนี้', qHead:'คำถามของคุณ', thanks:'ขอบคุณที่ร่วมทริป!', min:'นาที', noTalk:'(ยังไม่มีการบันทึกบทสนทนา)' },
    vi:    { title:'🎁 Ghi chú tour', date:'Ngày', lang:'Ngôn ngữ', duration:'Thời lượng', summaryHead:'Nội dung chính', qHead:'Câu hỏi của bạn', thanks:'Cảm ơn bạn đã tham gia!', min:'phút', noTalk:'(Chưa ghi lại cuộc trò chuyện)' },
    id:    { title:'🎁 Catatan tur', date:'Tanggal', lang:'Bahasa', duration:'Durasi', summaryHead:'Ringkasan', qHead:'Pertanyaan Anda', thanks:'Terima kasih telah ikut!', min:'menit', noTalk:'(Belum ada percakapan yang tercatat)' }
  };

  const DEFAULTS = {
    // guide
    engine: 'trial',                    // trial | openai | gemini
    openaiKey: '',
    openaiModel: 'gpt-6-luna',
    geminiKey: '',
    geminiModel: 'gemini-3.5-flash-lite',
    asr: 'webspeech',                   // webspeech | transcribe
    transcribeModel: 'gpt-transcribe',
    chunkSec: 6,
    flushMs: 750,                       // 息継ぎ（無音）で確定するまでの待ち
    maxChars: 20,                       // この文字数を超えたら区切って確定
    prefetch: true,                     // 先行翻訳モード（低遅延）
    interimMs: 380,                     // 途中文字を送る間隔（300〜450ms）
    glossary: [],                       // [{ja, tr}]
    previewLangs: ['en', 'zh-CN', 'ko'],
    peerHost: '',
    peerPort: '',
    peerPath: '',
    iceExtra: '',
    giftUrl: '',                        // お土産メール送信URL（GAS / Webhook）
    // participant
    myLang: '',
    pDisplay: 'both',                   // both | translation | original
    pFont: 1,
    pTts: true,
    pRate: 1,                           // 読み上げ速度（1 / 1.15 / 1.3）
    qSpeak: true,                       // ゲストの質問の日本語訳を読み上げる（v9：既定ON）
    qSpeakUserSet: false                // 本人がトグルを触ったか（触っていなければ既定ONに戻す）
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n)));
  // 表記ゆれ（空白・句読点・大小文字）を落として比べる
  const norm = (s) => String(s == null ? '' : s)
    .replace(/[\s\u3000]+/g, '')
    .replace(/[。．.、，,！!？?…‥「」『』（）()\[\]【】\-ー~〜]/g, '')
    .toLowerCase();
  const timeLabel = (ts) => {
    const d = new Date(ts || Date.now());
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  // 端末の言語から12言語のどれかを推測する（言語選択画面の文言を最初から相手の言語に近づけるため）
  function guessLang() {
    let list = [];
    try { list = [].concat(navigator.languages || [], navigator.language || []); } catch (e) { list = []; }
    for (const raw of list) {
      const tag = String(raw || '').toLowerCase().replace('_', '-');
      if (!tag) continue;
      if (/^zh-(tw|hk|mo|hant)/.test(tag)) return 'zh-TW';
      if (/^zh/.test(tag)) return 'zh-CN';
      const base = tag.split('-')[0];
      const hit = LANGS.find(L => L.code.toLowerCase() === tag || L.code.toLowerCase() === base);
      if (hit) return hit.code;
    }
    return '';
  }

  // iPhone / iPad かどうか（消音スイッチの一言を出すときだけ使う）
  const IS_IOS = (() => {
    try {
      const ua = String(navigator.userAgent || '');
      return /iPhone|iPad|iPod/i.test(ua) ||
             (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1);   // iPadOS 13+
    } catch (e) { return false; }
  })();

  // 開発時の確認用（画面には出さない）
  window.__qriErrors = [];
  window.addEventListener('error', (e) => window.__qriErrors.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => {
    window.__qriErrors.push('rejection: ' + String((e.reason && e.reason.message) || e.reason));
  });

  /* ---------------------------------------------------------
     1. 設定の保存と読み込み
  --------------------------------------------------------- */
  let S = loadSettings();

  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      const merged = Object.assign({}, DEFAULTS, raw || {});
      if (!Array.isArray(merged.glossary)) merged.glossary = [];
      if (!Array.isArray(merged.previewLangs) || !merged.previewLangs.length) {
        merged.previewLangs = DEFAULTS.previewLangs.slice();
      }
      // v9：質問の読み上げは既定ON。旧版の「既定OFF」で保存された値には引きずられない。
      // 本人がトグルを押した記録（qSpeakUserSet）があるときだけ保存値に従う。
      if (!merged.qSpeakUserSet) merged.qSpeak = true;
      return merged;
    } catch (e) {
      return Object.assign({}, DEFAULTS, { previewLangs: DEFAULTS.previewLangs.slice() });
    }
  }

  function saveSettings() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* 容量不足などは無視 */ }
    updateEnginePill();
    updateAsrLabel();
    updateLatencyUI();
    updateQSpeak();
  }

  /* ---------------------------------------------------------
     2. アプリ全体の状態
  --------------------------------------------------------- */
  const A = {
    role: 'guide',
    room: null,
    // guide
    peer: null,
    conns: new Map(),     // key -> {id, conn, lang, joined}
    connSeq: 0,
    seq: 0,
    history: [],
    lastSent: '',
    lastSentAt: 0,
    listening: false,
    micStarting: false,
    rec: null,
    micStream: null,
    transcribeOn: false,
    finalBuf: '',
    finalTimer: null,
    lastEngineErrorAt: 0,
    // 途中文字（interim）の配信
    interimText: '',      // ライブ行に出す「まだ訳していない残り」
    interimRaw: '',       // ブラウザが返している未確定テキスト全体
    interimTimer: null,
    interimSentAt: 0,
    lastInterimSent: '',
    // 話し続け対応：interim からの強制確定
    committedPrefix: '',  // この認識結果のうち、すでに強制確定して訳した先頭部分
    chunkTimer: null,     // 息継ぎで強制確定するタイマー
    afterCommit: false,   // 強制確定の直後（残り末尾の拾い上げ用）
    // 先行翻訳（確定前に訳を作っておく）
    pre: { text: '', at: 0, tr: {} },
    preTimer: null,
    preSeq: 0,
    // 直前の確定文（途中文字→確定の二重表示よけ）
    recentPublished: [],
    // ゲストからの質問（双方向）
    qOpen: true,
    qSeq: 0,
    questions: [],
    qLive: null,          // まだ確定していないゲストの質問（リアルタイム表示用）
    qSpeak: true,         // ゲストの質問の日本語訳を読み上げる（既定ON）
    // お土産（会話終了時の1回だけ作る）
    guideStartedAt: 0,
    tourEnded: false,
    giftPreview: null
  };

  const P = {
    peer: null,
    peerTrying: false,
    conn: null,
    retry: 0,
    retryTimer: null,
    joined: false,
    seen: new Set(),
    lastCaptionAt: 0,
    // 質問（双方向・フローティングマイク）
    qOpen: true,
    qRec: null,
    qGen: 0,              // 質問マイクの世代（古いインスタンスのコールバックを無効化する）
    qQid: '',             // いま喋っている質問のID（途中経過と確定を同じIDで送る）
    qText: '',
    qSent: false,
    qListening: false,
    qErr: null,           // 直近のマイクエラー（理由表示を micHint で上書きしないため）
    qCloseTimer: null,
    qInterimLast: '',
    qInterimSentAt: 0,
    qInterimTimer: null,
    qStartedAt: 0,
    qRestarts: 0,
    // 字幕の自動追従
    pinnedUp: false,      // 過去を読み返している（自動追従を一時停止）
    rafId: 0,
    // 表示文言（言語切替で描き直すために保持する）
    status: null,         // { kind, key }
    waitKey: '',
    // お土産（終了時に受け取る）
    gift: null,           // { summary, lang, url, ts }
    giftSent: false
  };

  // 画面の消灯防止：Wake Lockが使えない端末（iPhone Safari等）用の無音・極小動画
  const AWAKE = {
    video: null, stream: null, playing: false, needed: false, gesture: false
  };

  const VOICE = {
    unlocked: false, speaking: false, queue: [], voices: [],
    wake: null,        // Screen Wake Lock
    watchdog: null,    // Android Chrome の無音停止対策
    canceledAt: 0,     // cancel() した時刻（直後の speak を 50ms 遅らせる）
    spokeAt: 0,        // 発話を始めた時刻（スタック検出用）
    guard: null,       // onend が来ないときの保険タイマー
    diagTimer: null    // 発話が始まらない時の案内タイマー
  };

  /* ---------------------------------------------------------
     3. 起動
  --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', boot);

  let booted = false;
  function boot() {
    if (booted) return;   // 二重起動よけ（スクリプトが二度読み込まれた場合）
    booted = true;
    buildLangGrid('#langGrid', pickMyLang);
    buildLangGrid('#pLangGrid', pickMyLang);
    bindUI();
    updateEnginePill();
    updateAsrLabel();
    updateLatencyUI();
    applyParticipantLook();
    applyGuestText();
    updateQSpeak();

    if ('speechSynthesis' in window) {
      refreshVoices();
      window.speechSynthesis.onvoiceschanged = refreshVoices;
      startVoiceWatchdog();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        if (AWAKE.needed) startNoSleepVideo();
      } else {
        releaseWakeLock();
      }
    });
    // 最初のタップで、消灯防止のフォールバック（iOS）とガイド側TTSを準備する
    ['pointerdown', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, onUserGesture, { capture: true, passive: true }));
    window.addEventListener('pagehide', releaseWakeLock);

    // ガイドもゲストも、画面を開いている間は消灯させない（v9）
    requestWakeLock();

    const params = new URLSearchParams(location.search);
    const room = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (room) {
      startParticipant(room, params.get('lang') || '');
    } else {
      startGuide();
    }
  }

  /* ---------------------------------------------------------
     4. 外部ライブラリ（vendor が無い場合はCDNから取得）
  --------------------------------------------------------- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  let libsPromise = null;
  function ensureLibs() {
    if (libsPromise) return libsPromise;
    libsPromise = (async () => {
      if (typeof window.Peer === 'undefined') {
        try { await loadScript('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'); }
        catch (e) { console.warn('[libs] peerjs CDN 失敗', e); }
      }
      if (typeof window.qrcode === 'undefined') {
        try { await loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'); }
        catch (e) { console.warn('[libs] qrcode CDN 失敗', e); }
      }
    })();
    return libsPromise;
  }

  /* ---------------------------------------------------------
     5. 共通：PeerJS 設定
  --------------------------------------------------------- */
  function peerIdFor(room) {
    return 'qri-' + String(room).toLowerCase();
  }

  function randomRoom() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    const buf = new Uint32Array(6);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 6; i++) buf[i] = Math.floor(Math.random() * 1e9);
    for (let i = 0; i < 6; i++) out += chars[buf[i] % chars.length];
    return out;
  }

  function iceServers() {
    const base = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      // 無料の公開TURN（ベストエフォート）。本番イベントでは自前のTURNを推奨。
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ];
    const extra = String(S.iceExtra || '').trim();
    if (extra) {
      try {
        const parsed = JSON.parse(extra);
        if (Array.isArray(parsed)) return base.concat(parsed);
      } catch (e) { console.warn('[ice] JSONを解釈できません', e); }
    }
    return base;
  }

  function peerOptions() {
    const opts = { debug: 0, config: { iceServers: iceServers() } };
    const host = String(S.peerHost || '').trim();
    if (host) {
      opts.host = host;
      opts.port = Number(S.peerPort) || 443;
      opts.path = String(S.peerPath || '/').trim() || '/';
      opts.secure = true;
    }
    return opts;
  }

  function joinUrl(room) {
    const r = room || A.room;
    if (location.protocol === 'file:') return 'file://' + location.pathname + '?room=' + r;
    return location.origin + location.pathname + '?room=' + r;
  }

  /* ---------------------------------------------------------
     6. ガイド（配信）モード
  --------------------------------------------------------- */
  function startGuide() {
    A.role = 'guide';
    A.room = randomRoom();
    A.guideStartedAt = Date.now();
    $('#viewGuide').classList.remove('hidden');
    $('#viewParticipant').classList.add('hidden');
    $('#roomCode').textContent = A.room;
    $('#linkParticipant').href = joinUrl();
    document.title = 'QR同時通訳 | ROOM ' + A.room;
    setGuideStatus('', '未開始');
    renderParticipants();
    renderQuestions();
    setQOpen(A.qOpen, true);
  }

  function setGuideStatus(kind, text) {
    const dot = $('#statusDot');
    dot.className = 'dot' + (kind ? ' ' + kind : '');
    $('#statusText').textContent = text;
  }

  async function onStartHosting() {
    if (A.peer) return;
    const btn = $('#btnStart');
    btn.disabled = true;
    btn.textContent = '接続しています…';
    setGuideStatus('wait', 'サーバーに接続中…');

    await ensureLibs();
    if (typeof window.Peer === 'undefined') {
      btn.disabled = false;
      btn.textContent = '配信を開始（QRを表示）';
      setGuideStatus('err', '接続できません');
      toast('通信ライブラリを読み込めませんでした。ネットワークを確認してください');
      return;
    }

    try {
      await createHostPeer();
    } catch (err) {
      console.warn('[host] 接続失敗', err);
      btn.disabled = false;
      btn.textContent = '配信を開始（QRを表示）';
      setGuideStatus('err', '接続できません');
      toast('PeerJSサーバーに接続できませんでした。時間をおいて、もう一度お試しください');
      return;
    }

    drawQR();
    $('#qrPlaceholder').classList.add('hidden');
    $('#qrBox').classList.remove('hidden');
    $('#qrHint').classList.remove('hidden');
    $('#joinRow').classList.remove('hidden');
    $('#joinUrl').value = joinUrl();
    btn.classList.add('hidden');
    setGuideStatus('wait', '参加者を待っています');
    $('#linkParticipant').href = joinUrl();
  }

  async function createHostPeer() {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        A.peer = await newPeer(peerIdFor(A.room));
        break;
      } catch (err) {
        if (err && err.type === 'unavailable-id') {
          // 同じ部屋コードが先に使われていた → コードを引き直す
          A.room = randomRoom();
          $('#roomCode').textContent = A.room;
          continue;
        }
        throw err;
      }
    }
    if (!A.peer) throw new Error('peer-unavailable-id');
    bindHostPeer(A.peer);
  }

  function newPeer(id) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const peer = new Peer(id, peerOptions());
      peer.on('open', () => { settled = true; resolve(peer); });
      peer.on('error', (err) => {
        if (!settled) {
          settled = true;
          try { peer.destroy(); } catch (e) {}
          reject(err);
        }
      });
    });
  }

  function bindHostPeer(peer) {
    peer.on('connection', (conn) => {
      const key = conn.peer + '#' + (++A.connSeq);
      // 接続要求が来ただけでは「参加者」に数えない。ラベル open 待ち。
      const rec = { id: A.connSeq, key, conn, lang: null, joined: Date.now(), open: false };
      A.conns.set(key, rec);

      conn.on('open', () => {
        // 回線が開通してから「接続中の参加者」としてカウント・一覧表示する
        rec.open = true;
        rec.openedAt = Date.now();
        renderParticipants();
        setGuideStatus('live', '配信中');
        sendTo(rec, { t: 'init', room: A.room, ts: Date.now(), qOpen: !!A.qOpen });
      });
      conn.on('data', (data) => onGuestData(rec, data));
      conn.on('close', () => {
        A.conns.delete(key);
        renderParticipants();
        if (!openConns().length && A.peer) setGuideStatus('wait', '参加者を待っています');
      });
      conn.on('error', (e) => console.warn('[conn]', e && e.type));
    });

    peer.on('disconnected', () => {
      setGuideStatus('wait', '再接続しています…');
      try { peer.reconnect(); } catch (e) {}
    });

    peer.on('error', (err) => {
      const type = err && err.type;
      if (type === 'peer-unavailable') return;
      if (type === 'network' || type === 'server-error' || type === 'socket-error') {
        setGuideStatus('wait', '通信エラー（自動再接続）');
        try { peer.reconnect(); } catch (e) {}
      }
      console.warn('[peer]', type, err && err.message);
    });
  }

  function openConns() {
    return Array.from(A.conns.values()).filter(r => r.open && r.conn && r.conn.open);
  }

  function onGuestData(rec, msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello':
        rec.lang = normalizeLang(msg.lang);
        renderParticipants();
        sendHistory(rec);
        // その言語の訳がまだ無い過去字幕があれば、直近分だけ訳して送る
        if (A.history.length && !A.history[A.history.length - 1].tr[rec.lang]) refreshRecent(rec.lang, rec);
        break;
      case 'lang':
        rec.lang = normalizeLang(msg.lang);
        renderParticipants();
        if (msg.refresh) refreshRecent(rec.lang, rec);
        break;
      case 'ping':
        sendTo(rec, { t: 'pong', ts: Date.now() });
        break;
      case 'question':
        onGuestQuestion(rec, msg);
        break;
      case 'qinterim':
        onGuestQuestionInterim(rec, msg);
        break;
      case 'qend':
        // ゲスト側で「結局なにも聞こえず送らない」だったときの後始末
        if (A.qLive && String(A.qLive.id) === String(msg.id || '')) { A.qLive = null; renderQuestions(); }
        break;
    }
  }

  function normalizeLang(code) {
    return LANG_MAP[code] ? code : 'en';
  }

  function sendTo(rec, obj) {
    try {
      if (rec.conn && rec.conn.open) rec.conn.send(obj);
    } catch (e) { console.warn('[send]', e && e.message); }
  }

  function broadcast(obj) {
    for (const rec of A.conns.values()) sendTo(rec, obj);
  }

  function sendHistory(rec) {
    const lang = rec.lang || '';
    const recent = A.history.slice(-12);
    const items = recent.filter(item => !!(lang && item.tr[lang])).map(item => ({
      id: item.id,
      ja: item.ja,
      ts: item.ts,
      tr: rec.lang && item.tr[rec.lang] ? { [rec.lang]: item.tr[rec.lang] } : {}
    }));
    if (items.length) sendTo(rec, { t: 'history', items });
  }

  function renderParticipants() {
    const list = openConns();
    $('#peerCount').textContent = String(list.length);

    const counts = new Map();
    list.forEach(r => {
      const k = r.lang || '?';
      counts.set(k, (counts.get(k) || 0) + 1);
    });

    const box = $('#participants');
    if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = Array.from(counts.entries()).map(([code, n]) => {
      const L = LANG_MAP[code];
      return '<span class="pchip">' + (L ? L.flag : '❔') + ' ' + (L ? esc(L.ja) : '言語未選択') + ' <b>' + n + '</b></span>';
    }).join('');
  }

  /* ---------------- QRコード ---------------- */
  function drawQR() {
    const box = $('#qrBox');
    if (location.protocol === 'file:') {
      box.innerHTML = '<p class="qr-warn">HTTPSで公開するとQRが使えます<br>（Netlify Drop などにフォルダをアップ）</p>';
      return;
    }
    const url = joinUrl();
    try {
      if (typeof window.qrcode === 'undefined') throw new Error('qrcode 未読込');
      const qr = window.qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 12, scalable: true, alt: '参加用QRコード' });
    } catch (e) {
      console.warn('[qr] 生成失敗', e);
      box.innerHTML = '<p class="qr-warn">QRを生成できませんでした<br>' + esc(url) + '</p>';
    }
  }

  /* ---------------- 字幕の配信 ---------------- */
  function rememberPublished(ja, at) {
    A.recentPublished.push({ n: norm(ja), at });
    if (A.recentPublished.length > 12) A.recentPublished.shift();
  }

  // 途中文字を確定として出した直後に、同じ文が確定結果として来る場合の二重表示よけ
  function isRecentDuplicate(ja) {
    const now = Date.now();
    A.recentPublished = A.recentPublished.filter(r => now - r.at < 5000);
    const n = norm(ja);
    if (!n) return true;
    for (const r of A.recentPublished) {
      if (r.n === n) return true;
      if (n.length >= 6 && r.n.startsWith(n)) return true;
    }
    return false;
  }

  async function publishCaption(rawJa) {
    const ja = String(rawJa || '').trim();
    if (!ja) return;
    if (isRecentDuplicate(ja)) return;
    const t = Date.now();
    rememberPublished(ja, t);

    // 途中表示とそのタイマーを片付ける（確定文が来たら役目は終わり）
    A.interimText = '';
    A.lastInterimSent = '';
    if (A.interimTimer) { clearTimeout(A.interimTimer); A.interimTimer = null; }
    if (A.preTimer) { clearTimeout(A.preTimer); A.preTimer = null; }
    const im = $('#interim');
    if (im) im.textContent = '';

    const item = { id: 'c' + (++A.seq), ja, tr: {}, ts: t };
    A.history.push(item);
    if (A.history.length > 60) A.history.shift();

    addGuideEntry(item);
    broadcast({ t: 'cap', id: item.id, ja: item.ja, ts: item.ts });

    const langs = targetLangs();
    const cached = {};
    const todo = [];
    for (const lang of langs) {
      const pre = takePrefetch(ja, lang);
      if (pre) {
        // 先行翻訳が当たっていれば、確定した瞬間に訳を出す（待ち時間ほぼゼロ）
        item.tr[lang] = pre;
        cached[lang] = pre;
        if (pre.provisional) todo.push(lang);   // 途中までの訳 → 後で差し替え
      } else {
        todo.push(lang);
      }
    }
    if (Object.keys(cached).length) {
      syncGuideEntry(item);
      broadcast({ t: 'tr', id: item.id, tr: cached });
    }

    await Promise.all(todo.map(async (lang) => {
      const res = await translateOne(ja, lang);
      item.tr[lang] = res;
      syncGuideEntry(item);
      broadcast({ t: 'tr', id: item.id, tr: { [lang]: res } });
    }));
  }

  /* ---------------- 先行翻訳（低遅延） ---------------- */
  // 途中文字が確定文と一致（またはその先頭部分）なら、作っておいた訳を使う
  function takePrefetch(text, lang) {
    const cur = norm(text);
    const hit = A.pre && A.pre.tr && A.pre.tr[lang];
    if (!cur || !hit || !hit.text) return null;
    const base = norm(A.pre.text);
    if (!base) return null;
    const out = {
      text: hit.text, engine: hit.engine, engineName: hit.engineName,
      degraded: !!hit.degraded, prefetched: true
    };
    if (base === cur) return out;
    if (base.length >= 6 && cur.startsWith(base) && base.length / cur.length >= 0.6) {
      out.provisional = true;
      return out;
    }
    return null;
  }

  // 途中文字の表示用（完全一致のときだけ、ちらつかないよう訳を添える）
  function preCacheFor(text, lang) {
    const cur = norm(text);
    const hit = A.pre && A.pre.tr && A.pre.tr[lang];
    if (!cur || !hit || !hit.text) return null;
    if (norm(A.pre.text) !== cur) return null;
    return { text: hit.text, prefetched: true };
  }

  function maybePrefetch(text, immediate) {
    if (!S.prefetch) return;
    if (A.preTimer) { clearTimeout(A.preTimer); A.preTimer = null; }
    const t = String(text || '').trim();
    if (t.length < (S.engine === 'trial' ? 8 : 4)) return;
    const minGap = S.engine === 'trial' ? 350 : 250;   // 連続で叩きすぎない（高速化: 1200→350）
    const wait = immediate ? 0 : Math.max(250, minGap - (Date.now() - (A.pre.at || 0)));
    A.preTimer = setTimeout(() => { A.preTimer = null; runPrefetch(); }, wait);
  }

  async function runPrefetch() {
    if (!S.prefetch) return;
    const t = String(A.interimText || '').trim();
    if (!t) return;
    if (norm(t) === norm(A.pre.text) && A.pre.tr && Object.keys(A.pre.tr).length) return;
    // 聞いている人がいる言語だけ。誰もいない間に無料APIを叩かない
    const langs = Array.from(new Set(openConns().map(r => r.lang).filter(Boolean)));
    if (!langs.length) return;
    const seq = ++A.preSeq;
    const results = {};
    await Promise.all(langs.map(async (lang) => {
      try { results[lang] = await translateOne(t, lang, { quiet: true }); }
      catch (e) { /* 先行翻訳の失敗は黙って捨てる */ }
    }));
    if (seq !== A.preSeq) return;    // もっと新しい先行翻訳が走っている
    A.pre = { text: t, at: Date.now(), tr: results };
    // まだ話している途中なら、できた訳をすぐ参加者へ（確定を待たない）
    if (A.interimText === t && Object.keys(results).length) sendInterim(true);
  }

  function targetLangs() {
    const set = new Set();
    for (const rec of openConns()) if (rec.lang) set.add(rec.lang);
    if (!set.size) (S.previewLangs || []).forEach(l => { if (LANG_MAP[l]) set.add(l); });
    return Array.from(set);
  }

  function addGuideEntry(item) {
    const log = $('#guideLog');
    const empty = log.querySelector('.empty');
    if (empty) empty.remove();

    const el = document.createElement('article');
    el.className = 'g-entry';
    el.dataset.id = item.id;
    el.innerHTML =
      '<div class="g-head"><span class="g-time">' + timeLabel(item.ts) + '</span>' +
      '<span>日本語 →</span></div>' +
      '<p class="g-ja">' + esc(item.ja) + '</p>' +
      '<div class="g-tr" data-tr></div>';
    log.prepend(el);
    syncGuideEntry(item);

    const count = A.history.length;
    $('#liveCount').textContent = count + '件';
    while (log.children.length > 60) log.removeChild(log.lastElementChild);
  }

  // 先行翻訳の「途中経過」表示（ガイド画面上）
  function syncGuideEntry(item) {
    const el = document.querySelector('.g-entry[data-id="' + item.id + '"]');
    if (!el) return;
    const box = el.querySelector('[data-tr]');
    if (!box) return;

    const langs = Array.from(new Set([...Object.keys(item.tr), ...targetLangs()]));
    box.innerHTML = langs.map(code => {
      const L = LANG_MAP[code];
      if (!L) return '';
      const r = item.tr[code];
      const cls = r ? (r.degraded ? 'g-text degraded' : 'g-text') : 'g-text pending';
      const text = r ? esc(r.text) : '翻訳中…';
      const tag = r && r.degraded ? '<span class="tag">簡易</span>'
                : r && r.prefetched ? '<span class="tag fly">先行</span>' : '';
      return '<div class="g-row"><span class="g-flag">' + L.flag + '</span>' +
             '<span class="g-lang">' + esc(L.ja) + '</span>' +
             '<span class="' + cls + '">' + text + tag + '</span></div>';
    }).join('');
  }

  /* ---------------- ゲストからの質問（双方向） ---------------- */
  function setQOpen(on, silent) {
    A.qOpen = !!on;
    if (!A.qOpen) A.qLive = null;
    const cb = $('#qToggle');
    if (cb) cb.checked = A.qOpen;
    const lab = $('#qToggleLabel');
    if (lab) lab.textContent = A.qOpen ? '受付 ON' : '受付 OFF';
    const card = $('#qCard');
    if (card) card.classList.toggle('off', !A.qOpen);
    if (!silent) broadcast({ t: 'qopen', open: A.qOpen });
  }

  function renderQuestions() {
    const box = $('#qList');
    if (!box) return;
    const badge = $('#qCount');
    if (badge) badge.textContent = String(A.questions.length);
    const rows = [];
    if (A.qLive) rows.push(questionItemHtml(liveQuestion()));
    A.questions.slice().reverse().forEach(q => rows.push(questionItemHtml(q)));
    if (!rows.length) {
      box.innerHTML = '<p class="empty">まだ質問はありません。ゲストの画面右下の「🎙️ 質問」から届きます。</p>';
      return;
    }
    box.innerHTML = rows.join('');
  }

  // 未確定の質問を、確定した質問と同じ形にそろえて描く
  function liveQuestion() {
    const l = A.qLive;
    if (!l) return null;
    return {
      id: l.id,
      lang: l.lang,
      text: l.text,
      ts: l.ts,
      live: true,
      state: l.ja ? 'done' : 'pending',
      tr: l.ja ? { text: l.ja, degraded: !!l.degraded } : null
    };
  }

  function questionItemHtml(q) {
    if (!q) return '';
    const L = LANG_MAP[q.lang] || LANG_MAP.en;
    const hasTr = !!(q.tr && q.tr.text);
    let ja, cls;
    if (hasTr) {
      ja = esc(q.tr.text);
      cls = 'q-ja' + (q.tr.degraded ? ' degraded' : '');
    } else if (q.state === 'error' || (q.tr && q.tr.failed)) {
      ja = '日本語に訳せませんでした（原文を確認してください）';
      cls = 'q-ja degraded';
    } else {
      ja = '翻訳中…';
      cls = 'q-ja pending';
    }
    const label = hasTr ? '<span class="q-ja-label">🇯🇵 日本語訳</span>' : '';
    const liveTag = q.live ? '<span class="q-live-tag">● 話しています（途中）</span>' : '';
    return '<article class="q-item' + (q.live ? ' q-item-live' : '') + '" data-id="' + esc(q.id) + '">' +
      '<div class="q-head"><span class="q-lang">' + L.flag + ' ' + esc(L.ja) + '</span>' + liveTag +
      '<span class="q-time">' + timeLabel(q.ts) + '</span>' +
      '<button class="q-done" type="button" data-id="' + esc(q.id) + '">✓ 済</button></div>' +
      '<p class="q-text"><span class="q-src-label">原文</span>' + esc(q.text) + '</p>' +
      '<p class="' + cls + '">' + label + ja + '</p>' +
    '</article>';
  }

  // ゲストが話している途中の質問。日本語訳もその場で（速いGoogle公開エンドポイント優先）作る
  let qLiveTimer = null;
  let qLiveSeq = 0;

  function onGuestQuestionInterim(rec, msg) {
    if (!A.qOpen) return;
    const text = String((msg && msg.text) || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const id = String((msg && msg.id) || '');
    if (!text || !id) return;
    rec.lang = normalizeLang((msg && msg.lang) || rec.lang);
    if (!A.qLive || A.qLive.id !== id) {
      A.qLive = { id, lang: rec.lang, text, ts: Date.now(), ja: '', trFor: '' };
    } else {
      A.qLive.text = text;
      A.qLive.lang = rec.lang;
    }
    renderQuestions();
    scheduleQLiveTranslate();
  }

  // 途中の質問の日本語訳。連続でAPIを叩かず、最後の1件だけを訳す（低遅延のまま）
  function scheduleQLiveTranslate() {
    const live = A.qLive;
    if (!live) return;
    if (qLiveTimer) { clearTimeout(qLiveTimer); qLiveTimer = null; }
    const id = live.id;
    qLiveTimer = setTimeout(() => {
      qLiveTimer = null;
      const cur = A.qLive;
      if (!cur || cur.id !== id) return;
      const text = cur.text;
      if (!text || text.length < 2) return;
      if (cur.trFor === text) return;
      const seq = ++qLiveSeq;
      translateToJa(text, cur.lang, { quiet: true, fast: true }).then(res => {
        if (seq !== qLiveSeq) return;
        const now = A.qLive;
        if (!now || now.id !== id || now.text !== text) return;   // もっと新しい途中文字が来ている
        now.trFor = text;
        if (res && res.text) {
          now.ja = res.text;
          now.degraded = !!res.degraded;
        }
        renderQuestions();
      }).catch(() => {});
    }, 180);
  }

  function onGuestQuestion(rec, msg) {
    const text = String((msg && msg.text) || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!text) return;
    if (!A.qOpen) {
      // 受付OFF中は受け取らず、状態を送り直してゲスト側の入力を止める
      sendTo(rec, { t: 'qopen', open: false });
      return;
    }
    const now = Date.now();
    if (rec.lastQAt && now - rec.lastQAt < 1200) return;   // 連打よけ
    rec.lastQAt = now;
    rec.lang = normalizeLang((msg && msg.lang) || rec.lang);

    const id = 'q' + (++A.qSeq);
    const guestId = String((msg && msg.id) || '');
    // 途中表示していた同じ質問は、確定した本行に置き換える
    if (A.qLive) A.qLive = null;
    const item = { id, guestId, lang: rec.lang, text, tr: null, state: 'pending', ts: now };
    A.questions.push(item);
    if (A.questions.length > 30) A.questions.shift();
    renderQuestions();
    sendTo(rec, { t: 'qack', id: item.guestId });
    if (navigator.vibrate) { try { navigator.vibrate([28, 40, 28]); } catch (e) {} }

    // ガイドが設定している翻訳エンジンより先に、速いGoogle公開エンドポイントで日本語にする
    translateToJa(text, item.lang, { quiet: false, fast: true }).then(res => {
      item.tr = res;
      item.state = (res && (res.failed || !res.text)) ? 'error' : 'done';
      renderQuestions();
      // ゲストの質問を日本語で読み上げる（v9：既定ON）
      if (S.qSpeak && res && res.text) guideSpeak(res.text);
    }).catch(() => {
      item.state = 'error';
      renderQuestions();
    });
  }

  // 言語を変えた参加者に、直近の数件をその言語で送り直す
  async function refreshRecent(lang, targetRec) {
    const recent = A.history.slice(-3);
    for (const item of recent) {
      if (!item.tr[lang]) {
        const res = await translateOne(item.ja, lang);
        item.tr[lang] = res;
        syncGuideEntry(item);
      }
      const rec = targetRec || Array.from(A.conns.values()).find(r => r.lang === lang);
      if (rec) sendTo(rec, { t: 'history', items: [{ id: item.id, ja: item.ja, ts: item.ts, tr: { [lang]: item.tr[lang] } }] });
    }
  }

  /* ---------------------------------------------------------
     6-b. お土産（会話終了 → 要約テキスト＋メール受け取り）
     通訳中は何もしない。終了のときに一度だけ作る（リアルタイム処理に負荷をかけない）
  --------------------------------------------------------- */
  const pad2 = (n) => String(n).padStart(2, '0');

  function dtLabel(ts) {
    const d = new Date(ts || Date.now());
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
           ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function giftDocFor(lang) { return GIFT_DOC[lang] || GIFT_DOC.en; }

  // 見出しの囲みは言語で変える（日本語は【】、それ以外は ■）
  function giftHead(lang, text) {
    return lang === 'ja' ? '【' + text + '】' : '■ ' + text;
  }

  // 翻訳済みの字幕から、その言語の「会話の流れ」を作る（AIキーなし／AI失敗時の見やすい整理）
  function localGiftBullets(lang) {
    const out = [];
    const seen = new Set();
    for (const h of A.history) {
      const tr = h && h.tr && h.tr[lang];
      const text = tr && tr.text ? String(tr.text).replace(/\s+/g, ' ').trim() : '';
      if (!text) continue;
      if (/翻訳エンジンに接続できません/.test(text)) continue;
      const n = norm(text);
      if (n.length < 4) continue;                        // 「はい」「OK」だけの行は省く
      const head = n.slice(0, 14);
      if (seen.has(head)) continue;                      // 同じ話の繰り返しをまとめる
      seen.add(head);
      out.push({ ts: h.ts, text });
    }
    return out.slice(-18).map(r => '・[' + timeLabel(r.ts) + '] ' + r.text);
  }

  // AIで簡潔な要点を作る（APIキーがあるときだけ・終了時の1回だけ）
  async function aiGiftBullets(lang) {
    const useOpenAI = S.engine === 'openai' && String(S.openaiKey || '').trim();
    const useGemini = S.engine === 'gemini' && String(S.geminiKey || '').trim();
    if (!useOpenAI && !useGemini) return null;
    const L = LANG_MAP[lang] || LANG_MAP.en;
    const lines = [];
    for (const h of A.history.slice(-40)) {
      const tr = h && h.tr && h.tr[lang];
      const text = tr && tr.text ? String(tr.text).replace(/\s+/g, ' ').trim() : '';
      if (text) lines.push('- ' + text);
    }
    if (lines.length < 3) return null;
    const qs = A.questions.filter(q => q && q.text && q.lang === lang).slice(-8)
      .map(q => '- ' + String(q.text).replace(/\s+/g, ' ').trim());
    const system = [
      'あなたは観光ガイドのアシスタントです。以下は日本語のガイドと参加者の会話の記録です（' + L.native + 'の訳つき）。',
      '参加者があとで読み返して嬉しい「お土産メモ」の要点を、' + L.native + 'で書いてください。',
      '箇条書き3〜6個。1個は40文字以内。前置き・見出し・締めの言葉は書かない。',
      '内容は記録にある事実だけ。数字・人名・地名は正確に。'
    ].join('\n');
    const user = '【会話の記録】\n' + lines.join('\n') + (qs.length ? '\n\n【参加者の質問】\n' + qs.join('\n') : '');
    let out = '';
    try {
      out = useOpenAI ? await openaiChat(system, user) : await geminiChat(system, user);
    } catch (e) {
      noteEngineError(useOpenAI ? 'OpenAI' : 'Gemini', e, true);
      return null;
    }
    const bullets = String(out || '').split('\n')
      .map(s => s.trim().replace(/^[-*•・]\s*/, ''))
      .filter(s => s.length > 1)
      .slice(0, 8)
      .map(s => '・' + s);
    return bullets.length >= 2 ? bullets : null;
  }

  // 1言語分のお土産テキスト（日時・言語・会話まとめ・質問）
  async function buildGiftSummary(lang, endTs) {
    const code = LANG_MAP[lang] ? lang : 'en';
    const G = giftDocFor(code);
    const L = LANG_MAP[code] || LANG_MAP.en;
    const end = Number(endTs) || Date.now();
    const items = A.history.filter(h => h && h.ts);
    const start = items.length ? items[0].ts : (A.guideStartedAt || end);
    const mins = Math.max(1, Math.round((end - start) / 60000));

    let bullets = null;
    try { bullets = await aiGiftBullets(code); } catch (e) { bullets = null; }
    if (!bullets || !bullets.length) bullets = localGiftBullets(code);

    const qs = A.questions
      .filter(q => q && q.text && q.lang === code && !(q.tr && q.tr.failed))
      .slice(-8)
      .map(q => '・[' + timeLabel(q.ts) + '] ' + String(q.text).replace(/\s+/g, ' ').trim());

    const lines = [];
    lines.push(G.title);
    lines.push('');
    lines.push(G.date + ': ' + dtLabel(start) + ' – ' + timeLabel(end));
    lines.push(G.lang + ': ' + L.native + ' (' + code + ')');
    lines.push(G.duration + ': ' + mins + ' ' + G.min);
    lines.push('');
    lines.push(giftHead(code, G.summaryHead));
    if (bullets.length) lines.push.apply(lines, bullets);
    else lines.push('・' + G.noTalk);
    if (qs.length) {
      lines.push('');
      lines.push(giftHead(code, G.qHead));
      lines.push.apply(lines, qs);
    }
    lines.push('');
    lines.push('— ' + G.thanks);
    lines.push('');
    lines.push('QR同時通訳 / QR Live Interpreter  ·  ROOM ' + (A.room || ''));
    return lines.join('\n');
  }

  function giftFileName(ts) {
    const d = new Date(ts || Date.now());
    return 'qr-tour-memo-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
           '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + '.txt';
  }

  // テキストを .txt として保存（iOS Safari でも新規タブを開かずに済む）
  function downloadText(name, text) {
    try {
      if (!(window.URL && URL.createObjectURL) || typeof Blob === 'undefined') throw new Error('no blob');
      const blob = new Blob([String(text || '')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      return true;
    } catch (e) {
      console.warn('[gift] 保存できません', e);
      return false;
    }
  }

  async function copyText(text) {
    const s = String(text || '');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch (e) { /* 次へ */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = s;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch (e) { return false; }
  }

  /* ---------------- ガイド：会話を終える ---------------- */
  let giftArmTimer = null;

  function resetGiftArm() {
    if (giftArmTimer) { clearTimeout(giftArmTimer); giftArmTimer = null; }
    const btn = $('#btnEndTour');
    if (btn) {
      btn.classList.remove('armed');
      btn.textContent = '会話を終えて、お土産まとめを送る';
    }
  }

  // 誤タップ防止：1回目は「もう一度押すと終了」の確認だけ
  function onEndTourClick() {
    const btn = $('#btnEndTour');
    if (!btn) return;
    if (!openConns().length) {
      toast('接続中のゲストがいません。先にQRを読んでもらいましょう');
      return;
    }
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = '⚠️ もう一度押すと終了してお土産を送ります';
      toast('もう一度押すと、会話を終えてゲストにお土産を送ります', 4200);
      if (giftArmTimer) clearTimeout(giftArmTimer);
      giftArmTimer = setTimeout(resetGiftArm, 6000);
      return;
    }
    resetGiftArm();
    endTour();
  }

  async function endTour() {
    const list = openConns().filter(r => r.conn && r.conn.open);
    const btn = $('#btnEndTour');
    const status = $('#giftStatus');
    if (!list.length) { toast('接続中のゲストがいません'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'お土産を準備しています…'; }
    if (status) status.textContent = 'お土産まとめを作っています…';

    // 配信を止める（マイク・録音・未確定の文）
    try { if (A.listening || A.rec) stopWebSpeech(); } catch (e) {}
    try { if (A.transcribeOn) stopTranscribe(); } catch (e) {}
    try { flushFinal(); } catch (e) {}
    A.tourEnded = true;
    setGuideStatus('wait', '終了しました');

    const endTs = Date.now();
    const langs = Array.from(new Set(list.map(r => r.lang || 'en')));
    const made = {};
    await Promise.all(langs.map(async (lang) => {
      try { made[lang] = await buildGiftSummary(lang, endTs); }
      catch (e) { console.warn('[gift]', e); made[lang] = ''; }
    }));

    const url = String(S.giftUrl || '').trim();
    for (const rec of list) {
      const lang = rec.lang || 'en';
      sendTo(rec, {
        t: 'tour_end',
        lang,
        summary: made[lang] || made[langs[0]] || '',
        url,
        ts: endTs,
        room: A.room
      });
    }

    A.giftPreview = { lang: langs[0], summary: made[langs[0]] || '', endTs };
    renderGiftPreview();
    if (btn) { btn.disabled = false; btn.textContent = '会話を終えて、お土産まとめを送る'; }
    if (status) {
      status.textContent = list.length + '人のゲストにお土産まとめを送りました（' + dtLabel(endTs) + '）' +
        (url ? '' : '／メール送信URLは未設定：ゲストは「テキスト保存」で持ち帰れます');
    }
    toast(list.length + '人のゲストにお土産まとめを送りました', 4200);
  }

  function renderGiftPreview() {
    const g = A.giftPreview;
    const wrap = $('#giftPreviewWrap');
    if (!wrap || !g || !g.summary) return;
    const L = LANG_MAP[g.lang] || LANG_MAP.en;
    const lab = $('#giftPreviewLabel');
    if (lab) lab.textContent = 'プレビュー（ゲストの画面に出る文・' + L.flag + ' ' + L.native + '）';
    const ta = $('#giftPreview');
    if (ta) ta.value = g.summary;
    wrap.classList.remove('hidden');
  }

  /* ---------------- ゲスト：終了ポップアップ＋メール受け取り ---------------- */
  function giftTargetUrl() {
    const g = P.gift;
    return String((g && g.url) || S.giftUrl || '').trim();
  }

  function showGift(msg) {
    const summary = String((msg && msg.summary) || '').trim();
    if (!summary) return;
    P.gift = {
      summary,
      lang: LANG_MAP[msg && msg.lang] ? msg.lang : (S.myLang || 'en'),
      url: String((msg && msg.url) || ''),
      ts: Number(msg && msg.ts) || Date.now()
    };
    P.giftSent = false;
    const pre = $('#giftText');
    if (pre) pre.textContent = summary;
    const inp = $('#giftEmail');
    if (inp) { inp.value = ''; inp.classList.remove('bad'); }
    const send = $('#giftSend');
    if (send) { send.disabled = false; send.textContent = t('giftSend'); }
    setGiftMsg('');

    // 質問ポップアップを閉じ、右下のボタンを「お土産」に切り替える
    try { if (P.qRec) stopQMic(true); } catch (e) {}
    const qp = $('#qaPop');
    if (qp) qp.classList.add('hidden');
    const fab = $('#btnQAsk');
    if (fab) {
      fab.classList.remove('hidden', 'off');
      fab.dataset.gift = '1';
      const ico = fab.querySelector('.qa-fab-ico');
      if (ico) ico.textContent = '🎁';
      const txt = fab.querySelector('.qa-fab-txt');
      if (txt) txt.textContent = t('giftShort');
    }
    applyGiftText();
    if (!giftTargetUrl()) setGiftMsg(t('giftNoUrl'));
    const gp = $('#giftPop');
    if (gp) gp.classList.remove('hidden');
    try { cancelSpeech(); } catch (e) {}
  }

  function openGiftPop() {
    if (!P.gift) return;
    const gp = $('#giftPop');
    if (gp) gp.classList.remove('hidden');
    try { cancelSpeech(); } catch (e) {}
  }

  function closeGiftPop(e) {
    if (e && e.preventDefault) e.preventDefault();
    const gp = $('#giftPop');
    if (gp) gp.classList.add('hidden');
  }

  function setGiftMsg(msg, kind) {
    const el = $('#giftMsg');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'gift-msg' + (kind ? ' ' + kind : '');
  }

  // ポップアップ内の文言を、ゲストの言語にそろえる
  function applyGiftText() {
    const pop = $('#giftPop');
    if (pop) {
      $$('[data-i18n]', pop).forEach(el => { el.textContent = t(el.dataset.i18n); });
      $$('[data-i18n-aria]', pop).forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    }
    const send = $('#giftSend');
    if (send && !P.giftSent) send.textContent = t('giftSend');
    const fab = $('#btnQAsk');
    if (fab && fab.dataset.gift) {
      const txt = fab.querySelector('.qa-fab-txt');
      if (txt) txt.textContent = t('giftShort');
    }
  }

  // バックエンド未設定のテスト状態でも失わないよう、端末内に残す
  function saveTestGift(payload) {
    try {
      const key = 'qri.gifts.test.v1';
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      all.push(payload);
      while (all.length > 30) all.shift();
      localStorage.setItem(key, JSON.stringify(all));
      return true;
    } catch (e) { return false; }
  }

  // GAS / Webhook へ送る。応答を読める形で送り、CORSで弾かれたら no-cors で送り直す。
  // 二重送信になっても困らないよう、ペイロードの id で先方（GAS側）が重複を弾く。
  async function postGift(url, payload) {
    const body = JSON.stringify(payload);
    try {
      const r = await fetch(url, {
        method: 'POST', mode: 'cors', cache: 'no-store', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      if (r && r.ok) {
        let d = null;
        try { d = await r.json(); } catch (e) { d = null; }
        if (d && d.ok === false) throw new Error(d.error || 'server error');
        return { ok: true, confirmed: true };
      }
      if (r && r.status) throw new Error('HTTP ' + r.status);
    } catch (e) {
      // 応答が読めない（CORS）だけなら、下の no-cors で送り直す
      if (String(e && e.message || '').indexOf('server error') === 0) throw e;
    }
    await fetch(url, {
      method: 'POST', mode: 'no-cors', cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    });
    return { ok: true, confirmed: false };
  }

  async function submitGift(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const g = P.gift;
    if (!g) return;
    if (P.giftSent) { setGiftMsg(t('giftSent'), 'ok'); return; }

    const inp = $('#giftEmail');
    const email = String((inp && inp.value) || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      if (inp) { inp.classList.add('bad'); try { inp.focus(); } catch (e) {} }
      setGiftMsg(t('giftEmailBad'), 'warn');
      return;
    }
    if (inp) inp.classList.remove('bad');

    const payload = {
      email,
      lang: S.myLang || g.lang || 'en',
      summary: g.summary,
      timestamp: new Date().toISOString(),
      room: A.room || '',
      id: 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    };
    const url = giftTargetUrl();
    const send = $('#giftSend');
    if (send) { send.disabled = true; send.textContent = t('giftSending'); }
    setGiftMsg('');

    if (!url) {
      const saved = saveTestGift(payload);
      P.giftSent = !!saved;
      if (send) send.textContent = saved ? '✓' : t('giftSend');
      if (!saved) send.disabled = false;
      setGiftMsg(saved ? t('giftTestSaved') : t('giftSendFailed'), saved ? 'ok' : 'warn');
      return;
    }

    try {
      const res = await postGift(url, payload);
      P.giftSent = true;
      if (send) send.textContent = '✓';
      setGiftMsg(res && res.confirmed ? t('giftSent') : t('giftSentUnconfirmed'), 'ok');
    } catch (e) {
      console.warn('[gift] 送信できません', e);
      saveTestGift(payload);            // 送れなくても失わない
      if (send) { send.disabled = false; send.textContent = t('giftSend'); }
      setGiftMsg(t('giftSendFailed'), 'warn');
    }
  }

  /* ---------------------------------------------------------
     7. 翻訳エンジン
  --------------------------------------------------------- */
  function buildSystemPrompt(langCode) {
    const L = LANG_MAP[langCode] || LANG_MAP.en;
    const gl = (S.glossary || []).filter(g => g && g.ja && g.tr);
    const glLine = gl.length ? gl.map(g => g.ja + ' → ' + g.tr).join(' / ') : '（登録なし）';
    return [
      'あなたは国際会議の同時通訳者です。日本語の話し言葉を ' + L.native + '（' + L.ja + '）に訳してください。',
      '出力は訳文だけ。前置き・解説・括弧書き・原文の繰り返し・ローマ字読みは書かない。',
      '聞き手がその場で理解できる、自然で簡潔な話し言葉にする。',
      '「えー」「あの」「その」などのフィラーは取り除き、言いよどみは整える。',
      '原文にない情報を足さない。数字・人名・社名・日時は正確に。',
      '固有名詞・専門用語の訳語（必ず従う）: ' + glLine
    ].join('\n');
  }

  function buildUserContent(text) {
    const recent = A.history.slice(-4, -1).map(h => '・' + h.ja).join('\n');
    return (recent ? '【直前の文脈（参考。訳さない）】\n' + recent + '\n\n' : '') + '【訳す文】\n' + text;
  }

  function cleanTr(text) {
    let out = String(text || '').trim();
    out = out.replace(/^「([\s\S]*)」$/m, '$1').replace(/^"([\s\S]*)"$/m, '$1');
    return out.trim();
  }

  async function translateOne(ja, lang, opts = {}) {
    const useOpenAI = S.engine === 'openai' && String(S.openaiKey || '').trim();
    const useGemini = S.engine === 'gemini' && String(S.geminiKey || '').trim();

    if (useOpenAI) {
      try { return await openaiTranslate(ja, lang); }
      catch (e) { noteEngineError('OpenAI', e, opts.quiet); }
    } else if (useGemini) {
      try { return await geminiTranslate(ja, lang); }
      catch (e) { noteEngineError('Gemini', e, opts.quiet); }
    }
    return await trialTranslate(ja, lang);
  }

  function noteEngineError(name, err, quiet) {
    console.warn('[' + name + ']', err && err.message);
    if (quiet) return;   // 先行翻訳の失敗はトーストにしない
    const now = Date.now();
    if (now - A.lastEngineErrorAt < 20000) return;
    A.lastEngineErrorAt = now;
    toast(name + 'の翻訳に失敗しました（' + ((err && err.message) || 'エラー') + '）。簡易翻訳で続けます');
  }

  async function mymemoryTranslateFrom(text, from, to) {
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) +
                '&langpair=' + encodeURIComponent(from + '|' + to);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const t = d && d.responseData && d.responseData.translatedText;
    if (!t || /MYMEMORY WARNING/i.test(t) || /INVALID (SOURCE|TARGET) LANGUAGE/i.test(t) || String(d.responseStatus) !== '200') throw new Error('no result');
    return cleanTr(t);
  }

  function mymemoryTranslate(text, lang) {
    return mymemoryTranslateFrom(text, 'ja', lang);
  }

  // Google の公開エンドポイント（非公式・APIキー不要）。応答が速いので無料モードの第一候補
  async function googlePublicTranslate(text, from, to) {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
                encodeURIComponent(from) + '&tl=' + encodeURIComponent(to) +
                '&dt=t&q=' + encodeURIComponent(text);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const out = (d && d[0] ? d[0] : []).map(seg => (seg && seg[0]) || '').join('').trim();
    if (!out) throw new Error('no result');
    return out;
  }

  function googleTrialTranslate(text, lang) {
    return googlePublicTranslate(text, 'ja', lang);
  }

  async function trialTranslate(text, lang) {
    // 1) Google の公開エンドポイント（APIキー不要・応答が速い → 体感速度を優先）
    try {
      const t = await googleTrialTranslate(text, lang);
      return { text: t, engine: 'trial', engineName: 'お試し翻訳' };
    } catch (e) { /* 次へ */ }
    // 2) MyMemory（遅いが安定）
    try {
      const t = await mymemoryTranslate(text, lang);
      return { text: t, engine: 'trial', engineName: 'お試し翻訳' };
    } catch (e) { /* 次へ */ }
    // 3) オフライン：用語集の置換だけ行い、明示する
    let out = text;
    for (const g of (S.glossary || [])) {
      if (g && g.ja && g.tr) out = out.split(g.ja).join(g.tr);
    }
    return { text: '（翻訳エンジンに接続できません）' + out, engine: 'offline', engineName: 'オフライン', degraded: true };
  }

  async function httpErrorText(r) {
    let msg = 'HTTP ' + r.status;
    try {
      const d = await r.json();
      msg = (d && d.error && d.error.message) || (d && d.message) || msg;
    } catch (e) {}
    return msg;
  }

  async function openaiTranslate(text, lang) {
    const out = await openaiChat(buildSystemPrompt(lang), buildUserContent(text));
    return { text: out, engine: 'openai', engineName: 'OpenAI' };
  }

  async function openaiTranslateToJa(text, srcLang) {
    const out = await openaiChat(buildReverseSystemPrompt(srcLang), text);
    return { text: out, engine: 'openai', engineName: 'OpenAI' };
  }

  async function openaiChat(system, user) {
    const body = {
      model: String(S.openaiModel || 'gpt-6-luna').trim(),
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + String(S.openaiKey).trim()
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await httpErrorText(r));
    const d = await r.json();
    const out = cleanTr(d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    if (!out) throw new Error('空の応答');
    return out;
  }

  async function geminiTranslate(text, lang) {
    const out = await geminiChat(buildSystemPrompt(lang), buildUserContent(text));
    return { text: out, engine: 'gemini', engineName: 'Gemini' };
  }

  async function geminiTranslateToJa(text, srcLang) {
    const out = await geminiChat(buildReverseSystemPrompt(srcLang), text);
    return { text: out, engine: 'gemini', engineName: 'Gemini' };
  }

  async function geminiChat(system, user) {
    const model = String(S.geminiModel || 'gemini-3.5-flash-lite').trim();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(String(S.geminiKey).trim());
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0 }
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await httpErrorText(r));
    const d = await r.json();
    const parts = (d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const out = cleanTr(parts.map(p => p.text || '').join(''));
    if (!out) throw new Error('空の応答');
    return out;
  }

  /* ---------------- ゲストの質問 → 日本語 ---------------- */
  function buildReverseSystemPrompt(srcLang) {
    const L = LANG_MAP[srcLang];
    const src = L ? L.native + '（' + L.ja + '）' : 'ゲストの言語（申告なし・自動判定）';
    return [
      'あなたは国際会議の同時通訳者です。ゲストが話した' + src + 'の質問を、自然な日本語に訳してください。',
      '出力は日本語訳だけ。前置き・解説・括弧書き・原文の繰り返しは書かない。',
      'ガイドがすぐ読める、簡潔な話し言葉の日本語にする。',
      '原文がすでに日本語なら、意味を変えず自然な日本語に整えるだけでよい。',
      '原文にない情報を足さない。数字・人名・社名・日時は正確に。'
    ].join('\n');
  }

  // 日本語の文字（ひらがな・カタカナ・漢字・半角カナ）を含むか
  function hasJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF66-\uFF9F]/.test(String(text || ''));
  }

  function sameTr(a, b) {
    const norm = (s) => String(s == null ? '' : s).replace(/[\s\u3000]+/g, ' ').trim().toLowerCase();
    return norm(a) === norm(b);
  }

  // 訳として受け取れるか。英語などがそのまま返ってきたら「訳」として並べない（誤解を防ぐ）。
  function acceptJa(out, body) {
    const t = String(out == null ? '' : out).trim();
    if (!t) return null;
    if (sameTr(t, body)) {
      // 原文が日本語なら「同じ」が正しい。英語などのまま返った場合は翻訳失敗。
      if (hasJapanese(body)) return { text: t, engine: 'none', engineName: '日本語', direct: true };
      return null;
    }
    return { text: t, engine: 'trial', engineName: 'お試し翻訳' };
  }

  async function translateToJa(text, srcLang, opts = {}) {
    const body = String(text == null ? '' : text).trim();
    if (!body) return { text: '', engine: 'none', engineName: '日本語', direct: true, empty: true };
    const declared = LANG_MAP[srcLang] ? srcLang : (srcLang === 'ja' ? 'ja' : '');
    // 日本語→日本語のショートサーキットは、本当に日本語の文字が入っている時だけ
    if (declared === 'ja' && hasJapanese(body)) {
      return { text: body, engine: 'none', engineName: '日本語', direct: true };
    }

    // 1) まずGoogleの公開エンドポイント（速い・キー不要）。ゲストの質問は速度優先。
    //    原文の言語は自動判定（sl=auto）なので、画面の言語設定に頼らない。
    try {
      const fin = acceptJa(await googlePublicTranslate(body, 'auto', 'ja'), body);
      if (fin) return fin;
    } catch (e) { /* 次へ */ }

    // 2) Googleで訳せないときだけ、設定中のAIエンジン（キーがある場合）
    const aiFrom = declared || 'auto';
    if (S.engine === 'openai' && String(S.openaiKey || '').trim()) {
      try {
        const res = await openaiTranslateToJa(body, aiFrom);
        const fin = acceptJa(res.text, body);
        if (fin) return Object.assign({}, res, fin);
      } catch (e) { noteEngineError('OpenAI', e, true); }
    } else if (S.engine === 'gemini' && String(S.geminiKey || '').trim()) {
      try {
        const res = await geminiTranslateToJa(body, aiFrom);
        const fin = acceptJa(res.text, body);
        if (fin) return Object.assign({}, res, fin);
      } catch (e) { noteEngineError('Gemini', e, true); }
    }
    // 3) MyMemory（遅いが安定）
    // MyMemory は sl=auto を受け付けない（'AUTO' IS AN INVALID SOURCE LANGUAGE）ので 'Autodetect' を使う
    try {
      const fin = acceptJa(await mymemoryTranslateFrom(body, 'Autodetect', 'ja'), body);
      if (fin) return fin;
    } catch (e) { /* 次へ */ }
    // どれも駄目なら、英語を「訳」として並べず「訳せなかった」と分かる形で返す
    return { text: '', engine: 'offline', engineName: '翻訳できません', degraded: true, failed: true };
  }

  /* ---------------------------------------------------------
     8. 音声認識（ガイド）
  --------------------------------------------------------- */
  function pickMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (const m of cands) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {}
    }
    return '';
  }

  async function toggleMic() {
    if (S.asr === 'transcribe') {
      if (A.transcribeOn) stopTranscribe();
      else await startTranscribe();
      return;
    }
    if (A.listening) stopWebSpeech();
    else startWebSpeech();
  }

  function setMicUI(on) {
    $('#btnMic').classList.toggle('live', on);
    if (on) {
      $('#micState').textContent = S.asr === 'transcribe'
        ? '録音中（' + (Number(S.chunkSec) || 6) + '秒ごとに送信）'
        : '聞き取り中…';
    } else {
      $('#micState').textContent = 'マイク停止中';
      $('#interim').textContent = '';
    }
  }

  function noteMic(msg) {
    $('#micNote').textContent = msg || '';
  }

  // タップのユーザージェスチャーを切らさないため、await を挿まずに同期的に start() する。
  // （getUserMedia を await してから start() すると、Android Chrome では
  //  ジェスチャーの文脈が切れて、許可済みでも not-allowed で弾かれる実機報告がある）
  function startWebSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      noteMic('このブラウザは Web Speech API に未対応です。「高精度API（Whisper系）」か、Android の Chrome をお使いください。');
      toast('音声認識が使えないブラウザです。設定でWhisper系に切り替えるか、下の入力欄でテストできます');
      return;
    }
    if (A.micStarting || A.listening) return;
    A.micStarting = true;
    let fatal = false;

    const rec = new SR();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      A.listening = true;
      setMicUI(true);
      noteMic('');
    };

    rec.onresult = (ev) => {
      let interim = '';
      const finals = [];
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const txt = (res[0] && res[0].transcript || '').trim();
        if (res.isFinal) finals.push(txt);
        else interim += txt;
      }
      // 確定結果が来たら、すでに強制確定した先頭分を差し引いて末尾だけを訳す
      for (const f of finals) queueFinal(f);
      pushInterim(interim);
    };

    rec.onerror = (ev) => {
      const err = (ev && ev.error) || 'unknown';
      // 端末や状況で原因が違うので、エラー名を丸めずそのまま出す
      const detail = ev && ev.message ? '（message: ' + String(ev.message).trim() + '）' : '';
      if (err === 'not-allowed') {
        fatal = true;
        A.listening = false;
        setMicUI(false);
        noteMic('マイク権限が拒否されました（error: not-allowed）' + detail
          + '。Chromeのアドレスバーから許可するか、アプリ内ブラウザの場合は「Chromeで開く」をお試しください。');
      } else if (err === 'service-not-allowed') {
        fatal = true;
        A.listening = false;
        setMicUI(false);
        noteMic('端末の音声認識サービスが拒否されました（error: service-not-allowed）' + detail
          + '。Chromeではなくアプリ内ブラウザで開いている場合や、端末の音声入力設定が無効な場合に起きます。右上のメニューから「Chromeで開く」か、設定で「高精度API（Whisper系）」に切り替えてください。');
      } else if (err === 'no-speech') {
        // 無音。自動再開に任せる
      } else if (err === 'network') {
        noteMic('音声認識サーバーに接続できませんでした。通信環境を確認するか、Whisper系モードをお試しください。');
      } else if (err === 'aborted') {
        // stop() による終了
      } else {
        noteMic('音声認識エラー: ' + err);
      }
    };

    rec.onend = () => {
      if (A.listening && !fatal) {
        setTimeout(() => { try { rec.start(); } catch (e) {} }, 320);
      } else {
        A.listening = false;
        setMicUI(false);
      }
    };

    A.rec = rec;
    try {
      rec.start();               // クリックハンドラから同期で開始（ジェスチャーを切らさない）
      noteMic('');
    } catch (e) {
      A.listening = false;
      setMicUI(false);
      noteMic('音声認識を開始できませんでした（' + ((e && e.name) || 'error') + (e && e.message ? ': ' + e.message : '') + '）');
    } finally {
      A.micStarting = false;
    }
  }

  function stopWebSpeech() {
    A.listening = false;
    try { if (A.rec) A.rec.stop(); } catch (e) {}
    A.rec = null;
    flushFinal();
    A.interimRaw = '';        // 次の認識結果に持ち越さない
    A.committedPrefix = '';
    A.afterCommit = false;
    setMicUI(false);
  }

  /* ---------------- 途中文字（interim）のリアルタイム配信 ---------------- */
  // Web Speech が返す「まだ確定していない認識結果」を、300〜450ms 間隔で
  // 参加者の端末へそのまま送る（一文が終わるのを待たない）
  function showInterim(text) {
    A.interimText = text;
    const el = $('#interim');
    if (el) el.textContent = text ? '「' + text + '」' : '';
  }

  function pushInterim(text) {
    A.interimRaw = String(text || '').trim();
    // 前の区切りとまったく重ならない＝新しい認識結果に切り替わった
    if (A.committedPrefix && !similarHead(A.interimRaw, A.committedPrefix)) {
      A.committedPrefix = '';
    }
    const p = pendingText();
    showInterim(p.text);
    scheduleInterimSend();
    considerForceChunk(p.text);
  }

  /* ---- 話し続け対応：interim からの強制確定 ----
     Android Chrome は話し続けている間ずっと isFinal=false（interim）を返すため、
     確定を待たずに、溜まった未確定分を区切って翻訳・配信へ回す。 */
  function chunkChars() {
    const raw = S.chunkChars != null ? S.chunkChars : S.maxChars;
    return clamp(Number(raw) || 20, 10, 60);
  }

  function chunkPauseMs() {
    const raw = S.chunkPauseMs != null ? S.chunkPauseMs : S.flushMs;
    return clamp(Number(raw) || 750, 300, 2000);
  }

  // 生テキストから「すでに強制確定した先頭部分」を差し引いた残り（必ず raw の末尾部分）
  function cutCommitted(raw, prefix) {
    const f = String(raw || '');
    const p = String(prefix || '');
    if (!p) return f;
    if (!f) return '';
    if (f.startsWith(p)) return f.slice(p.length);
    const nf = norm(f), np = norm(p);
    if (!np) return f;
    if (nf === np) return '';                                  // まるごと既確定
    if (nf.startsWith(np)) {
      // 句読点・空白の表記ゆれを挟んで一致 → 表記を無視して先頭から消費する
      let consumed = 0, i = 0;
      while (i < f.length && consumed < np.length) {
        if (norm(f[i])) consumed++;
        i++;
      }
      return f.slice(i);
    }
    // 音声認識の途中修正で先頭が少し揺れた場合：一致した頭の長さで切る
    let n = 0;
    while (n < f.length && n < p.length && f[n] === p[n]) n++;
    if (n >= Math.max(4, Math.ceil(p.length * 0.5))) return f.slice(n);
    if (nf.endsWith(np)) return '';                            // 既確定分の繰り返し
    // ひらがな→漢字の変換などで先頭が書き換わった場合：
    // ほぼ同じ内容なら、長さの差から後ろに増えた分だけを新しい内容とみなす
    if (similarHead(f, p)) {
      const extra = f.length - p.length;
      if (extra <= 0) return '';
      if (extra <= p.length) return f.slice(p.length);
    }
    return f;
  }

  // 順序を保った共通文字数（LCS）。書き換えの度合いを見る
  function lcsLen(a, b) {
    const m = a.length, n = b.length;
    if (!m || !n) return 0;
    let prev = new Array(n + 1).fill(0);
    for (let i = 1; i <= m; i++) {
      const cur = new Array(n + 1).fill(0);
      for (let j = 1; j <= n; j++) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      }
      prev = cur;
    }
    return prev[n];
  }

  // 既確定の先頭とほぼ同じ内容か（漢字変換などの書き換えを許して比べる）
  function similarHead(raw, prefix) {
    const p = String(prefix || '');
    if (!p) return true;
    const f = String(raw || '');
    if (!f) return false;
    return lcsLen(p, f.slice(0, p.length + 6)) / p.length >= 0.6;
  }

  // 未確定分の現在値（raw 全体・既確定分を除いた残り・頭の区切り記号を除いた表示用テキスト）
  function pendingText() {
    const rawFull = String(A.interimRaw || '');
    const rest = cutCommitted(rawFull, A.committedPrefix);
    const trimmed = rest.replace(/^[\s\u3000、。，．,.！!？?…‥・]+/, '');
    return {
      rawFull,
      rest,
      base: rawFull.length - rest.length,       // 残りが raw で始まる位置
      lead: rest.length - trimmed.length,        // 頭の区切り記号の数
      text: trimmed.trim()
    };
  }

  // 自然な切れ目（句読点・空白・助詞のあと）を探す。無ければ上限の位置で切る
  function naturalCut(t, limit, minChars) {
    const head = t.slice(0, limit);
    const punctMin = Math.max(6, Math.ceil(minChars * 0.5));   // 句読点なら短くても切る
    const particleMin = minChars;                              // 助詞はもう少し長いときだけ
    let bestPunct = -1;
    let bestParticle = -1;
    let m;
    const punct = /[。．！？!?、，,.…‥\s\u3000]/g;
    while ((m = punct.exec(head))) {
      const at = (m[0] === ' ' || m[0] === '\u3000') ? m.index : m.index + 1;
      if (at > bestPunct) bestPunct = at;
    }
    const particle = /[はがをにでとものへやねよか]/g;
    while ((m = particle.exec(head))) {
      const at = m.index + 1;
      if (at > bestParticle) bestParticle = at;
    }
    if (bestPunct >= punctMin) return bestPunct;
    if (bestParticle >= particleMin) return bestParticle;
    return limit;
  }

  // 未確定分の先頭 cutLen 文字をチャンクとして確定・翻訳・配信する
  function commitPending(cutLen) {
    const p = pendingText();
    const len = clamp(cutLen, 1, p.text.length);
    const piece = p.text.slice(0, len).trim();
    if (!piece) return;
    clearTimeout(A.chunkTimer);
    A.chunkTimer = null;
    // 既確定の先頭を raw テキストの位置で正確に伸ばす（重複・欠落よけ）
    const end = p.base + p.lead + len;
    A.committedPrefix = p.rawFull.slice(0, end);
    A.afterCommit = true;
    A.finalBuf = joinChunk(A.finalBuf, piece);
    flushFinal({ keepInterim: true });   // 即翻訳・配信

    const rest = pendingText();
    showInterim(rest.text);
    A.lastInterimSent = '';
    if (rest.text) {
      scheduleInterimSend();
      considerForceChunk(rest.text);
    }
  }

  // 未確定分が区切りの条件を満たしたら、isFinal を待たずに確定へ回す
  function considerForceChunk(pending) {
    const t = String(pending == null ? pendingText().text : pending);
    clearTimeout(A.chunkTimer);
    A.chunkTimer = null;
    if (!t) return;

    const minChars = chunkChars();
    const limit = Math.max(minChars + 15, 35);      // 上限（これを超えたら待たない）
    const pause = chunkPauseMs();

    // b) 上限を超えたら、自然な切れ目（無ければ上限の位置）で即確定
    if (t.length >= limit) {
      commitPending(naturalCut(t, limit, minChars));
      return;
    }
    // c) 句読点で文が切れた直後で、ある程度の長さがあるとき
    if (/[。．！？!?…]$/.test(t) && t.length >= Math.max(8, Math.ceil(minChars * 0.5))) {
      commitPending(t.length);
      return;
    }
    // a) 設定文字数に達したあと、変化が止まって息継ぎ時間が経ったとき
    if (t.length >= minChars) {
      A.afterCommit = false;
      A.chunkTimer = setTimeout(() => {
        A.chunkTimer = null;
        const cur = pendingText().text;
        if (cur === t && cur.length >= minChars) commitPending(cur.length);
      }, pause);
      return;
    }
    // 強制確定の直後に残った短い末尾は、長めの息継ぎで拾う
    if (A.afterCommit && t.length >= 4) {
      A.chunkTimer = setTimeout(() => {
        A.chunkTimer = null;
        const cur = pendingText().text;
        if (cur === t) commitPending(cur.length);
      }, Math.round(pause * 2));
    }
  }

  function scheduleInterimSend() {
    if (A.interimTimer) return;                        // 送信は予約済み（スロットリング）
    const gap = clamp(Number(S.interimMs) || 380, 300, 450);
    const wait = Math.max(0, gap - (Date.now() - A.interimSentAt));
    if (!wait) { sendInterim(); return; }
    A.interimTimer = setTimeout(() => { A.interimTimer = null; sendInterim(); }, wait);
  }

  function sendInterim(force) {
    A.interimTimer = null;
    const text = A.interimText;
    if (!force && text === A.lastInterimSent) return;
    if (!text && !A.lastInterimSent) return;
    A.lastInterimSent = text;
    A.interimSentAt = Date.now();
    for (const rec of openConns()) {
      const tr = rec.lang && text ? preCacheFor(text, rec.lang) : null;
      sendTo(rec, { t: 'interim', ja: text, ts: A.interimSentAt, tr: tr ? { [rec.lang]: tr } : {} });
    }
    if (text) maybePrefetch(text);
  }

  // 短い区切りを優先して、話している最中でも確定分をどんどん翻訳へ回す
  function joinChunk(buf, t) {
    if (!buf) return t;
    return /[A-Za-z0-9]$/.test(buf) ? buf + ' ' + t : buf + t;
  }

  function queueFinal(text) {
    const raw = String(text || '').trim();
    if (!raw) return;
    // すでに強制確定した先頭を差し引いて、まだ訳していない末尾だけにする
    let tail = cutCommitted(raw, A.committedPrefix);
    tail = String(tail || '').replace(/^[\s\u3000、。，．,.！!？?…‥・]+/, '').trim();
    A.committedPrefix = '';      // 1つの認識結果が完結したのでリセット
    A.interimRaw = '';
    A.afterCommit = false;
    clearTimeout(A.chunkTimer);
    A.chunkTimer = null;
    if (!tail) return;

    A.finalBuf = joinChunk(A.finalBuf, tail);
    clearTimeout(A.finalTimer);
    const endsSentence = /[。．.！？!?…]$/.test(tail);
    const maxChars = chunkChars();
    const flushMs = chunkPauseMs();
    if (endsSentence || A.finalBuf.length >= maxChars) { flushFinal(); return; }
    A.finalTimer = setTimeout(() => flushFinal(), flushMs);
  }

  function flushFinal(opts) {
    clearTimeout(A.finalTimer);
    A.finalTimer = null;
    clearTimeout(A.chunkTimer);
    A.chunkTimer = null;
    const t = A.finalBuf.trim();
    A.finalBuf = '';
    if (!(opts && opts.keepInterim)) {
      A.interimText = '';
      const el = $('#interim');
      if (el) el.textContent = '';
    }
    if (t) publishCaption(t);
  }

  /* ---------------- 高精度API（録音して送る） ---------------- */
  async function startTranscribe() {
    if (!String(S.openaiKey || '').trim()) {
      toast('高精度の音声認識には OpenAI APIキーが必要です（⚙️設定）');
      return;
    }
    try {
      A.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (e) {
      noteMic('マイクを使えませんでした（' + (e && e.name) + '）。HTTPSのページか、マイクの許可を確認してください。');
      return;
    }
    A.transcribeOn = true;
    setMicUI(true);
    noteMic('');
    transcribeLoop();
  }

  function stopTranscribe() {
    A.transcribeOn = false;
    setMicUI(false);
    if (A.micStream) {
      A.micStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
      A.micStream = null;
    }
  }

  async function transcribeLoop() {
    const stream = A.micStream;
    while (A.transcribeOn && stream) {
      const ms = clamp(Number(S.chunkSec) || 6, 3, 15) * 1000;
      let blob = null;
      try { blob = await recordChunk(stream, ms); }
      catch (e) { noteMic('録音に失敗しました'); break; }
      if (!A.transcribeOn) break;
      if (!blob || blob.size < 4000) continue;
      try {
        const text = await transcribeBlob(blob);
        if (text) publishCaption(text);
      } catch (e) {
        console.warn('[transcribe]', e);
        noteMic('音声認識APIでエラー: ' + ((e && e.message) || e));
      }
    }
  }

  function recordChunk(stream, ms) {
    return new Promise((resolve, reject) => {
      const mime = pickMime();
      let rec;
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 })
                   : new MediaRecorder(stream);
      } catch (e) { reject(e); return; }
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const type = (mime || 'audio/webm').split(';')[0];
        resolve(new Blob(chunks, { type }));
      };
      rec.onerror = (e) => reject(e);
      try { rec.start(); } catch (e) { reject(e); return; }
      setTimeout(() => { try { rec.stop(); } catch (e) {} }, ms);
    });
  }

  async function transcribeBlob(blob) {
    const fd = new FormData();
    const type = blob.type || 'audio/webm';
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
    fd.append('file', blob, 'chunk.' + ext);
    fd.append('model', String(S.transcribeModel || 'gpt-transcribe').trim());
    fd.append('language', 'ja');
    const terms = (S.glossary || []).filter(g => g && g.ja).map(g => g.ja).join('、');
    if (terms) fd.append('prompt', terms);

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + String(S.openaiKey).trim() },
      body: fd
    });
    if (!r.ok) throw new Error(await httpErrorText(r));
    const d = await r.json();
    return String((d && (d.text || d.transcript)) || '').trim();
  }

  /* ---------------------------------------------------------
     9. 参加者（受信）モード
  --------------------------------------------------------- */
  function startParticipant(room, langParam) {
    A.role = 'participant';
    A.room = room;
    $('#viewGuide').classList.add('hidden');
    $('#viewParticipant').classList.remove('hidden');
    $('#pRoom').textContent = room;
    document.title = 'ROOM ' + room + ' | QR同時通訳';
    setPStatus('', 'connecting');
    highlightLang();
    applyGuestText();

    if (langParam && LANG_MAP[langParam]) {
      S.myLang = langParam;
      saveSettings();
      enterStage();
    } else if (!S.myLang) {
      // まだ言語を知らないときは端末の言語から推測（選択画面の文言用。選ぶのは本人）
      const guess = guessLang();
      if (guess) {
        S.myLang = guess;
        saveSettings();
        applyGuestText();          // 選択画面の文言を推測した言語で出す（選んだ扱いにはしない）
      }
    }

    ensureLibs().then(connectParticipant);
  }

  // 状態の文言はキーで持ち、言語を切り替えたら描き直す
  function setPStatus(kind, key) {
    P.status = { kind: kind || '', key: key || '' };
    const dot = $('#pDot');
    if (dot) dot.className = 'dot' + (kind ? ' ' + kind : '');
    const el = $('#pStatus');
    if (el) el.textContent = key ? t(key) : '';
  }

  function setWaiting(key) {
    P.waitKey = key || '';
    const el = $('#pWaitingText');
    if (el && key) el.textContent = t(key);
  }

  function waitingHtml(key) {
    return '<div id="pWaiting" class="p-waiting"><div class="wave" aria-hidden="true"><span></span><span></span><span></span></div>' +
           '<p id="pWaitingText" data-i18n="' + key + '">' + esc(t(key)) + '</p></div>';
  }

  function connectParticipant() {
    if (typeof window.Peer === 'undefined') {
      setPStatus('err', 'libFail');
      setTimeout(connectParticipant, 1500);
      return;
    }
    if (!P.peer) {
      try {
        P.peer = new window.Peer(peerOptions());
      } catch (e) {
        setPStatus('err', 'cannotConnect');
        return;
      }
      P.peer.on('open', () => { openConn(); });
      P.peer.on('error', (err) => {
        const type = err && err.type;
        if (type === 'peer-unavailable') {
          setPStatus('wait', 'waitGuide');
          const w = $('#pWaiting');
          if (w) w.classList.remove('hidden');
          setWaiting('waitStart');
          scheduleRetry();
        } else if (type === 'network' || type === 'server-error' || type === 'socket-error') {
          setPStatus('wait', 'netError');
          try { P.peer.reconnect(); } catch (e) {}
        } else if (type === 'unavailable-id') {
          try { P.peer.destroy(); } catch (e) {}
          P.peer = null;
          setTimeout(connectParticipant, 600);
        } else {
          console.warn('[peer]', type, err && err.message);
        }
      });
      P.peer.on('disconnected', () => {
        setPStatus('wait', 'disconnected');
        try { P.peer.reconnect(); } catch (e) {}
      });
    } else if (P.peer.open) {
      openConn();
    }
  }

  function openConn() {
    if (!P.peer || !P.peer.open) return;
    if (P.conn && P.conn.open) return;
    let conn;
    try {
      conn = P.peer.connect(peerIdFor(A.room), { reliable: true, serialization: 'json' });
    } catch (e) {
      setPStatus('err', 'cannotConnect');
      scheduleRetry();
      return;
    }
    P.conn = conn;

    conn.on('open', () => {
      P.retry = 0;
      setPStatus('live', 'connected');
      if (S.myLang) sendHello();
    });
    conn.on('data', onHostData);
    conn.on('close', () => {
      if (!P.joined) return;
      setPStatus('wait', 'disconnected');
      scheduleRetry();
    });
    conn.on('error', (e) => console.warn('[conn]', e && e.type));
  }

  function scheduleRetry() {
    clearTimeout(P.retryTimer);
    const delay = Math.min(12000, 2500 * Math.pow(1.7, Math.min(P.retry++, 5)));
    P.retryTimer = setTimeout(() => {
      if (!P.conn || !P.conn.open) openConn();
    }, delay);
  }

  function sendHello() {
    if (!P.conn || !P.conn.open) return;
    P.conn.send({ t: 'hello', lang: S.myLang || 'en' });
  }

  /* ---------------- 多言語（参加者画面） ---------------- */
  function t(key) {
    const dict = TEXTS[S.myLang] || TEXTS.en;
    return (dict && dict[key]) || TEXTS.en[key] || key;
  }

  // CSS の content に渡す文字列（ダブルクォートで囲む）
  function cssStr(s) {
    return '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  // 参加者画面の全文言を、選んだ言語に差し替える
  function applyGuestText() {
    const view = $('#viewParticipant');
    if (view) {
      $$('[data-i18n]', view).forEach(el => { el.textContent = t(el.dataset.i18n); });
      $$('[data-i18n-aria]', view).forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
      $$('[data-i18n-ph]', view).forEach(el => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
    }
    $$('.sheet-section[data-mode="participant"] [data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });

    // 字幕の疑似ラベル（CSS の content: var(...)）
    const stage = $('#pStage');
    if (stage) {
      stage.style.setProperty('--t-live', cssStr(t('liveLabel')));
      stage.style.setProperty('--t-listening', cssStr(t('listening')));
      stage.style.setProperty('--t-translating', cssStr(t('translating')));
    }

    // 状態・待機文言も今の言語で出し直す
    if (P.status) setPStatus(P.status.kind, P.status.key);
    if (P.waitKey) setWaiting(P.waitKey);

    applyParticipantLook();
    updateQaUI();
    setQHint(P.qListening ? 'micListening' : 'micHint');
    applyGiftText();

    // iPhone のときだけ、言語選択画面に消音スイッチの一言を出す
    const iosNote = $('#pLangIosNote');
    if (iosNote) iosNote.classList.toggle('hidden', !IS_IOS);

    const sheet = $('#sheet');
    if (sheet && !sheet.classList.contains('hidden') && A.role === 'participant') {
      $('#sheetTitle').textContent = t('setTitle');
    }
  }

  function setQHint(key) {
    const el = $('#qHint');
    if (el) el.textContent = t(key);
  }

  // 任意の文（エラー理由など）をそのまま出す
  function setQHintText(msg) {
    const el = $('#qHint');
    if (el) el.textContent = msg || '';
  }

  function setQLiveText(msg) {
    const el = $('#qLive');
    if (el) el.textContent = msg || '';
  }

  // マイクのエラーを、相手の言語で分かる言葉にする
  const MIC_ERR_KEY = {
    'no-speech': 'micNoSpeech',
    'audio-capture': 'micNoDevice',
    'network': 'micNetwork',
    'not-allowed': 'micDenied',
    'service-not-allowed': 'micDenied'
  };

  function micErrorText(err) {
    const e = String(err || 'error');
    const key = MIC_ERR_KEY[e] || 'micError';
    return t(key).replace('{err}', e);
  }

  // マイクが使えない原因を #qHint / #qLive に必ず出す（無反応に見せない）
  function showMicError(err, opts) {
    const e = String(err || 'error');
    // aborted は stop() や iOS Safari の自動終了でも出るので、エラーとして見せない
    if (e === 'aborted') return;
    const msg = micErrorText(e);
    P.qErr = e;
    setQHintText(msg);
    setQLiveText('⚠️ ' + e);
    if (!(opts && opts.silentToast)) toast(msg, 4200);
  }

  /* ---------------- 質問（ゲスト → ガイド）
     右下の小さなボタン → マイクのポップアップだけ。文字入力も送信ボタンも置かない。
     マイクに話す → 認識が終わったら自動で送信して、自動で閉じる。 */
  function updateQaUI() {
    const on = P.qOpen !== false;
    const notice = $('#qNotice');
    const mic = $('#qMic');
    if (notice) notice.classList.toggle('hidden', on);
    if (mic) mic.disabled = !on;
    const fab = $('#btnQAsk');
    if (fab) fab.classList.toggle('off', !on);
    if (!on) {
      const pop = $('#qaPop');
      if (pop && !pop.classList.contains('hidden')) closeQaPop();
    }
  }

  function openQaPop() {
    if (P.qOpen === false) { toast(t('qClosedHint'), 2800); return; }
    const pop = $('#qaPop');
    if (!pop) return;
    if (P.qCloseTimer) { clearTimeout(P.qCloseTimer); P.qCloseTimer = null; }
    pop.classList.remove('hidden');
    const fab = $('#btnQAsk');
    if (fab) fab.classList.add('hidden');
    P.qText = '';
    P.qSent = false;
    P.qErr = null;
    P.qInterimLast = '';
    P.qRestarts = 0;
    P.qQid = newQuestionId();       // 途中経過と確定を同じIDで送る
    const live = $('#qLive');
    if (live) live.textContent = '';
    updateQaUI();
    // まだ繋がっていないなら、なぜ送れないかを先に伝える
    if (!P.conn || !P.conn.open) {
      const msg = t('qNoConn');
      setQHintText(msg);
      setQLiveText('⚠️ offline');
    }
    startQMic();        // タップの流れの中でマイクを開始（点滅して待ち受け）
  }

  function closeQaPop() {
    // 送らずに閉じたときは、ガイド側の「話しています（途中）」の行も片付けてもらう
    if (!P.qSent && P.qQid && P.conn && P.conn.open) {
      try { P.conn.send({ t: 'qend', id: P.qQid }); } catch (e) {}
    }
    P.qSent = true;     // 閉じるときは送らない
    stopQMic(true);
    if (P.qCloseTimer) { clearTimeout(P.qCloseTimer); P.qCloseTimer = null; }
    const pop = $('#qaPop');
    if (pop) pop.classList.add('hidden');
    const fab = $('#btnQAsk');
    const stage = $('#pStage');
    if (fab && stage && !stage.classList.contains('hidden')) fab.classList.remove('hidden');
    const live = $('#qLive');
    if (live) live.textContent = '';
    P.qText = '';
    P.qQid = '';
    setQHint('micHint');
  }

  function newQuestionId() {
    return 'gq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // 質問マイク。2回目・3回目以降のAskでも、毎回あたらしいインスタンスで
  // タップハンドラから同期的に start() する（iOS Safari / Android Chrome 両対応）。
  function startQMic() {
    if (P.qOpen === false) { toast(t('qClosedHint'), 2800); return false; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setQHint('micUnsupported');
      toast(t('micUnsupported'), 3200);
      return false;
    }
    const L = LANG_MAP[S.myLang] || LANG_MAP.en;

    // 前回のインスタンスが残っていたら、そのコールバックを無効化して確実に畳む。
    // （onend が来ないまま残ると 2回目の start が素通りして「言葉が反映されない」状態になる）
    const gen = (P.qGen = (P.qGen || 0) + 1);
    const stale = P.qRec;
    P.qRec = null;
    if (stale) {
      try {
        stale.onstart = null; stale.onresult = null; stale.onerror = null; stale.onend = null;
        if (typeof stale.abort === 'function') stale.abort(); else stale.stop();
      } catch (e) {}
    }

    let rec;
    try { rec = new SR(); }
    catch (e) {
      setQHint('micUnsupported');
      toast(t('micUnsupported'), 3200);
      return false;
    }
    rec.lang = L.bcp47;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    P.qSent = false;
    P.qErr = null;
    P.qInterimLast = '';
    P.qStartedAt = Date.now();
    if (!P.qQid) P.qQid = newQuestionId();

    const mic = $('#qMic');
    let began = false;      // 実際に認識が始まったか（始まらずに終わった時だけ、静かにやり直す）

    rec.onstart = () => {
      if (gen !== P.qGen) return;
      began = true;
      P.qListening = true;
      if (mic) mic.classList.add('listening');
      // 未接続なら「なぜ送れないか」を出したままにする（Listening で上書きしない）
      if (!P.conn || !P.conn.open) {
        setQHint('qNoConn');
        setQLiveText('⚠️ offline');
      } else {
        setQHint('micListening');
      }
    };
    rec.onresult = (ev) => {
      if (gen !== P.qGen) return;
      let out = '';
      for (let i = 0; i < ev.results.length; i++) {
        out += (ev.results[i][0] && ev.results[i][0].transcript) || '';
      }
      out = out.trim();
      if (!out) return;
      P.qText = out;
      setQLiveText(out);
      sendQInterim(out);          // 話している途中もガイドへ（低遅延の日本語訳）
    };
    rec.onerror = (ev) => {
      if (gen !== P.qGen) return;
      const err = (ev && ev.error) || 'error';
      P.qListening = false;
      if (P.qRec === rec) P.qRec = null;
      if (mic) mic.classList.remove('listening');
      // aborted は stop() や iOS Safari の自動終了でも出る。静かに受け流し、
      // 聞き取れている文があればそのまま送る。
      if (err === 'aborted') {
        if (P.qOpen !== false && P.qText && !P.qSent) autoSendQuestion();
        return;
      }
      // それ以外のエラーは必ず画面に出す（無反応に見せない）
      showMicError(err);
    };
    rec.onend = () => {
      if (gen !== P.qGen) return;
      P.qListening = false;
      if (P.qRec === rec) P.qRec = null;
      if (mic) mic.classList.remove('listening');
      const hadErr = !!P.qErr;
      // 話し終わったら自動で送る（送信ボタンは無い）
      if (P.qOpen !== false && P.qText && !P.qSent) autoSendQuestion();
      else if (P.qOpen !== false && !P.qSent && !hadErr) {
        // 端末側で「始まらないまま」終わってしまった（iOSで起きる）ときは、静かに1回だけやり直す
        if (!began && !P.qText && Date.now() - P.qStartedAt < 700 && P.qRestarts < 1) {
          P.qRestarts++;
          setTimeout(() => {
            if (gen !== P.qGen || P.qSent || P.qText) return;
            if (!P.qRec && !$('#qaPop').classList.contains('hidden')) startQMic();
          }, 120);
          return;
        }
        // 何も聞き取れなかったときも「なぜ送られないか」を出す
        setQHint(P.qText ? 'micHint' : 'micEmpty');
      }
    };

    P.qRec = rec;
    P.qListening = true;
    if (mic) mic.classList.add('listening');    // 大きく点滅（パルス）
    setQHint('micListening');
    try { rec.start(); }
    catch (e) {
      // iOS Safari は直前の stop 直後の start を弾くことがある → 一度だけ短く待って再試行
      if (gen === P.qGen) {
        P.qListening = false;
        if (mic) mic.classList.remove('listening');
        setTimeout(() => {
          if (gen !== P.qGen) return;
          try {
            rec.start();
            P.qRec = rec;
            P.qListening = true;
            if (mic) mic.classList.add('listening');
            setQHint('micListening');
            return;
          } catch (e2) {}
          if (P.qRec === rec) P.qRec = null;
          showMicError(e && e.name === 'NotAllowedError' ? 'not-allowed' : 'start');
        }, 150);
        return true;
      }
      P.qRec = null;
      P.qListening = false;
      if (mic) mic.classList.remove('listening');
      showMicError(e && e.name === 'NotAllowedError' ? 'not-allowed' : 'start');
      return false;
    }
    return true;
  }

  // 話している途中の質問を、スロットリングしてガイドへ送る（300〜400ms間隔）
  function sendQInterim(text) {
    if (!P.conn || !P.conn.open) return;
    const body = String(text || '').trim();
    if (!body || P.qSent) return;
    if (body === P.qInterimLast) return;
    const gap = 340;
    const wait = Math.max(0, gap - (Date.now() - P.qInterimSentAt));
    const fire = () => {
      P.qInterimTimer = null;
      if (!P.conn || !P.conn.open || P.qSent) return;
      const cur = String(P.qText || '').trim();
      if (!cur || cur === P.qInterimLast) return;
      P.qInterimLast = cur;
      P.qInterimSentAt = Date.now();
      try {
        P.conn.send({ t: 'qinterim', id: P.qQid || '', lang: S.myLang || 'en', text: cur, ts: P.qInterimSentAt });
      } catch (e) {}
    };
    if (!wait) fire();
    else {
      if (P.qInterimTimer) clearTimeout(P.qInterimTimer);
      P.qInterimTimer = setTimeout(fire, wait);
    }
  }

  function stopQMic(cancel) {
    if (P.qInterimTimer) { clearTimeout(P.qInterimTimer); P.qInterimTimer = null; }
    if (!P.qRec) {
      const b0 = $('#qMic');
      if (b0) b0.classList.remove('listening');
      P.qListening = false;
      return;
    }
    if (cancel) P.qSent = true;
    try { P.qRec.stop(); } catch (e) {}
    P.qRec = null;
    P.qListening = false;
    const b = $('#qMic');
    if (b) b.classList.remove('listening');
  }

  function toggleQMic() {
    if (P.qListening || P.qRec) stopQMic(false);   // 停止 → onend で自動送信
    else startQMic();
  }

  function autoSendQuestion() {
    const text = String(P.qText || '').trim();
    if (P.qSent) return;
    if (!text) {
      // 聞き取れなかった理由を必ず見せる（無反応に見せない）
      setQHint('micEmpty');
      return;
    }
    if (!sendQuestionText(text, { auto: true, id: P.qQid })) { P.qSent = true; return; }
    P.qSent = true;
    const live = $('#qLive');
    if (live) live.textContent = '';
    setQHint('sent');
    if (P.qCloseTimer) clearTimeout(P.qCloseTimer);
    P.qCloseTimer = setTimeout(() => { P.qCloseTimer = null; closeQaPop(); }, 1200);
  }

  function sendQuestionText(text, opts = {}) {
    const body = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!body) {
      setQHint('micEmpty');
      if (!opts.auto) toast(t('micHint'), 2400);
      return false;
    }
    if (P.qOpen === false) { toast(t('qClosedHint'), 2800); updateQaUI(); return false; }
    if (!P.conn || !P.conn.open) {
      // 繋がっていないことを黙って捨てない（v7：理由を画面に残す）
      const msg = t('qNoConn');
      setQHintText(msg);
      setQLiveText('⚠️ offline');
      toast(msg, 3600);
      return false;
    }
    if (P.qInterimTimer) { clearTimeout(P.qInterimTimer); P.qInterimTimer = null; }
    const id = (opts && opts.id) || P.qQid || ('gq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    P.conn.send({ t: 'question', id, lang: S.myLang || 'en', text: body, ts: Date.now() });
    toast(t('sent'), 2400);
    return true;
  }

  function onHostData(msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'interim':
        renderInterim(msg);
        break;
      case 'cap':
        renderPEntry({ id: msg.id, ja: msg.ja, ts: msg.ts, tr: {} });
        break;
      case 'tr':
        applyTr(msg.id, msg.tr || {});
        break;
      case 'history':
        (msg.items || []).forEach(it => renderPEntry(it, { silent: true }));
        break;
      case 'init':
        if (msg.qOpen === false) { P.qOpen = false; updateQaUI(); }
        else if (msg.qOpen === true) { P.qOpen = true; updateQaUI(); }
        if (!P.joined && S.myLang) sendHello();
        break;
      case 'tour_end':
        // 会話終了：お土産（要約＋メアド登録）のポップアップを出す
        showGift(msg);
        break;
      case 'qopen':
        P.qOpen = msg.open !== false;
        updateQaUI();
        if (!P.qOpen) {
          if (P.qRec) stopQMic(true);
          toast(t('qClosedHint'), 2600);
        }
        break;
    }
  }

  /* ---------------- 言語選択 ---------------- */
  function buildLangGrid(sel, onPick) {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = LANGS.map(L =>
      '<button class="lang-btn" type="button" data-lang="' + L.code + '">' +
        '<span class="flag" aria-hidden="true">' + L.flag + '</span>' +
        '<span class="lang-name">' + esc(L.native) + '</span>' +
        '<span class="lang-ja">' + esc(L.ja) + '</span>' +
      '</button>'
    ).join('');
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-btn');
      if (!btn) return;
      onPick(btn.dataset.lang);
    });
  }

  function highlightLang() {
    // 言語を選ぶ前の画面では「選んだ」ように見せない（推測した言語を強調しない）
    const pick = $('#pLangPick');
    const onPickScreen = !!pick && !pick.classList.contains('hidden');
    $$('.lang-btn').forEach(b => b.classList.toggle('on', !onPickScreen && b.dataset.lang === S.myLang));
    const tag = $('#pLangTag');
    if (tag) {
      const L = LANG_MAP[S.myLang];
      tag.textContent = L ? (L.flag + ' ' + L.native) : '';
    }
  }

  function pickMyLang(code) {
    if (!LANG_MAP[code]) return;
    // 言語選択画面からのタップか（設定シートからの変更とは分ける）
    const entering = !!($('#pLangPick') && !$('#pLangPick').classList.contains('hidden'));
    const changed = S.myLang !== code;
    S.myLang = code;
    saveSettings();
    highlightLang();
    applyGuestText();
    enterStage();
    if (P.conn && P.conn.open) {
      if (P.joined) {
        P.conn.send({ t: 'lang', lang: code, refresh: true });
      } else {
        sendHello();
      }
    }
    if (changed) {
      // 言語を変えたら前の言語の字幕は消す（混ざると読みにくいため）
      const box = $('#pCaptions');
      if (box) box.innerHTML = waitingHtml('waitLang');
      P.waitKey = 'waitLang';
      P.seen.clear();
      P.pinnedUp = false;
    }
    P.joined = true;
    closeSheet();
    // 入室の1タップで音声もONにする
    if (entering) enableSoundOnEntry();
  }

  // 入室の1タップで「言語を選ぶ＋音声をON」を済ませる。
  // クリック処理と同じタスクの中で speak するので、iOS Safari でもそのまま音が出る。
  function enableSoundOnEntry() {
    S.pTts = true;
    saveSettings();
    applyParticipantLook();     // 🔊 音声 ON の表示にする
    unlockVoice();              // 同じタスクで確認音声を鳴らし、音声を解除する
  }

  function enterStage() {
    $('#pLangPick').classList.add('hidden');
    $('#pStage').classList.remove('hidden');
    const fab = $('#btnQAsk');
    if (fab) fab.classList.remove('hidden');
    highlightLang();           // 上部の言語タグも選んだ言語に合わせる
    applyGuestText();          // 選んだ言語でUI文言をそろえる
    applyParticipantLook();
    if (!S.pTts) $('#btnTts').classList.remove('on');
    else $('#btnTts').classList.add('on');
    if (VOICE.unlocked) $('#btnVoice').classList.add('hidden');
    updateQaUI();
    if (A.role === 'participant') P.joined = true;
    if (P.joined && P.conn && P.conn.open) sendHello();
  }

  function applyParticipantLook() {
    const box = $('#pCaptions');
    if (box) {
      box.className = 'p-captions mode-' + (S.pDisplay || 'both');
    }
    const stage = $('#pStage');
    if (stage) stage.style.setProperty('--fs', String(clamp(S.pFont || 1, 0.85, 1.5)));
    const btn = $('#btnDisplay');
    if (btn) btn.textContent = S.pDisplay === 'translation' ? t('displayTr') : S.pDisplay === 'original' ? t('displayOrig') : t('displayBoth');
    const tts = $('#btnTts');
    if (tts) {
      tts.classList.toggle('on', !!S.pTts);
      tts.textContent = S.pTts ? t('voiceOn') : t('voiceOff');
    }
    const voice = $('#btnVoice');
    if (voice) voice.textContent = t('voiceEnable');
    const rate = $('#btnRate');
    if (rate) {
      rate.textContent = '⏩ ' + rateLabel(speechRate());
      rate.classList.toggle('on', speechRate() !== 1);
      rate.setAttribute('aria-label', t('rate') + ' ' + rateLabel(speechRate()));
    }
    // 消灯防止：音声ON/OFFや役割に関係なく、画面を開いている間は起きている（v9）
    requestWakeLock();
  }

  /* ---------------- 字幕の描画 ---------------- */
  // ガイドが話している途中の日本語（と、あれば先行の訳）をリアルタイムに出す
  function renderInterim(msg) {
    const box = $('#pCaptions');
    if (!box) return;
    const ja = String(msg.ja || '').trim();
    let el = box.querySelector('.p-live');
    if (!ja) {
      if (el) el.remove();
      return;
    }
    const wait = $('#pWaiting');
    if (wait) wait.remove();

    if (!el) {
      el = document.createElement('article');
      el.className = 'p-live';
      el.innerHTML = '<p class="p-live-tr empty" data-ltr></p>' +
                     '<p class="p-live-ja" data-lja></p>';
      box.appendChild(el);
    }
    el.querySelector('[data-lja]').textContent = ja;

    const tr = msg.tr && S.myLang ? msg.tr[S.myLang] : null;
    const trEl = el.querySelector('[data-ltr]');
    if (tr && tr.text) {
      trEl.textContent = tr.text;
      trEl.className = 'p-live-tr';
    } else {
      trEl.textContent = '';
      trEl.className = 'p-live-tr empty';
    }

    P.lastCaptionAt = Date.now();
    scrollToLatest();
    updateJump();
  }

  function renderPEntry(item, opts = {}) {
    const box = $('#pCaptions');
    if (!box) return;
    const wait = $('#pWaiting');
    if (wait) wait.remove();
    const live = box.querySelector('.p-live');
    if (live) live.remove();          // 確定文が来たら途中表示は消す

    const existing = box.querySelector('.p-entry[data-id="' + item.id + '"]');
    if (existing) { applyTr(item.id, item.tr || {}); return; }

    const tr = item.tr && item.tr[S.myLang];
    const el = document.createElement('article');
    el.className = 'p-entry';
    el.dataset.id = item.id;
    el.innerHTML =
      '<p class="p-tr pending" data-tr></p>' +
      '<p class="p-ja">' + esc(item.ja) + '</p>';
    box.appendChild(el);

    if (tr) fillPEntry(el, tr, opts.silent);

    P.lastCaptionAt = Date.now();
    trimEntries(box);
    scrollToLatest();
    updateJump();
  }

  function applyTr(id, trMap) {
    const el = document.querySelector('.p-entry[data-id="' + id + '"]');
    if (!el) return;
    const tr = trMap && trMap[S.myLang];
    if (!tr) return;
    fillPEntry(el, tr, false);
  }

  function fillPEntry(el, tr, silent) {
    const p = el.querySelector('[data-tr]');
    if (!p) return;
    // 先行翻訳の「途中までの訳」は、あとから本番の訳で上書きする
    const replaceProv = p.dataset.filled === '1' && p.dataset.prov === '1' && !tr.provisional;
    if (p.dataset.filled === '1' && !replaceProv) return;
    p.textContent = tr.text;
    p.classList.remove('pending');
    p.classList.toggle('degraded', !!tr.degraded);
    p.classList.toggle('provisional', !!tr.provisional);
    p.dataset.filled = '1';
    p.dataset.prov = tr.provisional ? '1' : '0';
    if (!silent && !tr.provisional && S.pTts) speakQueue(tr.text, S.myLang);
    if (!silent && !VOICE.unlocked) {
      $('#btnVoice').classList.remove('hidden');
    }
  }

  function trimEntries(box) {
    while (box.querySelectorAll('.p-entry').length > 80) {
      const first = box.querySelector('.p-entry');
      if (first) first.remove(); else break;
    }
  }

  // 原則、字幕はいつも一番下（最新）へ自動追従する。
  // 過去を読み返している（大きく上へスクロールした）ときだけ一時停止する。
  function scrollToLatest(force) {
    const box = $('#pCaptions');
    if (!box) return;
    if (!force && P.pinnedUp) return;
    if (P.rafId) return;          // 次の描画で追従する予約が入っている
    const run = () => {
      P.rafId = 0;
      const b = $('#pCaptions');
      if (!b) return;
      b.scrollTop = b.scrollHeight;   // レイアウト確定後（rAF）に実行
    };
    if (typeof requestAnimationFrame === 'function') P.rafId = requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  function nearBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }

  function onCaptionsScroll() {
    const box = $('#pCaptions');
    if (!box) return;
    P.pinnedUp = !nearBottom(box);   // 上へ戻って読み返している間は追従を止める
    updateJump();
  }

  function updateJump() {
    const box = $('#pCaptions');
    const btn = $('#btnJump');
    if (!box || !btn) return;
    btn.classList.toggle('hidden', nearBottom(box) || !box.querySelector('.p-entry'));
  }

  /* ---------------- 読み上げ ---------------- */
  function refreshVoices() {
    try { VOICE.voices = window.speechSynthesis.getVoices() || []; } catch (e) { VOICE.voices = []; }
  }

  // 言語情報（ガイドの日本語読み上げも扱うため ja を補う）
  function langInfo(code) {
    if (LANG_MAP[code]) return LANG_MAP[code];
    if (code === 'ja') return { code: 'ja', bcp47: 'ja-JP', flag: '🇯🇵', ja: '日本語', native: '日本語' };
    return LANG_MAP.en;
  }

  // 音声の選び方（v7）：
  //  1) 端末内蔵（localService:true）を最優先（オフラインでも確実に鳴る）
  //  2) 同スコアで内蔵が無ければ、ネットワーク音声（localService:false）も使う
  //     Android の Google 音声合成は「ネットワーク音声」扱いのことがあり、
  //     これを除外すると u.voice が未指定になり、端末によっては無音になるため。
  //  3) それでも一致が無ければ null（u.lang だけ指定して OS の既定音声に任せる）
  function pickVoice(langCode) {
    const L = langInfo(langCode);
    if (!L) return null;
    if (!VOICE.voices.length) refreshVoices();      // onvoiceschanged が来ていない端末の保険
    const list = VOICE.voices || [];
    if (!list.length) return null;
    const want = String(L.bcp47).toLowerCase().replace('_', '-');
    const prefix = want.split('-')[0];
    let best = null, bestScore = 0, bestLocal = false;
    for (const v of list) {
      if (!v) continue;
      const vl = String(v.lang || '').toLowerCase().replace('_', '-');
      const score = vl === want ? 2 : (vl.split('-')[0] === prefix ? 1 : 0);
      if (!score) continue;
      const local = v.localService === true;
      if (score > bestScore || (score === bestScore && local && !bestLocal)) {
        best = v; bestScore = score; bestLocal = local;
      }
    }
    return best;
  }

  function makeUtterance(text, langCode) {
    const L = langInfo(langCode);
    let u;
    try { u = new SpeechSynthesisUtterance(String(text == null ? '' : text)); }
    catch (e) { return null; }
    u.lang = L.bcp47;
    const v = pickVoice(langCode);
    if (v) u.voice = v;        // 無ければ設定しない（OS標準の既定音声に任せる）
    u.rate = speechRate();
    u.volume = 1;              // スマホのスピーカーで聞こえる音量
    u.pitch = 1;
    return u;
  }

  const RATES = [1, 1.15, 1.3];
  const rateLabel = (v) => (Math.abs(Number(v) - 1) < 0.01 ? '1.0' : String(Number(v))) + 'x';
  function speechRate() {
    const v = Number(S.pRate);
    return RATES.includes(v) ? v : 1;
  }

  // 画面を開いて使っている間は、ガイド側もゲスト側も消灯させない（v9）。
  // 1) まず Screen Wake Lock API（Android Chrome など）
  // 2) それが無い／弾かれる端末（iPhone Safari 等）は、無音・極小のループ動画で代用
  function requestWakeLock() {
    if (document.visibilityState === 'hidden') return;
    if (!('wakeLock' in navigator) || !navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') {
      AWAKE.needed = true;
      startNoSleepVideo();
      return;
    }
    if (VOICE.wake && !VOICE.wake.released) return;
    try {
      const req = navigator.wakeLock.request('screen');
      if (req && typeof req.then === 'function') {
        req.then((lock) => {
          VOICE.wake = lock;
          if (lock && lock.addEventListener) lock.addEventListener('release', () => { VOICE.wake = null; });
        }).catch(() => {
          // 省電力モード・非対応などで弾かれた → 動画フォールバックへ
          VOICE.wake = null;
          AWAKE.needed = true;
          startNoSleepVideo();
        });
      }
    } catch (e) {
      VOICE.wake = null;     // 省電力モードなどでは取得できない
      AWAKE.needed = true;
      startNoSleepVideo();
    }
  }

  function releaseWakeLock() {
    const lock = VOICE.wake;
    VOICE.wake = null;
    if (lock && typeof lock.release === 'function') { try { lock.release(); } catch (e) {} }
  }

  // 無音・極小（2×2px, 1fps）のループ動画。音声を含まないので TTS と競合しない。
  function ensureNoSleepVideo() {
    if (AWAKE.video) return AWAKE.video;
    let stream = null;
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 2;
      if (typeof c.captureStream === 'function') {
        const ctx = c.getContext && c.getContext('2d');
        if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 2, 2); }
        stream = c.captureStream(1);         // 1fps・静止画のままでOK（重くしない）
      }
    } catch (e) { stream = null; }
    if (!stream) return null;
    const v = document.createElement('video');
    v.muted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.playsInline = true;
    v.loop = true;
    v.autoplay = true;
    v.tabIndex = -1;
    v.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
    try { v.srcObject = stream; } catch (e) {}
    try { document.body.appendChild(v); } catch (e) {}
    AWAKE.stream = stream;
    AWAKE.video = v;
    return v;
  }

  // 動画の再生にはユーザー操作が要る端末があるので、最初のタップのときにだけ作って再生する
  function startNoSleepVideo() {
    if (!AWAKE.needed || AWAKE.playing) return;
    if (VOICE.wake && !VOICE.wake.released) return;   // Wake Lock が効いているなら不要
    if (!AWAKE.gesture) return;                       // タップ前には作らない
    if (document.visibilityState === 'hidden') return;
    const v = ensureNoSleepVideo();
    if (!v || typeof v.play !== 'function') return;
    try {
      const p = v.play();
      AWAKE.playing = true;
      if (p && typeof p.catch === 'function') p.catch(() => { AWAKE.playing = false; });
    } catch (e) { AWAKE.playing = false; }
  }

  // 最初のタップで：消灯防止の準備と、ガイド側TTSの解除（無音で）
  function onUserGesture() {
    AWAKE.gesture = true;
    if (!(VOICE.wake && !VOICE.wake.released)) requestWakeLock();
    if (AWAKE.needed) startNoSleepVideo();
    warmGuideVoice();
  }

  // ガイドの質問読み上げは既定ON。タップの中で無音の発話を1つ流して音声を解除しておく
  // （音量0なので聞こえない。iOS Safari でも最初の質問から読み上げが鳴るようにするため）
  function warmGuideVoice() {
    if (A.role !== 'guide' || VOICE.unlocked) return;
    if (!('speechSynthesis' in window)) return;
    VOICE.unlocked = true;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 無音の解除は失敗しても構わない */ }
  }

  // Android Chrome は speechSynthesis が長時間の無音で止まることがある → 定期的に叩き起こす
  function startVoiceWatchdog() {
    if (VOICE.watchdog) return;
    VOICE.watchdog = setInterval(() => {
      if (A.role === 'participant' && !S.pTts) return;
      const syn = window.speechSynthesis;
      if (!syn) return;
      try { if (syn.paused) syn.resume(); } catch (e) {}
      // 実際には止まっているのに「話し中」のままになっていたら次へ進める（スタック防止）
      const started = VOICE.spokeAt && Date.now() - VOICE.spokeAt > 1200;
      const stuck = VOICE.speaking && started && !syn.speaking && !syn.pending;
      const tooLong = VOICE.speaking && VOICE.spokeAt && Date.now() - VOICE.spokeAt > 15000;
      if (stuck || tooLong) {
        VOICE.speaking = false;
        VOICE.spokeAt = 0;
        pumpSpeech();
      }
    }, 4000);
  }

  function speechSynth() {
    try { return window.speechSynthesis || null; } catch (e) { return null; }
  }

  // cancel() の直後に speak() すると Android Chrome で次の発話が消えるため、時刻を控えておく
  function cancelSpeech() {
    VOICE.queue = [];
    VOICE.speaking = false;
    VOICE.spokeAt = 0;
    clearTimeout(VOICE.diagTimer);
    VOICE.diagTimer = null;
    const syn = speechSynth();
    if (!syn) return;
    VOICE.canceledAt = Date.now();
    try { syn.cancel(); } catch (e) {}
  }

  function speakDelay() {
    return Math.max(0, 50 - (Date.now() - (VOICE.canceledAt || 0)));
  }

  // 発話を鳴らす。forceSync=true なら今のタスク（タップ＝ユーザージェスチャー内）で即 speak()。
  // 50ms 待つのは cancel() の直後だけで、それ以外は待たずに鳴らす（ジェスチャーの文脈を切らない）。
  function speakOrDefer(u, onFail, forceSync) {
    const delay = forceSync ? 0 : speakDelay();
    const fire = () => {
      try {
        const syn = window.speechSynthesis;
        // paused のまま止まっている端末（Android でよくある）は、先に resume してから鳴らす
        if (syn && syn.paused) { try { syn.resume(); } catch (e) {} }
        syn.speak(u);
      } catch (e) { if (onFail) onFail(); }
    };
    if (delay <= 0) { fire(); return; }
    setTimeout(fire, delay);
  }

  // 1件を確実に鳴らす（cancel 直後だけ 50ms 待つ。opts.sync で必ず同期）
  function speakNow(u, opts) {
    if (!u) return;
    VOICE.speaking = true;
    VOICE.spokeAt = Date.now();
    const clear = () => {
      VOICE.speaking = false;
      VOICE.spokeAt = 0;
      clearTimeout(VOICE.guard);
      VOICE.guard = null;
    };
    u.onend = clear;
    u.onerror = clear;
    // onend が来ない端末でも「話し中」のまま固まらないようにする
    clearTimeout(VOICE.guard);
    VOICE.guard = setTimeout(clear, Math.max(4000, String(u.text || '').length * 200 + 2000));
    if (opts && opts.diag) diagnoseSpeech(u);   // 鳴らなかった時の原因表示（既存ハンドラを包む）
    speakOrDefer(u, clear, !!(opts && opts.sync));
  }

  /* ---- 音が出ないときの案内：無応答のときだけ短く1行 ---- */
  function setVoiceNotice(msg) {
    const el = $('#voiceHint');
    if (el) {
      el.textContent = msg || '';
      el.classList.toggle('hidden', !msg);
    }
  }

  // 1.5秒たっても onstart も onend も返ってこない（またはエラーになった）ときにだけ、
  // 「マナーモードと音量」を1行だけ出す。長い診断はしない。
  function diagnoseSpeech(u) {
    if (!u) return u;
    const st = { started: false, ended: false, shown: false };
    const prevStart = u.onstart, prevEnd = u.onend, prevErr = u.onerror;
    const show = () => {
      if (st.shown) return;
      st.shown = true;
      clearTimeout(VOICE.diagTimer);
      VOICE.diagTimer = null;
      if (A.role === 'participant') setVoiceNotice(t('voiceMuteHint'));
      else toast('音が出ないときは、マナーモード解除と音量をご確認ください（iPhoneは消音スイッチで無音になります）', 5000);
    };
    u.onstart = (ev) => { st.started = true; setVoiceNotice(''); if (prevStart) prevStart(ev); };
    u.onend = (ev) => { st.ended = true; if (prevEnd) prevEnd(ev); };
    u.onerror = (ev) => {
      const err = (ev && (ev.error || ev.message)) || 'error';
      if (prevErr) prevErr(ev);
      // 自分で止めただけ（cancel / interrupted）は「音が出ない」原因ではない
      if (/interrupt|cancel/i.test(String(err))) return;
      show();
    };
    clearTimeout(VOICE.diagTimer);
    VOICE.diagTimer = setTimeout(() => {
      VOICE.diagTimer = null;
      if (st.started || st.ended || st.shown) return;
      show();
    }, 1500);
    return u;
  }

  // 音声ON：タップと同じタスクで、そのまま短い確認音声を speak する
  // （iOS Safari はタップの中で speechSynthesis.speak() を呼んだ時に音声を開く。
  //   ここで AudioContext など他の音を鳴らすとオーディオセッションが競合して無音になるため、TTS だけにする）
  function unlockVoice() {
    if (!('speechSynthesis' in window)) {
      toast(t('voiceUnsupported'));
      return;
    }
    refreshVoices();
    VOICE.unlocked = true;
    const b = $('#btnVoice');
    if (b) b.classList.add('hidden');
    const lang = S.myLang || 'en';
    speakNow(makeUtterance(t('speakOk'), lang), { sync: true, diag: true });
    requestWakeLock();
    toast(t('voiceOnToast'), 3000);
  }

  function speakQueue(text, langCode, opts) {
    if (!('speechSynthesis' in window)) return;
    if (!(opts && opts.force) && !S.pTts) return;
    if (!VOICE.unlocked) {
      if (A.role === 'participant') {
        const b = $('#btnVoice');
        if (b) b.classList.remove('hidden');
      }
      return;
    }
    // 遅れがたまったら古いものを捨てて、今の話に追いつく（最新2件だけ残す）
    if (VOICE.queue.length >= 2) VOICE.queue.shift();
    VOICE.queue.push({ text, lang: langCode });
    pumpSpeech();
  }

  function pumpSpeech() {
    if (VOICE.speaking || !VOICE.queue.length) return;
    const job = VOICE.queue.shift();
    const u = makeUtterance(job.text, job.lang);
    if (!u) { setTimeout(pumpSpeech, 80); return; }
    const done = () => {
      VOICE.speaking = false;
      VOICE.spokeAt = 0;
      clearTimeout(VOICE.guard);
      VOICE.guard = null;
      setTimeout(pumpSpeech, 80);
    };
    u.onend = done;
    u.onerror = done;
    VOICE.speaking = true;
    VOICE.spokeAt = Date.now();
    // onend が来ない端末でも次の文へ進める（発話スタックの防止）
    clearTimeout(VOICE.guard);
    VOICE.guard = setTimeout(done, Math.max(4000, String(u.text || '').length * 200 + 2000));
    // cancel() 直後だけ待つ。それ以外は即 speak する（余計な setTimeout で無音にならないように）
    speakOrDefer(u, done, false);
  }

  // ガイド側：ゲストの質問（日本語訳）を読み上げる
  function guideSpeak(text) {
    if (!S.qSpeak) return;
    const body = String(text || '').trim();
    if (!body) return;
    if (!('speechSynthesis' in window)) return;
    VOICE.unlocked = true;      // トグルを押したジェスチャーの流れで解除済み
    if (VOICE.queue.length >= 2) VOICE.queue.shift();
    VOICE.queue.push({ text: body, lang: 'ja' });
    pumpSpeech();
  }

  function stopGuideSpeak() {
    VOICE.queue = [];
    cancelSpeech();
  }

  function updateQSpeak() {
    const b = $('#btnQSpeak');
    if (!b) return;
    b.classList.toggle('on', !!S.qSpeak);
    b.textContent = S.qSpeak ? '🔊 質問を読み上げ ON' : '🔇 質問を読み上げ OFF';
  }

  /* ---------------------------------------------------------
     10. UI の配線
  --------------------------------------------------------- */
  function bindUI() {
    $('#btnStart').addEventListener('click', onStartHosting);
    $('#btnMic').addEventListener('click', toggleMic);
    $('#btnSendText').addEventListener('click', sendManual);
    $('#manualText').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendManual();
    });
    $('#btnClear').addEventListener('click', () => {
      A.history = [];
      $('#guideLog').innerHTML = '<p class="empty">ここに「話した日本語」と各言語の翻訳が表示されます。</p>';
      $('#liveCount').textContent = '0件';
    });

    $('#btnCopy').addEventListener('click', async () => {
      const url = $('#joinUrl').value || joinUrl();
      try {
        if (navigator.share) { await navigator.share({ title: 'QR同時通訳', url }); return; }
      } catch (e) { /* キャンセル */ }
      try {
        await navigator.clipboard.writeText(url);
        toast('参加用URLをコピーしました');
      } catch (e) {
        const inp = $('#joinUrl');
        inp.select();
        toast('長押しでコピーしてください');
      }
    });

    $('#linkParticipant').addEventListener('click', (e) => {
      e.preventDefault();
      location.href = joinUrl();
    });

    // 設定
    $('#btnSettings').addEventListener('click', () => openSheet('guide'));
    $('#enginePill').addEventListener('click', () => openSheet('guide'));
    $('#btnPSettings').addEventListener('click', () => openSheet('participant'));
    $('#btnSheetClose').addEventListener('click', closeSheet);
    $('#sheetBackdrop').addEventListener('click', closeSheet);
    $('#btnSheetSave').addEventListener('click', saveSheet);

    $$('input[name="engine"]').forEach(r => r.addEventListener('change', updateEngineFields));
    $$('input[name="asr"]').forEach(r => r.addEventListener('change', updateAsrFields));

    // 先行翻訳（低遅延）のクイックトグル
    $('#btnPrefetch').addEventListener('click', () => {
      S.prefetch = !S.prefetch;
      saveSettings();
      toast(S.prefetch
        ? '先行翻訳モードをONにしました（話している途中から訳を用意します）'
        : '先行翻訳モードをOFFにしました');
    });

    $('#btnGlossAdd').addEventListener('click', addGloss);
    $('#glossTr').addEventListener('keydown', (e) => { if (e.key === 'Enter') addGloss(); });
    $('#glossList').addEventListener('click', (e) => {
      const btn = e.target.closest('.del');
      if (!btn) return;
      const i = Number(btn.dataset.i);
      S.glossary.splice(i, 1);
      saveSettings();
      renderGloss();
    });

    $('#previewLangs').addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      const code = cb.value;
      const i = S.previewLangs.indexOf(code);
      if (cb.checked && i < 0) S.previewLangs.push(code);
      if (!cb.checked && i >= 0) S.previewLangs.splice(i, 1);
      if (!S.previewLangs.length) S.previewLangs.push('en');
      saveSettings();
      renderPreviewChecks();
    });

    // 参加者の操作
    $('#btnVoice').addEventListener('click', unlockVoice);
    $('#btnTts').addEventListener('click', () => {
      S.pTts = !S.pTts;
      saveSettings();
      applyParticipantLook();
      if (S.pTts) {
        // 音声ONを押したら、その場で選択中の言語の確認音声を鳴らす
        unlockVoice();
      } else {
        cancelSpeech();
        requestWakeLock();      // 音声OFFでも画面は起きたまま（v9）
      }
    });
    $('#btnRate').addEventListener('click', () => {
      const cur = speechRate();
      const i = RATES.findIndex(v => Math.abs(v - cur) < 0.01);
      S.pRate = RATES[(i + 1) % RATES.length];
      saveSettings();
      applyParticipantLook();
      toast('読み上げ速度: ' + rateLabel(S.pRate) + '（次の文から適用）');
    });
    $('#btnDisplay').addEventListener('click', () => {
      S.pDisplay = S.pDisplay === 'both' ? 'translation' : S.pDisplay === 'translation' ? 'original' : 'both';
      saveSettings();
      applyParticipantLook();
    });
    $('#btnFont').addEventListener('click', () => {
      const sizes = [1, 1.15, 1.3, 1.45, 0.9];
      const i = sizes.findIndex(v => Math.abs(v - S.pFont) < 0.01);
      S.pFont = sizes[(i + 1) % sizes.length];
      saveSettings();
      applyParticipantLook();
    });
    $('#btnJump').addEventListener('click', () => {
      P.pinnedUp = false;
      scrollToLatest(true);
      updateJump();
    });
    $('#pCaptions').addEventListener('scroll', onCaptionsScroll, { passive: true });
    window.addEventListener('resize', () => { if (!P.pinnedUp) scrollToLatest(true); });

    // 質問（双方向・フローティングマイク）
    $('#btnQAsk').addEventListener('click', () => {
      if ($('#btnQAsk').dataset.gift) openGiftPop();
      else openQaPop();
    });
    $('#qClose').addEventListener('click', closeQaPop);
    $('#qMic').addEventListener('click', toggleQMic);

    // お土産（ガイド：終了して送る／ゲスト：メール受け取り・保存）
    $('#btnEndTour').addEventListener('click', onEndTourClick);
    $('#btnGiftCopy').addEventListener('click', async () => {
      const ta = $('#giftPreview');
      const ok = await copyText(ta ? ta.value : '');
      toast(ok ? 'お土産まとめをコピーしました' : 'コピーできませんでした。テキストを長押しで選択してください');
    });
    $('#btnGiftDownload').addEventListener('click', () => {
      const ta = $('#giftPreview');
      const text = ta ? ta.value : '';
      if (!text) return;
      const ok = downloadText(giftFileName(), text);
      toast(ok ? 'テキストで保存しました' : '保存できませんでした（長押しでコピーしてください）');
    });
    $('#giftClose').addEventListener('click', closeGiftPop);
    $('#giftForm').addEventListener('submit', submitGift);
    $('#giftCopy').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const ok = await copyText(P.gift ? P.gift.summary : '');
      if (ok && btn) {
        const txt = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = txt; }, 1500);
      } else {
        toast(t('giftSendFailed'));
      }
    });
    $('#giftDl').addEventListener('click', () => {
      if (!P.gift) return;
      const ok = downloadText(giftFileName(P.gift.ts), P.gift.summary);
      if (!ok) setGiftMsg(t('giftSendFailed'), 'warn');
    });

    // ガイド側：質問の読み上げ（v9：既定ON）
    $('#btnQSpeak').addEventListener('click', () => {
      S.qSpeak = !S.qSpeak;
      S.qSpeakUserSet = true;      // 本人が切り替えたら、以後はその値を保存して使う
      saveSettings();
      updateQSpeak();
      if (S.qSpeak && 'speechSynthesis' in window) {
        // 押したジェスチャーのうちに、短い確認音声をそのまま同期的に鳴らす
        VOICE.unlocked = true;
        refreshVoices();
        speakNow(makeUtterance('質問の読み上げを開始します', 'ja'), { sync: true, diag: true });
        toast('ゲストの質問を日本語で読み上げます');
      } else if (!S.qSpeak) {
        stopGuideSpeak();
        toast('質問の読み上げをOFFにしました');
      }
    });

    // ガイド側：質問パネル
    $('#qToggle').addEventListener('change', (e) => {
      setQOpen(e.target.checked);
      toast(e.target.checked ? 'ゲストからの質問を受け付けます' : '質問受付をOFFにしました（接続中のゲスト全員に反映）');
    });
    $('#qList').addEventListener('click', (e) => {
      const btn = e.target.closest('.q-done');
      if (!btn) return;
      if (A.qLive && String(A.qLive.id) === String(btn.dataset.id)) A.qLive = null;
      A.questions = A.questions.filter(q => q.id !== btn.dataset.id);
      renderQuestions();
    });

    $('#btnHelp').addEventListener('click', () => {
      $('#helpSheet').classList.remove('hidden');
      $('#sheetBackdrop').classList.remove('hidden');
    });
    $('#btnHelpClose').addEventListener('click', () => {
      $('#helpSheet').classList.add('hidden');
      if ($('#sheet').classList.contains('hidden')) $('#sheetBackdrop').classList.add('hidden');
    });

    $('#pDisplay').addEventListener('change', (e) => {
      S.pDisplay = e.target.value;
      saveSettings();
      applyParticipantLook();
    });
    $('#pFont').addEventListener('input', (e) => {
      S.pFont = clamp(e.target.value, 0.85, 1.5);
      saveSettings();
      applyParticipantLook();
    });
    $('#pTts').addEventListener('change', (e) => {
      S.pTts = e.target.checked;
      saveSettings();
      applyParticipantLook();
    });
  }

  function sendManual() {
    const ta = $('#manualText');
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    ta.value = '';
    publishCaption(text);
  }

  /* ---------------- 設定シート ---------------- */
  function openSheet(mode) {
    fillSheet();
    $$('.sheet-section[data-mode]').forEach(sec => {
      sec.classList.toggle('hidden', sec.dataset.mode !== mode);
    });
    $('#sheetTitle').textContent = mode === 'guide' ? '設定（ガイド）' : '設定（参加者）';
    $('#sheet').classList.remove('hidden');
    $('#sheetBackdrop').classList.remove('hidden');
    $('#helpSheet').classList.add('hidden');
  }

  function closeSheet() {
    $('#sheet').classList.add('hidden');
    $('#helpSheet').classList.add('hidden');
    $('#sheetBackdrop').classList.add('hidden');
  }

  function fillSheet() {
    $$('input[name="engine"]').forEach(r => { r.checked = r.value === S.engine; });
    $('#openaiKey').value = S.openaiKey || '';
    $('#openaiModel').value = S.openaiModel || '';
    $('#geminiKey').value = S.geminiKey || '';
    $('#geminiModel').value = S.geminiModel || '';

    $$('input[name="asr"]').forEach(r => { r.checked = r.value === S.asr; });
    $('#transcribeModel').value = S.transcribeModel || '';
    $('#chunkSec').value = S.chunkSec || 6;

    $('#peerHost').value = S.peerHost || '';
    $('#peerPort').value = S.peerPort || '';
    $('#peerPath').value = S.peerPath || '';
    $('#iceExtra').value = S.iceExtra || '';
    $('#iceExtraP').value = S.iceExtra || '';
    $('#giftUrl').value = S.giftUrl || '';

    $('#pDisplay').value = S.pDisplay || 'both';
    $('#pFont').value = S.pFont || 1;
    $('#pTts').checked = !!S.pTts;

    $('#prefetch').checked = !!S.prefetch;
    $('#flushMs').value = S.flushMs || 750;
    $('#maxChars').value = S.maxChars || 20;

    renderGloss();
    renderPreviewChecks();
    updateEngineFields();
    updateAsrFields();
    highlightLang();
  }

  function saveSheet() {
    const engine = (document.querySelector('input[name="engine"]:checked') || {}).value || 'trial';
    const asr = (document.querySelector('input[name="asr"]:checked') || {}).value || 'webspeech';

    S.engine = engine;
    S.openaiKey = $('#openaiKey').value.trim();
    S.openaiModel = $('#openaiModel').value.trim() || DEFAULTS.openaiModel;
    S.geminiKey = $('#geminiKey').value.trim();
    S.geminiModel = $('#geminiModel').value.trim() || DEFAULTS.geminiModel;
    S.asr = asr;
    S.transcribeModel = $('#transcribeModel').value.trim() || DEFAULTS.transcribeModel;
    S.chunkSec = clamp($('#chunkSec').value || 6, 3, 15);
    S.peerHost = $('#peerHost').value.trim();
    S.peerPort = $('#peerPort').value.trim();
    S.peerPath = $('#peerPath').value.trim();
    S.iceExtra = (A.role === 'guide' ? $('#iceExtra').value : $('#iceExtraP').value).trim();
    S.giftUrl = ($('#giftUrl') ? $('#giftUrl').value : '').trim();

    S.pDisplay = $('#pDisplay').value;
    S.pFont = clamp($('#pFont').value, 0.85, 1.5);
    S.pTts = $('#pTts').checked;

    S.prefetch = $('#prefetch').checked;
    S.flushMs = clamp($('#flushMs').value || 750, 400, 1500);
    S.maxChars = clamp($('#maxChars').value || 20, 10, 60);

    saveSettings();
    applyParticipantLook();
    if (A.role === 'guide' && A.peer) {
      if (openConns().length) setGuideStatus('live', '配信中');
      else setGuideStatus('wait', '参加者を待っています');
    }
    closeSheet();
    toast('設定を保存しました');
  }

  function updateEngineFields() {
    const engine = (document.querySelector('input[name="engine"]:checked') || {}).value || 'trial';
    $$('.field[data-engine]').forEach(f => f.classList.toggle('hidden', f.dataset.engine !== engine));
  }

  function updateAsrFields() {
    const asr = (document.querySelector('input[name="asr"]:checked') || {}).value || 'webspeech';
    $$('.field[data-asr]').forEach(f => f.classList.toggle('hidden', f.dataset.asr !== asr));
  }

  function updateEnginePill() {
    const pill = $('#enginePill');
    if (!pill) return;
    const hasKey = (S.engine === 'openai' && String(S.openaiKey || '').trim()) ||
                   (S.engine === 'gemini' && String(S.geminiKey || '').trim());
    let label;
    let cls = 'pill';
    if (S.engine === 'openai' && hasKey) label = 'OpenAI';
    else if (S.engine === 'gemini' && hasKey) label = 'Gemini';
    else if (S.engine === 'trial') label = 'お試しモード';
    else { label = 'キー未設定（お試し動作）'; cls += ' bad'; }
    pill.className = cls;
    pill.textContent = label;
  }

  function updateAsrLabel() {
    const el = $('#asrMode');
    if (!el) return;
    el.textContent = S.asr === 'transcribe'
      ? '音声認識: ' + (S.transcribeModel || 'gpt-transcribe') + '（' + (Number(S.chunkSec) || 6) + '秒区切り）'
      : '音声認識: Web Speech（ja-JP）';
  }

  const secLabel = (ms) => (clamp(ms, 400, 1500) / 1000).toFixed(2).replace(/\.?0+$/, '');

  function updateLatencyUI() {
    const btn = $('#btnPrefetch');
    if (btn) {
      btn.classList.toggle('on', !!S.prefetch);
      btn.textContent = S.prefetch ? '⚡ 先行翻訳 ON' : '⚡ 先行翻訳 OFF';
    }
    const el = $('#latencyMode');
    if (el) {
      el.textContent = '区切り: 息継ぎ ' + secLabel(Number(S.flushMs) || 750) + '秒 / ' +
                       clamp(Number(S.maxChars) || 20, 10, 60) + '文字';
    }
  }

  function renderGloss() {
    const box = $('#glossList');
    if (!box) return;
    if (!S.glossary.length) {
      box.innerHTML = '<p class="muted small">まだ登録がありません（例: 金閣寺 → Kinkaku-ji）</p>';
      return;
    }
    box.innerHTML = S.glossary.map((g, i) =>
      '<div class="gloss-item"><b>' + esc(g.ja) + '</b><span class="arrow">→</span><span>' + esc(g.tr) + '</span>' +
      '<button class="del" type="button" data-i="' + i + '" aria-label="削除">✕</button></div>'
    ).join('');
  }

  function addGloss() {
    const ja = $('#glossJa').value.trim();
    const tr = $('#glossTr').value.trim();
    if (!ja || !tr) { toast('日本語と訳語の両方を入れてください'); return; }
    S.glossary.push({ ja, tr });
    saveSettings();
    renderGloss();
    $('#glossJa').value = '';
    $('#glossTr').value = '';
  }

  function renderPreviewChecks() {
    const box = $('#previewLangs');
    if (!box) return;
    box.innerHTML = LANGS.slice(0, 8).map(L => {
      const on = S.previewLangs.includes(L.code);
      return '<label class="chip-check' + (on ? ' on' : '') + '">' +
        '<input type="checkbox" value="' + L.code + '"' + (on ? ' checked' : '') + '>' +
        L.flag + ' ' + esc(L.ja) + '</label>';
    }).join('');
  }

  /* ---------------- トースト ---------------- */
  let toastTimer = null;
  function toast(msg, ms = 3200) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

})();
