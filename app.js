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
      langNote: 'Captions start right away. You can change this later.',
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
      micListening: 'Listening… tap to stop', send: 'Send', close: 'Close', sent: 'Question sent',
      qClosed: 'Questions are closed', qClosedHint: 'The guide is not taking questions right now.',
      qNoConn: 'Not connected yet. Please wait a moment.',
      micUnsupported: 'Voice input is not available on this device.',
      voiceUnsupported: 'This device cannot read text aloud.',
      voiceOnToast: 'Sound is on. You will hear the translation from the speaker.',
      speakOk: 'Sound on',
      setTitle: 'Settings', setDisplay: 'Display', setCaptionStyle: 'Captions',
      optBoth: 'Translation + Japanese original', optTr: 'Translation only (large)', optOrig: 'Japanese original only',
      setFontSize: 'Text size', setLang: 'Language', setLangNote: 'New captions will switch to this language.',
      setVoice: 'Speak aloud', setAutoTts: 'Read captions aloud (TTS)',
      setVoiceNote: 'Plays from the phone speaker. The screen stays awake while sound is on.'
    },
    'zh-CN': {
      langTitle: '请选择你的语言', langSub: '点一下即可开始',
      langNote: '选好后马上就能看到字幕，之后也可以更改。',
      voiceEnable: '🔈 开启声音', voiceOn: '🔊 声音开', voiceOff: '🔇 声音关',
      rate: '速度', font: '字体大小', jump: '最新 ↓',
      displayBoth: '译文＋原文', displayTr: '只看译文', displayOrig: '只看原文',
      connecting: '连接中…', connected: '已连接',
      disconnected: '连接断开，正在重连…', netError: '网络错误，正在重连…',
      waitGuide: '等待主持人开始', libFail: '无法加载连接组件', cannotConnect: '无法连接',
      waitStart: '正在等待主持人开始…', waitLang: '正在等待这种语言的字幕…',
      liveLabel: '● 实时翻译中', listening: '正在听…', translating: '翻译中…',
      askShort: '提问', askTitle: '向主持人提问', micHint: '按下麦克风后说话',
      micListening: '正在听…点一下可停止', send: '发送', close: '关闭', sent: '已发送提问',
      qClosed: '已停止接收提问', qClosedHint: '主持人现在不接受提问。',
      qNoConn: '还没有连接上，请稍等。',
      micUnsupported: '此设备无法使用语音输入。', voiceUnsupported: '此设备无法朗读文字。',
      voiceOnToast: '声音已开启，会从扬声器播放译文。', speakOk: '声音已开启',
      setTitle: '设置', setDisplay: '显示', setCaptionStyle: '字幕',
      optBoth: '译文＋日文原文', optTr: '只看译文（大字）', optOrig: '只看日文原文',
      setFontSize: '字体大小', setLang: '语言', setLangNote: '之后到达的字幕会切换成这个语言。',
      setVoice: '朗读', setAutoTts: '自动朗读字幕（TTS）',
      setVoiceNote: '从手机扬声器播放。开启声音时屏幕不会熄灭。'
    },
    'zh-TW': {
      langTitle: '請選擇你的語言', langSub: '點一下即可開始',
      langNote: '選好後馬上就能看到字幕，之後也可以更改。',
      voiceEnable: '🔈 開啟聲音', voiceOn: '🔊 聲音開', voiceOff: '🔇 聲音關',
      rate: '速度', font: '字體大小', jump: '最新 ↓',
      displayBoth: '譯文＋原文', displayTr: '只看譯文', displayOrig: '只看原文',
      connecting: '連線中…', connected: '已連線',
      disconnected: '連線中斷，正在重連…', netError: '網路錯誤，正在重連…',
      waitGuide: '等待主持人開始', libFail: '無法載入連線元件',
      waitStart: '正在等待主持人開始…', waitLang: '正在等待這種語言的字幕…',
      liveLabel: '● 即時翻譯中', listening: '正在聽…', translating: '翻譯中…',
      askShort: '提問', askTitle: '向主持人提問', micHint: '按下麥克風後說話',
      micListening: '正在聽…點一下可停止', send: '傳送', close: '關閉', sent: '已送出提問',
      qClosed: '已停止接收提問', qClosedHint: '主持人現在不接受提問。',
      qNoConn: '還沒連上，請稍等。',
      micUnsupported: '此裝置無法使用語音輸入。', voiceUnsupported: '此裝置無法朗讀文字。',
      voiceOnToast: '聲音已開啟，會從喇叭播放譯文。', speakOk: '聲音已開啟',
      setTitle: '設定', setDisplay: '顯示', setCaptionStyle: '字幕',
      optBoth: '譯文＋日文原文', optTr: '只看譯文（大字）', optOrig: '只看日文原文',
      setFontSize: '字體大小', setLang: '語言', setLangNote: '之後到達的字幕會切換成這個語言。',
      setVoice: '朗讀', setAutoTts: '自動朗讀字幕（TTS）',
      setVoiceNote: '從手機喇叭播放。開啟聲音時螢幕不會熄滅。'
    },
    ko: {
      langTitle: '언어를 선택해 주세요', langSub: '누르면 바로 시작됩니다',
      langNote: '선택하면 바로 자막이 표시됩니다. 나중에 바꿀 수 있습니다.',
      voiceEnable: '🔈 소리 켜기', voiceOn: '🔊 소리 켜짐', voiceOff: '🔇 소리 꺼짐',
      rate: '속도', font: '글자 크기', jump: '최신 ↓',
      displayBoth: '번역＋원문', displayTr: '번역만', displayOrig: '원문만',
      connecting: '연결 중…', connected: '연결되었습니다',
      disconnected: '연결이 끊겼습니다. 다시 연결 중…', netError: '통신 오류. 다시 연결 중…',
      waitGuide: '가이드 시작을 기다리는 중', libFail: '연결 라이브러리를 불러오지 못했습니다',
      waitStart: '가이드가 시작되기를 기다리고 있습니다…', waitLang: '이 언어의 자막을 기다리고 있습니다…',
      liveLabel: '● 동시 통역 중', listening: '듣는 중…', translating: '번역 중…',
      askShort: '질문', askTitle: '가이드에게 질문', micHint: '마이크를 누르고 말하세요',
      micListening: '듣는 중… 누르면 멈춥니다', send: '보내기', close: '닫기', sent: '질문을 보냈습니다',
      qClosed: '질문 접수 중지', qClosedHint: '가이드가 지금은 질문을 받지 않습니다.',
      qNoConn: '아직 연결되지 않았습니다. 잠시 기다려 주세요.',
      micUnsupported: '이 기기에서는 음성 입력을 쓸 수 없습니다.',
      voiceUnsupported: '이 기기는 읽어주기를 지원하지 않습니다.',
      voiceOnToast: '소리를 켰습니다. 스피커로 통역이 나옵니다.', speakOk: '소리 켜짐',
      setTitle: '설정', setDisplay: '표시', setCaptionStyle: '자막',
      optBoth: '번역＋일본어 원문', optTr: '번역만 (크게)', optOrig: '일본어 원문만',
      setFontSize: '글자 크기', setLang: '언어', setLangNote: '이후 자막이 이 언어로 바뀝니다.',
      setVoice: '읽어주기', setAutoTts: '자막 자동 읽기 (TTS)',
      setVoiceNote: '휴대폰 스피커로 나옵니다. 소리가 켜져 있는 동안 화면이 꺼지지 않습니다.'
    },
    es: {
      langTitle: 'Elige tu idioma', langSub: 'Toca un idioma para empezar',
      langNote: 'Los subtítulos empiezan al instante. Puedes cambiarlo después.',
      voiceEnable: '🔈 Activar el sonido', voiceOn: '🔊 Sonido ON', voiceOff: '🔇 Sonido OFF',
      rate: 'Velocidad', font: 'Tamaño de letra', jump: 'Lo último ↓',
      displayBoth: 'Traducción + original', displayTr: 'Solo traducción', displayOrig: 'Solo original',
      connecting: 'Conectando…', connected: 'Conectado',
      disconnected: 'Desconectado. Reconectando…', netError: 'Error de red. Reconectando…',
      waitGuide: 'Esperando al guía', libFail: 'No se pudo cargar la conexión', cannotConnect: 'No se puede conectar',
      waitStart: 'Esperando a que el guía empiece…', waitLang: 'Esperando subtítulos en este idioma…',
      liveLabel: '● Interpretación en vivo', listening: 'Escuchando…', translating: 'Traduciendo…',
      askShort: 'Preguntar', askTitle: 'Pregunta al guía', micHint: 'Toca el micrófono y habla',
      micListening: 'Escuchando… toca para parar', send: 'Enviar', close: 'Cerrar', sent: 'Pregunta enviada',
      qClosed: 'Preguntas cerradas', qClosedHint: 'El guía no acepta preguntas ahora mismo.',
      qNoConn: 'Aún no hay conexión. Espera un momento.',
      micUnsupported: 'Este dispositivo no admite entrada de voz.',
      voiceUnsupported: 'Este dispositivo no puede leer en voz alta.',
      voiceOnToast: 'Sonido activado. Oirás la traducción por el altavoz.', speakOk: 'Sonido activado',
      setTitle: 'Ajustes', setDisplay: 'Pantalla', setCaptionStyle: 'Subtítulos',
      optBoth: 'Traducción + original japonés', optTr: 'Solo traducción (grande)', optOrig: 'Solo original japonés',
      setFontSize: 'Tamaño de letra', setLang: 'Idioma', setLangNote: 'Los próximos subtítulos cambiarán a este idioma.',
      setVoice: 'Lectura en voz alta', setAutoTts: 'Leer los subtítulos (TTS)',
      setVoiceNote: 'Suena por el altavoz del teléfono. La pantalla no se apaga mientras el sonido está activo.'
    },
    fr: {
      langTitle: 'Choisissez votre langue', langSub: 'Touchez une langue pour commencer',
      langNote: 'Les sous-titres démarrent tout de suite. Modifiable ensuite.',
      voiceEnable: '🔈 Activer le son', voiceOn: '🔊 Son ON', voiceOff: '🔇 Son OFF',
      rate: 'Vitesse', font: 'Taille du texte', jump: 'Plus récent ↓',
      displayBoth: 'Traduction + original', displayTr: 'Traduction seule', displayOrig: 'Original seul',
      connecting: 'Connexion…', connected: 'Connecté',
      disconnected: 'Déconnecté. Reconnexion…', netError: 'Erreur réseau. Reconnexion…',
      waitGuide: 'En attente du guide', libFail: 'Impossible de charger la connexion', cannotConnect: 'Connexion impossible',
      waitStart: 'En attente du démarrage du guide…', waitLang: 'En attente des sous-titres dans cette langue…',
      liveLabel: '● Interprétation en direct', listening: 'Écoute…', translating: 'Traduction…',
      askShort: 'Demander', askTitle: 'Poser une question', micHint: 'Touchez le micro et parlez',
      micListening: 'Écoute… touchez pour arrêter', send: 'Envoyer', close: 'Fermer', sent: 'Question envoyée',
      qClosed: 'Questions fermées', qClosedHint: 'Le guide ne prend pas de questions pour le moment.',
      qNoConn: 'Pas encore connecté. Patientez un instant.',
      micUnsupported: 'La saisie vocale n’est pas disponible sur cet appareil.',
      voiceUnsupported: 'Cet appareil ne peut pas lire le texte à voix haute.',
      voiceOnToast: 'Son activé. La traduction sort par le haut-parleur.', speakOk: 'Son activé',
      setTitle: 'Réglages', setDisplay: 'Affichage', setCaptionStyle: 'Sous-titres',
      optBoth: 'Traduction + original japonais', optTr: 'Traduction seule (grande)', optOrig: 'Original japonais seul',
      setFontSize: 'Taille du texte', setLang: 'Langue', setLangNote: 'Les prochains sous-titres passeront dans cette langue.',
      setVoice: 'Lecture à voix haute', setAutoTts: 'Lire les sous-titres (TTS)',
      setVoiceNote: 'Sort par le haut-parleur du téléphone. L’écran reste allumé quand le son est actif.'
    },
    de: {
      langTitle: 'Wählen Sie Ihre Sprache', langSub: 'Sprache antippen und loslegen',
      langNote: 'Die Untertitel starten sofort. Später änderbar.',
      voiceEnable: '🔈 Ton einschalten', voiceOn: '🔊 Ton AN', voiceOff: '🔇 Ton AUS',
      rate: 'Tempo', font: 'Schriftgröße', jump: 'Neueste ↓',
      displayBoth: 'Übersetzung + Original', displayTr: 'Nur Übersetzung', displayOrig: 'Nur Original',
      connecting: 'Verbinden…', connected: 'Verbunden',
      disconnected: 'Getrennt. Verbinde neu…', netError: 'Netzwerkfehler. Verbinde neu…',
      waitGuide: 'Warte auf den Guide', libFail: 'Verbindungsbibliothek nicht geladen', cannotConnect: 'Keine Verbindung möglich',
      waitStart: 'Warte, bis der Guide startet…', waitLang: 'Warte auf Untertitel in dieser Sprache…',
      liveLabel: '● Live-Übersetzung', listening: 'Höre zu…', translating: 'Übersetze…',
      askShort: 'Fragen', askTitle: 'Guide fragen', micHint: 'Mikrofon antippen und sprechen',
      micListening: 'Höre zu… zum Stoppen antippen', send: 'Senden', close: 'Schließen', sent: 'Frage gesendet',
      qClosed: 'Fragen geschlossen', qClosedHint: 'Der Guide nimmt gerade keine Fragen an.',
      qNoConn: 'Noch nicht verbunden. Bitte kurz warten.',
      micUnsupported: 'Spracheingabe ist auf diesem Gerät nicht verfügbar.',
      voiceUnsupported: 'Dieses Gerät kann Text nicht vorlesen.',
      voiceOnToast: 'Ton ist an. Die Übersetzung kommt aus dem Lautsprecher.', speakOk: 'Ton an',
      setTitle: 'Einstellungen', setDisplay: 'Anzeige', setCaptionStyle: 'Untertitel',
      optBoth: 'Übersetzung + japanisches Original', optTr: 'Nur Übersetzung (groß)', optOrig: 'Nur japanisches Original',
      setFontSize: 'Schriftgröße', setLang: 'Sprache', setLangNote: 'Neue Untertitel erscheinen in dieser Sprache.',
      setVoice: 'Vorlesen', setAutoTts: 'Untertitel vorlesen (TTS)',
      setVoiceNote: 'Ton kommt aus dem Telefonlautsprecher. Der Bildschirm bleibt an, solange Ton aktiv ist.'
    },
    pt: {
      langTitle: 'Escolha o seu idioma', langSub: 'Toque no idioma para começar',
      langNote: 'As legendas começam na hora. Dá para mudar depois.',
      voiceEnable: '🔈 Ativar o som', voiceOn: '🔊 Som LIG', voiceOff: '🔇 Som DESL',
      rate: 'Velocidade', font: 'Tamanho do texto', jump: 'Mais recente ↓',
      displayBoth: 'Tradução + original', displayTr: 'Só tradução', displayOrig: 'Só original',
      connecting: 'Conectando…', connected: 'Conectado',
      disconnected: 'Desconectado. Reconectando…', netError: 'Erro de rede. Reconectando…',
      waitGuide: 'Aguardando o guia', libFail: 'Não foi possível carregar a conexão', cannotConnect: 'Não é possível conectar',
      waitStart: 'Aguardando o guia começar…', waitLang: 'Aguardando legendas neste idioma…',
      liveLabel: '● Interpretação ao vivo', listening: 'Ouvindo…', translating: 'Traduzindo…',
      askShort: 'Perguntar', askTitle: 'Pergunte ao guia', micHint: 'Toque no microfone e fale',
      micListening: 'Ouvindo… toque para parar', send: 'Enviar', close: 'Fechar', sent: 'Pergunta enviada',
      qClosed: 'Perguntas fechadas', qClosedHint: 'O guia não está aceitando perguntas agora.',
      qNoConn: 'Ainda não conectado. Aguarde um instante.',
      micUnsupported: 'Entrada de voz não disponível neste aparelho.',
      voiceUnsupported: 'Este aparelho não lê texto em voz alta.',
      voiceOnToast: 'Som ativado. A tradução sai pelo alto-falante.', speakOk: 'Som ativado',
      setTitle: 'Ajustes', setDisplay: 'Tela', setCaptionStyle: 'Legendas',
      optBoth: 'Tradução + original em japonês', optTr: 'Só tradução (grande)', optOrig: 'Só original em japonês',
      setFontSize: 'Tamanho do texto', setLang: 'Idioma', setLangNote: 'As próximas legendas passam a usar este idioma.',
      setVoice: 'Leitura em voz alta', setAutoTts: 'Ler as legendas (TTS)',
      setVoiceNote: 'Sai pelo alto-falante do celular. A tela fica acesa enquanto o som está ativo.'
    },
    it: {
      langTitle: 'Scegli la tua lingua', langSub: 'Tocca una lingua per iniziare',
      langNote: 'I sottotitoli partono subito. Puoi cambiarli dopo.',
      voiceEnable: '🔈 Attiva l’audio', voiceOn: '🔊 Audio ON', voiceOff: '🔇 Audio OFF',
      rate: 'Velocità', font: 'Dimensione testo', jump: 'Ultimo ↓',
      displayBoth: 'Traduzione + originale', displayTr: 'Solo traduzione', displayOrig: 'Solo originale',
      connecting: 'Connessione…', connected: 'Connesso',
      disconnected: 'Disconnesso. Riconnessione…', netError: 'Errore di rete. Riconnessione…',
      waitGuide: 'In attesa della guida', libFail: 'Impossibile caricare la connessione', cannotConnect: 'Connessione impossibile',
      waitStart: 'In attesa che la guida inizi…', waitLang: 'In attesa dei sottotitoli in questa lingua…',
      liveLabel: '● Interpretariato dal vivo', listening: 'In ascolto…', translating: 'Traduzione…',
      askShort: 'Chiedi', askTitle: 'Chiedi alla guida', micHint: 'Tocca il microfono e parla',
      micListening: 'In ascolto… tocca per fermare', send: 'Invia', close: 'Chiudi', sent: 'Domanda inviata',
      qClosed: 'Domande chiuse', qClosedHint: 'La guida non accetta domande in questo momento.',
      qNoConn: 'Non ancora connesso. Attendi un momento.',
      micUnsupported: 'L’input vocale non è disponibile su questo dispositivo.',
      voiceUnsupported: 'Questo dispositivo non legge il testo ad alta voce.',
      voiceOnToast: 'Audio attivo. La traduzione esce dall’altoparlante.', speakOk: 'Audio attivo',
      setTitle: 'Impostazioni', setDisplay: 'Schermo', setCaptionStyle: 'Sottotitoli',
      optBoth: 'Traduzione + originale giapponese', optTr: 'Solo traduzione (grande)', optOrig: 'Solo originale giapponese',
      setFontSize: 'Dimensione testo', setLang: 'Lingua', setLangNote: 'I prossimi sottotitoli useranno questa lingua.',
      setVoice: 'Lettura ad alta voce', setAutoTts: 'Leggi i sottotitoli (TTS)',
      setVoiceNote: 'Esce dall’altoparlante del telefono. Lo schermo resta acceso con l’audio attivo.'
    },
    th: {
      langTitle: 'เลือกภาษาของคุณ', langSub: 'แตะภาษาเพื่อเริ่ม',
      langNote: 'เลือกแล้วคำบรรยายจะขึ้นทันที เปลี่ยนภายหลังได้',
      voiceEnable: '🔈 เปิดเสียง', voiceOn: '🔊 เสียงเปิด', voiceOff: '🔇 เสียงปิด',
      rate: 'ความเร็ว', font: 'ขนาดตัวอักษร', jump: 'ล่าสุด ↓',
      displayBoth: 'คำแปล＋ต้นฉบับ', displayTr: 'คำแปลเท่านั้น', displayOrig: 'ต้นฉบับเท่านั้น',
      connecting: 'กำลังเชื่อมต่อ…', connected: 'เชื่อมต่อแล้ว',
      disconnected: 'หลุดการเชื่อมต่อ กำลังเชื่อมใหม่…', netError: 'เครือข่ายขัดข้อง กำลังเชื่อมใหม่…',
      waitGuide: 'รอไกด์เริ่ม', libFail: 'โหลดไลบรารีการเชื่อมต่อไม่ได้', cannotConnect: 'เชื่อมต่อไม่ได้',
      waitStart: 'กำลังรอให้ไกด์เริ่ม…', waitLang: 'กำลังรอคำบรรยายภาษานี้…',
      liveLabel: '● กำลังแปลสด', listening: 'กำลังฟัง…', translating: 'กำลังแปล…',
      askShort: 'ถาม', askTitle: 'ถามไกด์', micHint: 'แตะไมโครโฟนแล้วพูด',
      micListening: 'กำลังฟัง… แตะเพื่อหยุด', send: 'ส่ง', close: 'ปิด', sent: 'ส่งคำถามแล้ว',
      qClosed: 'ปิดรับคำถาม', qClosedHint: 'ตอนนี้ไกด์ไม่รับคำถาม',
      qNoConn: 'ยังไม่ได้เชื่อมต่อ กรุณารอสักครู่',
      micUnsupported: 'อุปกรณ์นี้ใช้การพิมพ์ด้วยเสียงไม่ได้',
      voiceUnsupported: 'อุปกรณ์นี้อ่านออกเสียงไม่ได้',
      voiceOnToast: 'เปิดเสียงแล้ว คำแปลจะออกจากลำโพง', speakOk: 'เสียงเปิดแล้ว',
      setTitle: 'ตั้งค่า', setDisplay: 'การแสดงผล', setCaptionStyle: 'คำบรรยาย',
      optBoth: 'คำแปล＋ต้นฉบับภาษาญี่ปุ่น', optTr: 'คำแปลเท่านั้น (ใหญ่)', optOrig: 'ต้นฉบับภาษาญี่ปุ่นเท่านั้น',
      setFontSize: 'ขนาดตัวอักษร', setLang: 'ภาษา', setLangNote: 'คำบรรยายต่อไปจะเปลี่ยนเป็นภาษานี้',
      setVoice: 'อ่านออกเสียง', setAutoTts: 'อ่านคำบรรยายอัตโนมัติ (TTS)',
      setVoiceNote: 'ออกเสียงจากลำโพงมือถือ หน้าจอจะไม่ดับขณะเปิดเสียง'
    },
    vi: {
      langTitle: 'Chọn ngôn ngữ của bạn', langSub: 'Chạm một ngôn ngữ để bắt đầu',
      langNote: 'Phụ đề hiện ngay. Có thể đổi sau.',
      voiceEnable: '🔈 Bật âm thanh', voiceOn: '🔊 Âm thanh BẬT', voiceOff: '🔇 Âm thanh TẮT',
      rate: 'Tốc độ', font: 'Cỡ chữ', jump: 'Mới nhất ↓',
      displayBoth: 'Bản dịch + nguyên văn', displayTr: 'Chỉ bản dịch', displayOrig: 'Chỉ nguyên văn',
      connecting: 'Đang kết nối…', connected: 'Đã kết nối',
      disconnected: 'Mất kết nối. Đang kết nối lại…', netError: 'Lỗi mạng. Đang kết nối lại…',
      waitGuide: 'Đang chờ hướng dẫn viên', libFail: 'Không tải được thư viện kết nối', cannotConnect: 'Không kết nối được',
      waitStart: 'Đang chờ hướng dẫn viên bắt đầu…', waitLang: 'Đang chờ phụ đề bằng ngôn ngữ này…',
      liveLabel: '● Đang phiên dịch trực tiếp', listening: 'Đang nghe…', translating: 'Đang dịch…',
      askShort: 'Hỏi', askTitle: 'Hỏi hướng dẫn viên', micHint: 'Chạm vào mic và nói',
      micListening: 'Đang nghe… chạm để dừng', send: 'Gửi', close: 'Đóng', sent: 'Đã gửi câu hỏi',
      qClosed: 'Đã đóng nhận câu hỏi', qClosedHint: 'Hiện hướng dẫn viên không nhận câu hỏi.',
      qNoConn: 'Chưa kết nối. Vui lòng đợi một chút.',
      micUnsupported: 'Thiết bị này không hỗ trợ nhập bằng giọng nói.',
      voiceUnsupported: 'Thiết bị này không đọc được văn bản.',
      voiceOnToast: 'Đã bật âm thanh. Bản dịch sẽ phát ra loa.', speakOk: 'Đã bật âm thanh',
      setTitle: 'Cài đặt', setDisplay: 'Hiển thị', setCaptionStyle: 'Phụ đề',
      optBoth: 'Bản dịch + nguyên văn tiếng Nhật', optTr: 'Chỉ bản dịch (lớn)', optOrig: 'Chỉ nguyên văn tiếng Nhật',
      setFontSize: 'Cỡ chữ', setLang: 'Ngôn ngữ', setLangNote: 'Phụ đề tiếp theo sẽ chuyển sang ngôn ngữ này.',
      setVoice: 'Đọc thành tiếng', setAutoTts: 'Tự động đọc phụ đề (TTS)',
      setVoiceNote: 'Phát ra loa điện thoại. Màn hình không tắt khi bật âm thanh.'
    },
    id: {
      langTitle: 'Pilih bahasa Anda', langSub: 'Ketuk bahasa untuk mulai',
      langNote: 'Teks muncul langsung. Bisa diubah nanti.',
      voiceEnable: '🔈 Nyalakan suara', voiceOn: '🔊 Suara AKTIF', voiceOff: '🔇 Suara NONAKTIF',
      rate: 'Kecepatan', font: 'Ukuran huruf', jump: 'Terbaru ↓',
      displayBoth: 'Terjemahan + asli', displayTr: 'Hanya terjemahan', displayOrig: 'Hanya asli',
      connecting: 'Menghubungkan…', connected: 'Terhubung',
      disconnected: 'Terputus. Menghubungkan ulang…', netError: 'Gangguan jaringan. Menghubungkan ulang…',
      waitGuide: 'Menunggu pemandu', libFail: 'Gagal memuat pustaka koneksi', cannotConnect: 'Tidak bisa terhubung',
      waitStart: 'Menunggu pemandu memulai…', waitLang: 'Menunggu teks dalam bahasa ini…',
      liveLabel: '● Penerjemahan langsung', listening: 'Mendengarkan…', translating: 'Menerjemahkan…',
      askShort: 'Tanya', askTitle: 'Tanya pemandu', micHint: 'Ketuk mikrofon lalu bicara',
      micListening: 'Mendengarkan… ketuk untuk berhenti', send: 'Kirim', close: 'Tutup', sent: 'Pertanyaan terkirim',
      qClosed: 'Pertanyaan ditutup', qClosedHint: 'Pemandu sedang tidak menerima pertanyaan.',
      qNoConn: 'Belum terhubung. Mohon tunggu sebentar.',
      micUnsupported: 'Input suara tidak tersedia di perangkat ini.',
      voiceUnsupported: 'Perangkat ini tidak bisa membacakan teks.',
      voiceOnToast: 'Suara aktif. Terjemahan keluar dari speaker.', speakOk: 'Suara aktif',
      setTitle: 'Pengaturan', setDisplay: 'Tampilan', setCaptionStyle: 'Teks',
      optBoth: 'Terjemahan + asli Jepang', optTr: 'Hanya terjemahan (besar)', optOrig: 'Hanya asli Jepang',
      setFontSize: 'Ukuran huruf', setLang: 'Bahasa', setLangNote: 'Teks berikutnya akan memakai bahasa ini.',
      setVoice: 'Bacakan', setAutoTts: 'Bacakan teks otomatis (TTS)',
      setVoiceNote: 'Keluar dari speaker ponsel. Layar tetap menyala saat suara aktif.'
    }
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
    // participant
    myLang: '',
    pDisplay: 'both',                   // both | translation | original
    pFont: 1,
    pTts: true,
    pRate: 1                            // 読み上げ速度（1 / 1.15 / 1.3）
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
    qSpeak: false,        // ゲストの質問の日本語訳を読み上げる（既定OFF）
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
    qText: '',
    qSent: false,
    qListening: false,
    qCloseTimer: null,
    // 字幕の自動追従
    pinnedUp: false,      // 過去を読み返している（自動追従を一時停止）
    rafId: 0,
    // 表示文言（言語切替で描き直すために保持する）
    status: null,         // { kind, key }
    waitKey: ''
  };

  const VOICE = {
    unlocked: false, speaking: false, queue: [], voices: [],
    wake: null,        // Screen Wake Lock
    watchdog: null,    // Android Chrome の無音停止対策
    canceledAt: 0,     // cancel() した時刻（直後の speak を 50ms 遅らせる）
    spokeAt: 0,        // 発話を始めた時刻（スタック検出用）
    guard: null        // onend が来ないときの保険タイマー
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
      if (document.visibilityState === 'visible' && S.pTts) requestWakeLock();
    });
    window.addEventListener('pagehide', releaseWakeLock);

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
    if (!A.questions.length) {
      box.innerHTML = '<p class="empty">まだ質問はありません。ゲストの画面右下の「🎙️ 質問」から届きます。</p>';
      return;
    }
    box.innerHTML = A.questions.slice().reverse().map(q => {
      const L = LANG_MAP[q.lang] || LANG_MAP.en;
      let ja;
      if (q.tr && q.tr.text) ja = esc(q.tr.text);
      else if (q.state === 'error') ja = '（日本語に訳せませんでした）';
      else ja = '翻訳中…';
      const cls = 'q-ja' + (q.tr && q.tr.text ? (q.tr.degraded ? ' degraded' : '') : ' pending');
      return '<article class="q-item" data-id="' + esc(q.id) + '">' +
        '<div class="q-head"><span class="q-lang">' + L.flag + ' ' + esc(L.ja) + '</span>' +
        '<span class="q-time">' + timeLabel(q.ts) + '</span>' +
        '<button class="q-done" type="button" data-id="' + esc(q.id) + '">✓ 済</button></div>' +
        '<p class="q-text">' + esc(q.text) + '</p>' +
        '<p class="' + cls + '">' + ja + '</p>' +
      '</article>';
    }).join('');
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
    const item = { id, guestId: String((msg && msg.id) || ''), lang: rec.lang, text, tr: null, state: 'pending', ts: now };
    A.questions.push(item);
    if (A.questions.length > 30) A.questions.shift();
    renderQuestions();
    sendTo(rec, { t: 'qack', id: item.guestId });
    if (navigator.vibrate) { try { navigator.vibrate([28, 40, 28]); } catch (e) {} }

    // ガイドが設定している翻訳エンジンで、その場で日本語に訳す
    translateToJa(text, item.lang).then(res => {
      item.tr = res;
      item.state = 'done';
      renderQuestions();
      // 任意：ゲストの質問を日本語で読み上げる（既定OFF）
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
    if (!t || /MYMEMORY WARNING/i.test(t) || String(d.responseStatus) !== '200') throw new Error('no result');
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
    const L = LANG_MAP[srcLang] || LANG_MAP.en;
    return [
      'あなたは国際会議の同時通訳者です。ゲストが話した ' + L.native + '（' + L.ja + '）の質問を、自然な日本語に訳してください。',
      '出力は日本語訳だけ。前置き・解説・括弧書き・原文の繰り返しは書かない。',
      'ガイドがすぐ読める、簡潔な話し言葉の日本語にする。',
      '原文にない情報を足さない。数字・人名・社名・日時は正確に。'
    ].join('\n');
  }

  async function translateToJa(text, srcLang) {
    const from = LANG_MAP[srcLang] ? srcLang : 'en';
    if (from === 'ja') return { text: String(text), engine: 'none', engineName: '日本語', direct: true };

    if (S.engine === 'openai' && String(S.openaiKey || '').trim()) {
      try { return await openaiTranslateToJa(text, from); }
      catch (e) { noteEngineError('OpenAI', e, true); }
    } else if (S.engine === 'gemini' && String(S.geminiKey || '').trim()) {
      try { return await geminiTranslateToJa(text, from); }
      catch (e) { noteEngineError('Gemini', e, true); }
    }
    try {
      const t = await googlePublicTranslate(text, from, 'ja');
      return { text: t, engine: 'trial', engineName: 'お試し翻訳' };
    } catch (e) { /* 次へ */ }
    try {
      const t = await mymemoryTranslateFrom(text, from, 'ja');
      return { text: t, engine: 'trial', engineName: 'お試し翻訳' };
    } catch (e) { /* 次へ */ }
    return { text: String(text), engine: 'offline', engineName: '翻訳できません', degraded: true };
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

    const sheet = $('#sheet');
    if (sheet && !sheet.classList.contains('hidden') && A.role === 'participant') {
      $('#sheetTitle').textContent = t('setTitle');
    }
  }

  function setQHint(key) {
    const el = $('#qHint');
    if (el) el.textContent = t(key);
  }

  /* ---------------- 質問（ゲスト → ガイド）
     文字入力欄は置かず、右下の小さなボタン → マイクのポップアップだけにする。
     （スマホでキーボードが出て画面が狭くなるのを防ぐ） */
  function updateQaUI() {
    const on = P.qOpen !== false;
    const notice = $('#qNotice');
    const send = $('#qSend');
    const mic = $('#qMic');
    if (notice) notice.classList.toggle('hidden', on);
    if (send) send.disabled = !on;
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
    const live = $('#qLive');
    if (live) live.textContent = '';
    updateQaUI();
    startQMic();        // タップの流れの中でマイクを開始（点滅して待ち受け）
  }

  function closeQaPop() {
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
    setQHint('micHint');
  }

  function startQMic() {
    if (P.qRec) return true;
    if (P.qOpen === false) { toast(t('qClosedHint'), 2800); return false; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setQHint('micUnsupported'); toast(t('micUnsupported'), 3200); return false; }
    const L = LANG_MAP[S.myLang] || LANG_MAP.en;
    let rec;
    try { rec = new SR(); }
    catch (e) { setQHint('micUnsupported'); toast(t('micUnsupported'), 3200); return false; }
    rec.lang = L.bcp47;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    P.qSent = false;

    rec.onstart = () => {
      P.qListening = true;
      const m = $('#qMic');
      if (m) m.classList.add('listening');
      setQHint('micListening');
    };
    rec.onresult = (ev) => {
      let out = '';
      for (let i = 0; i < ev.results.length; i++) {
        out += (ev.results[i][0] && ev.results[i][0].transcript) || '';
      }
      out = out.trim();
      P.qText = out;
      const live = $('#qLive');
      if (live) live.textContent = out;
    };
    rec.onerror = (ev) => {
      const err = ev && ev.error;
      P.qListening = false;
      P.qRec = null;
      const m = $('#qMic');
      if (m) m.classList.remove('listening');
      setQHint('micHint');
      if (err === 'not-allowed' || err === 'service-not-allowed') toast(t('micUnsupported'), 3200);
    };
    rec.onend = () => {
      P.qListening = false;
      P.qRec = null;
      const m = $('#qMic');
      if (m) m.classList.remove('listening');
      setQHint('micHint');
      // 話し終わったら自動で送る（送信ボタンでも送れる）
      if (P.qOpen !== false && P.qText && !P.qSent) autoSendQuestion();
    };

    P.qRec = rec;
    P.qListening = true;
    const mic = $('#qMic');
    if (mic) mic.classList.add('listening');    // 大きく点滅（パルス）
    setQHint('micListening');
    try { rec.start(); }
    catch (e) {
      P.qRec = null;
      P.qListening = false;
      if (mic) mic.classList.remove('listening');
      setQHint('micHint');
      toast(t('micUnsupported'), 3200);
      return false;
    }
    return true;
  }

  function stopQMic(cancel) {
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
    if (!text || P.qSent) return;
    if (!sendQuestionText(text, { auto: true })) { P.qSent = true; return; }
    P.qSent = true;
    const live = $('#qLive');
    if (live) live.textContent = '';
    setQHint('sent');
    if (P.qCloseTimer) clearTimeout(P.qCloseTimer);
    P.qCloseTimer = setTimeout(() => { P.qCloseTimer = null; closeQaPop(); }, 1200);
  }

  function sendQuestionText(text, opts = {}) {
    const body = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!body) { if (!opts.auto) toast(t('micHint'), 2400); return false; }
    if (P.qOpen === false) { toast(t('qClosedHint'), 2800); updateQaUI(); return false; }
    if (!P.conn || !P.conn.open) { toast(t('qNoConn'), 3200); return false; }
    const id = 'gq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    P.conn.send({ t: 'question', id, lang: S.myLang || 'en', text: body, ts: Date.now() });
    toast(t('qSent'), 2400);
    return true;
  }

  function sendQuestion() {
    const text = String(P.qText || '').trim();
    if (!text) { toast(t('micHint'), 2400); setQHint('micHint'); return; }
    const ok = sendQuestionText(text, {});
    if (ok) {
      P.qSent = true;
      stopQMic(true);       // 送ったらマイクは止める（点滅も消す）
      const live = $('#qLive');
      if (live) live.textContent = '';
      P.qCloseTimer = setTimeout(() => { P.qCloseTimer = null; closeQaPop(); }, 900);
    }
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
    $$('.lang-btn').forEach(b => b.classList.toggle('on', b.dataset.lang === S.myLang));
    const tag = $('#pLangTag');
    if (tag) {
      const L = LANG_MAP[S.myLang];
      tag.textContent = L ? (L.flag + ' ' + L.native) : '';
    }
  }

  function pickMyLang(code) {
    if (!LANG_MAP[code]) return;
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
    if (A.role === 'participant') {
      if (S.pTts) requestWakeLock();
      else releaseWakeLock();
    }
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

  // 端末内蔵（localService）の音声を最優先する。
  // ネットワーク専用の声は未ダウンロードだと無音になるので、あっただけでは使わない。
  // ローカルが無ければ null を返し、u.lang に OS の既定音声を選ばせる（Android Chrome で鳴りやすい）。
  function pickVoice(langCode) {
    const L = langInfo(langCode);
    if (!L || !VOICE.voices.length) return null;
    const want = String(L.bcp47).toLowerCase().replace('_', '-');
    const prefix = want.split('-')[0];
    let local = null, localScore = 0;
    for (const v of VOICE.voices) {
      if (!v || v.localService !== true) continue;     // ローカル音声だけ
      const vl = String(v.lang || '').toLowerCase().replace('_', '-');
      const score = vl === want ? 2 : (vl.split('-')[0] === prefix ? 1 : 0);
      if (score > localScore) { local = v; localScore = score; }
    }
    return local;
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

  // 音声ONの間は画面を消灯させない（対応端末だけ。失敗しても読み上げは続ける）
  async function requestWakeLock() {
    if (A.role !== 'participant' || !S.pTts) return;
    if (!('wakeLock' in navigator) || !navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') return;
    if (document.visibilityState !== 'visible') return;      // 非表示中は取得できない
    if (VOICE.wake && !VOICE.wake.released) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      VOICE.wake = lock;
      if (lock && lock.addEventListener) lock.addEventListener('release', () => { VOICE.wake = null; });
    } catch (e) {
      VOICE.wake = null;     // 省電力モードなどでは取得できない
    }
  }

  function releaseWakeLock() {
    const lock = VOICE.wake;
    VOICE.wake = null;
    if (lock && typeof lock.release === 'function') { try { lock.release(); } catch (e) {} }
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

  // cancel() の直後に speak() すると Android Chrome で次の発話が消えるため、時刻を控えておく
  function cancelSpeech() {
    VOICE.queue = [];
    VOICE.speaking = false;
    VOICE.canceledAt = Date.now();
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }

  function speakDelay() {
    return Math.max(0, 50 - (Date.now() - (VOICE.canceledAt || 0)));
  }

  // 1件を確実に鳴らす（cancel 直後でも 50ms 待ってから speak する）
  function speakNow(u) {
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
    setTimeout(() => {
      try { window.speechSynthesis.speak(u); }
      catch (e) { clear(); }
    }, speakDelay());
  }

  // 音声ON：その場で短い確認音声を鳴らし、スピーカーから音が出るか確かめられるようにする
  function unlockVoice() {
    if (!('speechSynthesis' in window)) {
      toast(t('voiceUnsupported'));
      return;
    }
    refreshVoices();
    VOICE.unlocked = true;
    const b = $('#btnVoice');
    if (b) b.classList.add('hidden');
    cancelSpeech();
    speakNow(makeUtterance(t('speakOk'), S.myLang || 'en'));
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
    setTimeout(() => {
      try { window.speechSynthesis.speak(u); }
      catch (e) { done(); }
    }, speakDelay());
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
        // （スピーカーから実際に音が出るか、ここで確かめられる）
        unlockVoice();
      } else {
        cancelSpeech();
        releaseWakeLock();
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
    $('#btnQAsk').addEventListener('click', openQaPop);
    $('#qClose').addEventListener('click', closeQaPop);
    $('#qSend').addEventListener('click', sendQuestion);
    $('#qMic').addEventListener('click', toggleQMic);

    // ガイド側：質問の読み上げ（任意・既定OFF）
    $('#btnQSpeak').addEventListener('click', () => {
      S.qSpeak = !S.qSpeak;
      saveSettings();
      updateQSpeak();
      if (S.qSpeak && 'speechSynthesis' in window) {
        // 押したジェスチャーのうちに解除して、短い確認音声を鳴らす
        VOICE.unlocked = true;
        cancelSpeech();
        speakNow(makeUtterance('質問の読み上げを開始します', 'ja'));
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
