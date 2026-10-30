import { createI18n } from 'vue-i18n'
import en_US from './locales/en-US.json'

// [TODO] improve the keys, remove preview, etc.
const messages = {
    en_US: en_US,
    zh_CN: {
        supporter: {
            "title": "赞助者权限",
            "active": "已激活",
            "thankYou": "感谢你的支持！",
            "description": "使用 AFDIAN 订单号或 Ko-fi 激活码激活。",
            "orderNumber": "AFDIAN 订单号或激活码",
            "placeholder": "粘贴订单号或激活码",
            "redeem": "激活",
            "redeeming": "正在激活…",
            "activated": "赞助者权限已激活。",
            "activatedRefreshFailed": "权限已激活。请重新打开应用以重试加载互动。",
            "errors": {"invalidCodeFormat": "请输入有效的 AFDIAN 订单号或激活码。", "orderNotFound": "未找到订单，请检查 AFDIAN 订单号。", "activationCodeNotFound": "未找到激活码。", "activationUnavailable": "此激活已过期、被禁用或已在其他设备上使用。", "orderNotEligible": "此订单不符合激活条件。", "orderVerificationFailed": "无法验证订单，请稍后重试。", "activationFailed": "无法激活，请稍后重试。", "connectionFailed": "无法连接，请检查网络后重试。", "invalidMachineId": "设备 ID 不可用，请重启应用后重试。"},
            "findOrder": "在哪里找到订单号或激活码？",
            "orderHelp": "AFDIAN：进入个人中心，打开“我的订单”，然后复制订单号。Ko-fi：输入你收到的激活码，而不是交易编号。"
        },
        whatsNew: {
            supporterActivation: "在设置中使用 AFDIAN 订单号或 Ko-fi 激活码激活赞助者权限。",
            datingControls: "选择约会姿势、重置互动，并显示或隐藏互动点和区域。",
            appIcon: "全新应用图标。",
            assetLoadingFix: "修复了资源文件名错误导致部分角色预览无法加载的问题。",
            groupCameraFix: "修复了部分同步组预览必须先调整镜头才能响应缩放和移动的问题。",
            minigames: "预览 Slap Slap Slop 角色，支持点击、长按、拖动和狂热模式互动。",
            copyConfirmation: "复制 ID 后会显示确认提示。",
            cutsceneVisibilityFix: "修复了部分过场动画片段结束后仍然显示的问题。",
            datingAssetsFix: "修复了 Aquila 多部分约会预览缺少资源的问题。",
            whatsNewFix: "修复了“更新内容”窗口显示在工具栏后面的问题。",
            "multiplePreviews": "多个预览",
            "syncGroups": "将预览分配到相同编号的组，一起缩放、移动和控制播放。",
            "playbackFixes": "修复了通过工具栏暂停和重新播放预览的问题。",
            "datingFixes": "修复了约会互动从空动画开始的问题，并支持包含多个部分的约会场景。",
            "datingInteractions": "约会互动",
            "otherImprovements": "其他改进",
            "supporterMessage": "此功能仅限赞助者使用。如想支持开发并获得访问权限，可以通过以下平台赞助：",
            "characters": "更新角色数据并改进拖放支持。",
            "interface": "重新设计了设置、角色列表、历史记录和日志。",
            "layers": "选择皮肤，并显示或隐藏单独的图层。",
            "modManager": "连接 BD2ModManager 后，可在预览中启用或禁用模组。",
            "dating": "为赞助者添加约会互动，包括点击、拖动和长按。",
            "datingCache": "约会互动数据最多缓存七天，已验证的赞助者可在缓存有效期内离线使用。",
            "cutscenes": "使用游戏中的时序播放支持的过场动画。",
            "title": "更新内容",
            "version": "版本 {version}",
            "current": "当前版本",
            "feedback": "有反馈或想法？欢迎在 GitHub 上分享。",
            "issue": "在 GitHub 上提交问题",
            "done": "知道了！",
            "grid": "并排预览多个模组，拖动以重新排列并调整每个预览的大小。",
            "controls": "同时控制所有预览，或分别选择动画。",
            "sequences": "创建并保存动画序列。",
            "folders": "一次打开多个文件夹，并从最近的文件夹中重新打开预览。",
            "themes": "添加主题和角色名称翻译。"
        },
        preview: {
            minigameInteractions: "小游戏互动",
            minigameFever: "狂热模式",
            minigameHint: "点击、长按或拖动任意一侧。按住鼠标中键移动镜头。",
            syncGroups: "同步组",
            syncGroup: "同步组 {group}。编号相同的预览共享控制，再次点击可取消同步。",
            datingInteractions: "约会互动（仅限赞助者）",
            showInteractionAreas: "显示互动区域",
      gameCutscene: "游戏过场动画（预览）",
      cutsceneIncomplete: "部分过场动画元素缺失。",
            datingTool: "工具 {id}",
            noTool: "无工具",
            datingGauge: "互动进度",
            managerDisconnected: "打开 BD2ModManager 以管理此模组",
            managerUnknown: "此文件夹不在 ModManager 的模组列表中",
            managerModErrors: "此模组存在错误，无法更改",
            managerEnable: "在 BD2ModManager 中启用模组",
            "darkTheme": "深色 {number}",
            "lightTheme": "浅色 {number}",
            "fullPath": "完整路径",
            "newPreview": "新预览",
            "originalTitle": "[原版] {character} - {costume}",
            "loading": "正在加载预览…",
            "loadFailed": "无法加载此预览。",
            "missingAssets": "文件夹中缺少骨骼或图集。",
            "unsupportedSkeleton": "不支持的骨骼文件格式。",
            "chooseFolder": "选择要预览的文件夹",
            "openFolder": "打开文件夹",
            "recentFolders": "最近的文件夹",
            "fit": "适应角色大小",
            "center": "居中角色",
            "resetCamera": "重置相机",
            "skin": "皮肤",
            "none": "无",
            "background": "背景",
            "selectColor": "选择颜色",
            "selectImage": "选择图片",
            "chooseImage": "选择图片",
            "modBackgrounds": "模组背景",
            "noBackgrounds": "textures/ 中没有图片。",
            "backgroundsFailed": "无法加载模组背景。",
            "resetBackground": "重置背景",
            "removeImage": "移除图片",
            "color": "颜色",
            "createSequence": "创建序列",
            "editSequence": "编辑序列",
            "newSequence": "新序列",
            "saveSequence": "保存序列",
            "name": "名称",
            "animation": "动画",
            "startAfter": "延迟开始",
            "playFor": "播放时长",
            "auto": "自动",
            "addAnimation": "添加动画",
            "addStep": "添加步骤",
            "step": "步骤 {number}",
            "sequenceHelp": "步骤按顺序播放，同一步骤内的动画同时播放。延迟相对于步骤开始计算。自动使用原始时长。循环会在所选时长内重复动画。",
            "restart": "重新播放预览",
            "play": "播放",
            "pause": "暂停",
            "playPreview": "播放预览",
            "pausePreview": "暂停预览",
            "restartAll": "重新播放所有预览",
            "playAll": "播放所有预览",
            "pauseAll": "暂停所有预览",
            "loopAll": "循环所有预览",
            "loop": "循环动画",
            "noAnimations": "无动画",
            "noAnimation": "无动画",
            "global": "全局 ({animation})",
            "layers": "图层",
            "showAllLayers": "全部显示",
            "hideAllLayers": "全部隐藏",
            "resetLayers": "重置",
            "searchLayers": "搜索图层…",
            "noLayers": "未找到图层。",
            "settings": "设置",
            "characters": "角色",
            "application": "应用",
            "theme": "主题",
            "rendering": "渲染",
            "onTopHelp": "将预览置于其他窗口之上。",
            "alphaHelp": "为纹理使用预乘透明度。",
            "help": "帮助",
            "close": "关闭",
            "options": "预览选项",
            "addRight": "在右侧添加预览",
            "addBottom": "在下方添加预览",
            "rearrange": "排列预览",
            "dragMove": "拖到预览或行之间以移动",
            "closePreview": "关闭预览",
            "progress": "动画进度",
            "previewAnimation": "预览动画",
            "previewLayers": "此预览的图层",
            "closeLayers": "关闭图层",
            "searchLayersLabel": "搜索图层",
            "closeSettings": "关闭设置",
            "closeEditor": "关闭序列编辑器",
            "sequenceSteps": "序列步骤",
            "loopDuration": "在所选时长内循环",
            "resize": "拖动以调整大小。",
            "resizeCharacters": "调整角色面板大小",
            "edit": "编辑 {name}",
            "delete": "删除 {name}",
            "animationNumber": "动画 {number}",
            "closeStep": "关闭步骤 {number}",
            "reorderAnimation": "调整动画 {number} 的顺序",
            "loopNumber": "循环动画 {number}",
            "delayNumber": "动画 {number} 的延迟",
            "durationNumber": "动画 {number} 的时长",
            "removeAnimation": "移除动画 {number}"
        },
        common: {
            viewLogs: '查看日志',
            openFolder: '打开文件夹',
            retry: '重试',
            goBack: '返回',
            close: '关闭'
        },
        app: {
            copyMachineId: "复制到剪贴板",
            copied: "已复制到剪贴板",
            machineIdNotFound: "无法获取设备 ID",
            backToHome: '返回',
            toggleControls: '控制面板',
        },
        homePage: {
            title: 'Mod 预览',
            subtitle: '拖放或选择一个文件夹',
            recentFoldersLabel: '最近使用的文件夹',
            recentFoldersEmpty: '未找到最近使用的文件夹。',
            openFolderButton: '浏览文件夹',
        },
        characterList: {
            searchPlaceholder: '搜索角色...',
            noCharactersFound: '未找到角色。',
            loadingCharacters: '正在加载角色...',
            tabs: {
                minigames: "小游戏",
                standing: '立绘',
                cutscene: '剧情',
                dating: '约会'
            },
            sort: {
                newest: '最新',
                oldest: '最旧',
                a_z: 'A-Z',
                z_a: 'Z-A'
            },
            loadingCharacter: '正在加载角色...',
            information: '角色资源从 GitHub 仓库加载'
        },
        error: {
            title: '出现错误',
            message: '发生了意外错误，请重试。',
            noInternet: {
                title: '无网络连接',
                message: '没有网络连接无法加载角色资源。',
                checking: '正在检查...',
            }
        },
        controls: {
            title: "控制面板",
            noSource: "无来源！",
            links: {
                suggestFeature: "建议新功能",
                reportIssue: "报告问题"
            },
            render: {
                title: "渲染",
                premultipliedAlpha: "预乘透明度",
                backgroundColor: "背景颜色",
                backgroundImage: "背景图片",
                chooseImage: "选择图片"
            },
            animations: {
                title: "动画",
                available: "可用 {count} 个",
                loopAnimation: "循环动画",
                noAnimations: "无可用动画"
            },
            actions: {
                title: "操作",
                viewHistory: "查看历史记录",
                openLogs: "打开日志"
            },
            appSettings: {
                title: "应用设置",
                language: "语言",
                alwaysOnTop: "窗口置顶"
            },
            version: "BD2ModPreview v{version}"
        },
        historyDialog: {
            title: '历史记录 ({count})',
            noHistory: '无最近历史记录',
            unknownCharacter: '未知',
            unknownModType: '未知',
            sourceTypes: {
                github: 'Github',
                folder: '文件夹'
            },
            modTypes: {
                standing: '立绘',
                cutscene: '剧情',
                npc: 'NPC',
                scene: '场景',
                dating: '约会'
            },
            actions: {
                remove: '从历史记录中移除',
                loadAnimation: '加载动画'
            }
        },
        errors: {
            DirectoryNotFound: {
                title: '未找到目录',
                message: '未找到所选文件夹。'
            },
            MissingSkeletonOrJson: {
                title: '缺少骨架文件',
                message: '所选文件夹缺少必需的骨架 .json 或 .skel 文件。',
                actionLabel: '从 Github 下载原始骨架'
            },
            AssetLoadingError: {
                title: '资源加载错误',
                message: '加载 Spine 资源失败。'
            },
            AssetNotFoundError: {
                title: '未找到资源',
                message: '未找到该资源。'
            },
            AssetTooManyRequestsError: {
                title: '请求过多',
                message: '您的请求过多，请稍后重试。'
            },
            InitializationError: {
                title: '初始化错误',
                message: '初始化 Spine 播放器失败。'
            },
            PlayerError: {
                title: '播放器错误',
                message: 'Spine 播放器发生错误。'
            },
            SkeletonError: {
                title: '骨架错误',
                message: '加载骨架（.skel 或 .json）失败。骨架可能已损坏或图集与骨架文件不匹配。'
            },
            SkeletonNotFound: {
                title: '未找到骨架',
                message: '糟糕！GitHub 仓库中缺少骨架资源。'
            },
            CharacterIdNotFound: {
                title: '未找到角色 ID',
                message: '无法从文件夹中解析角色 ID。'
            },
            DirectoryInvalidError: {
                title: '无效目录',
                message: '所选目录无效或不包含 Spine 资源。'
            },
            UnknownError: {
                title: "发生意外错误",
                message: "发生了意外错误。更多信息请查看日志。"
            }
        }
    },
    ja_JP: {
        supporter: {
            "title": "サポーター特典",
            "active": "有効",
            "thankYou": "ご支援ありがとうございます！",
            "description": "AFDIAN の注文番号または Ko-fi の有効化コードで有効にします。",
            "orderNumber": "AFDIAN の注文番号または有効化コード",
            "placeholder": "注文番号または有効化コードを貼り付け",
            "redeem": "有効にする",
            "redeeming": "有効化中…",
            "activated": "サポーターアクセスを有効化しました。",
            "activatedRefreshFailed": "有効化しました。アプリを開き直してインタラクションの読み込みを再試行してください。",
            "errors": {"invalidCodeFormat": "有効な AFDIAN 注文番号または有効化コードを入力してください。", "orderNotFound": "注文が見つかりません。AFDIAN 注文番号を確認してください。", "activationCodeNotFound": "有効化コードが見つかりません。", "activationUnavailable": "この有効化は期限切れ、無効、または別のデバイスで使用済みです。", "orderNotEligible": "この注文は有効化の対象外です。", "orderVerificationFailed": "注文を確認できませんでした。後でもう一度お試しください。", "activationFailed": "有効化できませんでした。後でもう一度お試しください。", "connectionFailed": "接続できませんでした。接続を確認して再試行してください。", "invalidMachineId": "デバイス ID を取得できません。アプリを再起動してください。"},
            "findOrder": "注文番号やコードはどこにありますか？",
            "orderHelp": "AFDIAN：ダッシュボードから「マイオーダー」を開き、注文番号をコピーしてください。Ko-fi：取引番号ではなく、受け取った有効化コードを入力してください。"
        },
        whatsNew: {
            supporterActivation: "設定で AFDIAN の注文番号または Ko-fi の有効化コードを入力し、サポーター機能を有効にできます。",
            datingControls: "デートのポーズを選択し、インタラクションをリセットしたり、操作ポイントや範囲の表示を切り替えたりできます。",
            appIcon: "アプリアイコンを新しくしました。",
            assetLoadingFix: "アセットのファイル名が正しくないため、一部のキャラクタープレビューを読み込めない問題を修正しました。",
            groupCameraFix: "グループ内の一部のプレビューが、キャラクターを画面に合わせるまでズームや移動に反応しない問題を修正しました。",
            minigames: "Slap Slap Slop のキャラクターをプレビューし、クリック、長押し、ドラッグ、フィーバーのインタラクションを楽しめます。",
            copyConfirmation: "ID をコピーしたときに確認メッセージを表示するようにしました。",
            cutsceneVisibilityFix: "カット終了後も一部の演出が表示されたままになる問題を修正しました。",
            datingAssetsFix: "Aquila の複数パートからなるデートプレビューで、一部のアセットが読み込まれない問題を修正しました。",
            whatsNewFix: "「更新内容」がツールバーの後ろに表示される問題を修正しました。",
            "multiplePreviews": "複数のプレビュー",
            "syncGroups": "同じ番号のグループに設定したプレビューを、一緒にズーム、移動、再生操作できます。",
            "playbackFixes": "ツールバーからの一時停止と最初からの再生を修正しました。",
            "datingFixes": "デートのインタラクションが空のアニメーションから始まる問題を修正し、複数パートのデートシーンに対応しました。",
            "datingInteractions": "デートのインタラクション",
            "otherImprovements": "その他の改善",
            "supporterMessage": "この機能は支援者限定です。開発を支援して利用するには、こちらからご支援ください：",
            "characters": "キャラクターデータを更新し、ドラッグ＆ドロップを改善しました。",
            "interface": "設定、キャラクター一覧、履歴、ログをリニューアルしました。",
            "layers": "スキンの選択や、レイヤーごとの表示・非表示を切り替えられます。",
            "modManager": "BD2ModManager に接続すると、プレビューから MOD を有効・無効にできます。",
            "dating": "支援者向けに、クリック、ドラッグ、長押しによるデートのインタラクションを追加しました。",
            "datingCache": "デートのインタラクションデータは最大7日間キャッシュされます。認証済みの支援者は、有効期間中はオフラインでも利用できます。",
            "cutscenes": "ゲームのタイミングに合わせて、対応するカットシーンを再生できます。",
            "title": "更新内容",
            "version": "バージョン {version}",
            "current": "現在のバージョン",
            "feedback": "ご意見やアイデアを GitHub でお寄せください。",
            "issue": "GitHub で問題を報告",
            "done": "閉じる",
            "grid": "複数の MOD を並べてプレビューできます。ドラッグで並べ替え、各プレビューのサイズを変更できます。",
            "controls": "すべてのプレビューをまとめて操作したり、個別にアニメーションを選択したりできます。",
            "sequences": "アニメーションシーケンスを作成して保存できます。",
            "folders": "複数のフォルダーを一度に開き、最近使ったフォルダーからプレビューを再度開けます。",
            "themes": "テーマとキャラクター名の翻訳を追加しました。"
        },
        preview: {
            minigameInteractions: "ミニゲームのインタラクション",
            minigameFever: "フィーバー",
            minigameHint: "左右どちらかをクリック、長押し、またはドラッグしてください。マウスの中ボタンでカメラを移動できます。",
            syncGroups: "同期グループ",
            syncGroup: "同期グループ {group}。同じ番号のプレビューは操作を共有します。もう一度クリックすると解除します。",
            datingInteractions: "デートのインタラクション（支援者限定）",
            showInteractionAreas: "操作エリアを表示",
      gameCutscene: "ゲーム内カットシーン（プレビュー）",
      cutsceneIncomplete: "一部のカットシーン要素が不足しています。",
            datingTool: "ツール {id}",
            noTool: "ツールなし",
            datingGauge: "インタラクションゲージ",
            managerDisconnected: "BD2ModManager を開いてこの Mod を管理",
            managerUnknown: "このフォルダーは ModManager の Mod 一覧にありません",
            managerModErrors: "この Mod にはエラーがあるため変更できません",
            managerEnable: "BD2ModManager で Mod を有効にする",
            "darkTheme": "ダーク {number}",
            "lightTheme": "ライト {number}",
            "fullPath": "フルパス",
            "newPreview": "新しいプレビュー",
            "originalTitle": "[オリジナル] {character} - {costume}",
            "loading": "プレビューを読み込み中…",
            "loadFailed": "プレビューを読み込めませんでした。",
            "missingAssets": "フォルダーにスケルトンまたはアトラスがありません。",
            "unsupportedSkeleton": "未対応のスケルトン形式です。",
            "chooseFolder": "プレビューするフォルダーを選択",
            "openFolder": "フォルダーを開く",
            "recentFolders": "最近のフォルダー",
            "fit": "キャラクターを画面に収める",
            "center": "キャラクターを中央に移動",
            "resetCamera": "カメラをリセット",
            "skin": "スキン",
            "none": "なし",
            "background": "背景",
            "selectColor": "色を選択",
            "selectImage": "画像を選択",
            "chooseImage": "画像を選択",
            "modBackgrounds": "MODの背景",
            "noBackgrounds": "textures/ に画像がありません。",
            "backgroundsFailed": "MODの背景を読み込めませんでした。",
            "resetBackground": "背景をリセット",
            "removeImage": "画像を削除",
            "color": "色",
            "createSequence": "シーケンスを作成",
            "editSequence": "シーケンスを編集",
            "newSequence": "新しいシーケンス",
            "saveSequence": "シーケンスを保存",
            "name": "名前",
            "animation": "アニメーション",
            "startAfter": "開始までの時間",
            "playFor": "再生時間",
            "auto": "自動",
            "addAnimation": "アニメーションを追加",
            "addStep": "ステップを追加",
            "step": "ステップ {number}",
            "sequenceHelp": "ステップは順番に、同じステップのアニメーションは同時に再生されます。開始時間はステップを基準とします。自動は元の長さを使用し、ループは指定時間内で繰り返します。",
            "restart": "プレビューを最初から再生",
            "play": "再生",
            "pause": "一時停止",
            "playPreview": "プレビューを再生",
            "pausePreview": "プレビューを一時停止",
            "restartAll": "すべて最初から再生",
            "playAll": "すべて再生",
            "pauseAll": "すべて一時停止",
            "loopAll": "すべてループ再生",
            "loop": "ループ再生",
            "noAnimations": "アニメーションなし",
            "noAnimation": "アニメーションなし",
            "global": "全体 ({animation})",
            "layers": "レイヤー",
            "showAllLayers": "すべて表示",
            "hideAllLayers": "すべて非表示",
            "resetLayers": "リセット",
            "searchLayers": "レイヤーを検索…",
            "noLayers": "レイヤーが見つかりません。",
            "settings": "設定",
            "characters": "キャラクター",
            "application": "アプリケーション",
            "theme": "テーマ",
            "rendering": "描画",
            "onTopHelp": "プレビューを最前面に表示します。",
            "alphaHelp": "テクスチャに乗算済みアルファを使用します。",
            "help": "ヘルプ",
            "close": "閉じる",
            "options": "プレビューのオプション",
            "addRight": "右にプレビューを追加",
            "addBottom": "下にプレビューを追加",
            "rearrange": "プレビューを並べ替え",
            "dragMove": "プレビューや行の間にドラッグして移動",
            "closePreview": "プレビューを閉じる",
            "progress": "再生位置",
            "previewAnimation": "プレビューのアニメーション",
            "previewLayers": "このプレビューのレイヤー",
            "closeLayers": "レイヤーを閉じる",
            "searchLayersLabel": "レイヤーを検索",
            "closeSettings": "設定を閉じる",
            "closeEditor": "シーケンス編集を閉じる",
            "sequenceSteps": "シーケンスのステップ",
            "loopDuration": "指定時間ループ再生",
            "resize": "ドラッグしてサイズ変更。",
            "resizeCharacters": "キャラクターパネルのサイズ変更",
            "edit": "{name} を編集",
            "delete": "{name} を削除",
            "animationNumber": "アニメーション {number}",
            "closeStep": "ステップ {number} を閉じる",
            "reorderAnimation": "アニメーション {number} を並べ替え",
            "loopNumber": "アニメーション {number} をループ",
            "delayNumber": "アニメーション {number} の開始時間",
            "durationNumber": "アニメーション {number} の再生時間",
            "removeAnimation": "アニメーション {number} を削除"
        },
        common: {
            viewLogs: 'ログを表示',
            openFolder: 'フォルダーを開く',
            retry: '再試行',
            goBack: '戻る',
            close: '閉じる'
        },
        app: {
            copyMachineId: "クリップボードにコピー",
            copied: "クリップボードにコピーしました",
            machineIdNotFound: "マシン ID を取得できません",
            backToHome: '戻る',
            toggleControls: 'コントロール',
        },
        homePage: {
            title: 'Modプレビュー',
            subtitle: 'フォルダーをドラッグ&ドロップまたは選択',
            recentFoldersLabel: '最近のフォルダー',
            recentFoldersEmpty: '最近のフォルダーが見つかりません。',
            openFolderButton: 'フォルダーを参照',
        },
        characterList: {
            searchPlaceholder: 'キャラクターを検索...',
            noCharactersFound: 'キャラクターが見つかりません。',
            loadingCharacters: 'キャラクターを読み込み中...',
            tabs: {
                minigames: "ミニゲーム",
                standing: 'スタンディング',
                cutscene: 'カットシーン',
                dating: 'デート'
            },
            sort: {
                newest: '新しい順',
                oldest: '古い順',
                a_z: 'A-Z',
                z_a: 'Z-A'
            },
            loadingCharacter: 'キャラクターを読み込み中...',
            information: 'キャラクターアセットはGitHubリポジトリから読み込まれます'
        },
        error: {
            title: '問題が発生しました',
            message: '予期しないエラーが発生しました。もう一度お試しください。',
            noInternet: {
                title: 'インターネット接続がありません',
                message: 'インターネット接続がないとキャラクターアセットを読み込めません。',
                checking: '確認中...',
            }
        },
        controls: {
            title: "コントロール",
            noSource: "ソースがありません！",
            links: {
                suggestFeature: "機能を提案する",
                reportIssue: "問題を報告する"
            },
            render: {
                title: "レンダリング",
                premultipliedAlpha: "事前乗算アルファ",
                backgroundColor: "背景色",
                backgroundImage: "背景画像",
                chooseImage: "画像を選択"
            },
            animations: {
                title: "アニメーション",
                available: "{count}個利用可能",
                loopAnimation: "アニメーションをループ",
                noAnimations: "利用可能なアニメーションがありません"
            },
            actions: {
                title: "アクション",
                viewHistory: "履歴を表示",
                openLogs: "ログを開く"
            },
            appSettings: {
                title: "アプリ設定",
                language: "言語",
                alwaysOnTop: "常に前面に表示"
            },
            version: "BD2ModPreview v{version}"
        },
        historyDialog: {
            title: '履歴 ({count})',
            noHistory: '最近の履歴がありません',
            unknownCharacter: '不明',
            unknownModType: '不明',
            sourceTypes: {
                github: 'Github',
                folder: 'フォルダー'
            },
            modTypes: {
                standing: 'スタンディング',
                cutscene: 'カットシーン',
                npc: 'NPC',
                scene: 'シーン',
                dating: 'デート'
            },
            actions: {
                remove: '履歴から削除',
                loadAnimation: 'アニメーションを読み込み'
            }
        },
        errors: {
            DirectoryNotFound: {
                title: 'ディレクトリが見つかりません',
                message: '選択されたフォルダーが見つかりませんでした。'
            },
            MissingSkeletonOrJson: {
                title: 'スケルトンファイルが見つかりません',
                message: '選択されたフォルダーに必要なスケルトン.jsonまたは.skelファイルがありません。',
                actionLabel: 'Githubから元のスケルトンをダウンロード'
            },
            AssetLoadingError: {
                title: 'アセット読み込みエラー',
                message: 'Spineアセットの読み込みに失敗しました。'
            },
            AssetNotFoundError: {
                title: 'アセットが見つかりません',
                message: 'アセットが見つかりませんでした。'
            },
            AssetTooManyRequestsError: {
                title: 'リクエストが多すぎます',
                message: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
            },
            InitializationError: {
                title: '初期化エラー',
                message: 'Spineプレイヤーの初期化に失敗しました。'
            },
            PlayerError: {
                title: 'プレイヤーエラー',
                message: 'Spineプレイヤーでエラーが発生しました。'
            },
            SkeletonError: {
                title: 'スケルトンエラー',
                message: 'スケルトン（.skelまたは.json）の読み込みに失敗しました。スケルトンが破損しているか、アトラスとスケルトンファイル間に不一致がある可能性があります。'
            },
            SkeletonNotFound: {
                title: 'スケルトンが見つかりません',
                message: 'おっと！スケルトンアセットがGitHubリポジトリにありません。'
            },
            CharacterIdNotFound: {
                title: 'キャラクターIDが見つかりません',
                message: 'フォルダーからキャラクターIDを解決できませんでした。'
            },
            DirectoryInvalidError: {
                title: '無効なディレクトリ',
                message: '選択されたディレクトリが無効であるか、Spineアセットが含まれていません。'
            },
            UnknownError: {
                title: "予期しないエラーが発生しました",
                message: "予期しないエラーが発生しました。詳細はログをご確認ください。"
            }
        }
    },
    ko_KR: {
        supporter: {
            "title": "후원자 기능",
            "active": "활성",
            "thankYou": "후원해 주셔서 감사합니다!",
            "description": "AFDIAN 주문 번호 또는 Ko-fi 활성화 코드로 활성화하세요.",
            "orderNumber": "AFDIAN 주문 번호 또는 활성화 코드",
            "placeholder": "주문 번호 또는 활성화 코드 붙여넣기",
            "redeem": "활성화",
            "redeeming": "활성화 중…",
            "activated": "서포터 권한이 활성화되었습니다.",
            "activatedRefreshFailed": "활성화되었습니다. 앱을 다시 열어 상호작용을 불러오세요.",
            "errors": {"invalidCodeFormat": "올바른 AFDIAN 주문 번호 또는 활성화 코드를 입력하세요.", "orderNotFound": "주문을 찾을 수 없습니다. AFDIAN 주문 번호를 확인하세요.", "activationCodeNotFound": "활성화 코드를 찾을 수 없습니다.", "activationUnavailable": "만료되었거나 비활성화되었거나 다른 기기에서 사용된 코드입니다.", "orderNotEligible": "활성화할 수 없는 주문입니다.", "orderVerificationFailed": "주문을 확인할 수 없습니다. 나중에 다시 시도하세요.", "activationFailed": "활성화하지 못했습니다. 나중에 다시 시도하세요.", "connectionFailed": "연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도하세요.", "invalidMachineId": "기기 ID를 사용할 수 없습니다. 앱을 다시 시작하세요."},
            "findOrder": "주문 번호나 코드는 어디에서 찾나요?",
            "orderHelp": "AFDIAN: 대시보드에서 내 주문을 열고 주문 번호를 복사하세요. Ko-fi: 거래 번호가 아닌, 받은 활성화 코드를 입력하세요."
        },
        whatsNew: {
            supporterActivation: "설정에서 AFDIAN 주문 번호 또는 Ko-fi 활성화 코드로 후원자 기능을 활성화할 수 있습니다.",
            datingControls: "데이트 포즈를 선택하고, 상호작용을 초기화하거나 상호작용 지점과 영역을 표시하거나 숨길 수 있습니다.",
            appIcon: "새 앱 아이콘을 적용했습니다.",
            assetLoadingFix: "잘못된 에셋 파일 이름으로 일부 캐릭터 미리보기를 불러올 수 없던 문제를 수정했습니다.",
            groupCameraFix: "그룹 내 일부 미리보기가 캐릭터 맞춤을 사용하기 전까지 확대/축소와 이동에 반응하지 않던 문제를 수정했습니다.",
            minigames: "Slap Slap Slop 캐릭터를 미리 보고 클릭, 길게 누르기, 드래그, 피버 상호작용을 사용할 수 있습니다.",
            copyConfirmation: "ID를 복사하면 확인 메시지가 표시됩니다.",
            cutsceneVisibilityFix: "컷이 끝난 뒤에도 일부 컷신 요소가 계속 표시되는 문제를 수정했습니다.",
            datingAssetsFix: "여러 파트로 구성된 Aquila 데이트 미리보기에서 일부 에셋이 누락되는 문제를 수정했습니다.",
            whatsNewFix: "새로운 기능 창이 도구 모음 뒤에 표시되는 문제를 수정했습니다.",
            "multiplePreviews": "여러 미리보기",
            "syncGroups": "미리보기를 같은 번호의 그룹으로 지정하면 확대, 이동, 재생을 함께 제어할 수 있습니다.",
            "playbackFixes": "도구 모음에서 미리보기를 일시 정지하고 처음부터 재생하는 문제를 수정했습니다.",
            "datingFixes": "데이트 상호작용이 빈 애니메이션으로 시작하는 문제를 수정하고 여러 부분으로 구성된 데이트 장면을 지원합니다.",
            "datingInteractions": "데이트 상호작용",
            "otherImprovements": "기타 개선 사항",
            "supporterMessage": "이 기능은 후원자 전용입니다. 개발을 후원하고 이용하려면 다음 플랫폼에서 후원해 주세요:",
            "characters": "캐릭터 데이터를 업데이트하고 드래그 앤 드롭을 개선했습니다.",
            "interface": "설정, 캐릭터 목록, 기록, 로그를 새롭게 디자인했습니다.",
            "layers": "스킨을 선택하고 개별 레이어를 표시하거나 숨길 수 있습니다.",
            "modManager": "BD2ModManager에 연결하면 미리보기에서 모드를 활성화하거나 비활성화할 수 있습니다.",
            "dating": "후원자를 위한 클릭, 드래그, 길게 누르기 데이트 상호작용을 추가했습니다.",
            "datingCache": "데이트 상호작용 데이터는 최대 7일간 캐시됩니다. 인증된 후원자는 캐시가 유효한 동안 오프라인에서도 사용할 수 있습니다.",
            "cutscenes": "게임의 타이밍에 맞춰 지원되는 컷신을 재생할 수 있습니다.",
            "title": "새로운 기능",
            "version": "버전 {version}",
            "current": "현재 버전",
            "feedback": "의견이나 아이디어를 GitHub에서 공유해 주세요.",
            "issue": "GitHub에 문제 보고",
            "done": "확인",
            "grid": "여러 모드를 나란히 미리 보세요. 드래그로 순서를 바꾸고 각 미리보기의 크기를 조절할 수 있습니다.",
            "controls": "모든 미리보기를 함께 제어하거나 애니메이션을 개별적으로 선택할 수 있습니다.",
            "sequences": "애니메이션 시퀀스를 만들고 저장할 수 있습니다.",
            "folders": "여러 폴더를 한 번에 열고 최근 폴더에서 미리보기를 다시 열 수 있습니다.",
            "themes": "테마와 캐릭터 이름 번역을 추가했습니다."
        },
        preview: {
            minigameInteractions: "미니게임 상호작용",
            minigameFever: "피버",
            minigameHint: "양쪽 중 한쪽을 클릭하거나 길게 누르거나 드래그하세요. 마우스 가운데 버튼으로 카메라를 이동할 수 있습니다.",
            syncGroups: "동기화 그룹",
            syncGroup: "동기화 그룹 {group}. 같은 번호의 미리보기는 조작을 공유합니다. 다시 클릭하면 해제됩니다.",
            datingInteractions: "데이트 상호작용 (후원자 전용)",
            showInteractionAreas: "상호작용 영역 표시",
      gameCutscene: "게임 컷신 (미리보기)",
      cutsceneIncomplete: "일부 컷신 요소가 누락되었습니다.",
            datingTool: "도구 {id}",
            noTool: "도구 없음",
            datingGauge: "상호작용 게이지",
            managerDisconnected: "이 모드를 관리하려면 BD2ModManager를 여세요",
            managerUnknown: "이 폴더는 ModManager 모드 목록에 없습니다",
            managerModErrors: "이 모드에 오류가 있어 변경할 수 없습니다",
            managerEnable: "BD2ModManager에서 모드 활성화",
            "darkTheme": "어두운 테마 {number}",
            "lightTheme": "밝은 테마 {number}",
            "fullPath": "전체 경로",
            "newPreview": "새 미리보기",
            "originalTitle": "[원본] {character} - {costume}",
            "loading": "미리보기 로딩 중…",
            "loadFailed": "미리보기를 불러올 수 없습니다.",
            "missingAssets": "폴더에 스켈레톤 또는 아틀라스가 없습니다.",
            "unsupportedSkeleton": "지원하지 않는 스켈레톤 형식입니다.",
            "chooseFolder": "미리볼 폴더 선택",
            "openFolder": "폴더 열기",
            "recentFolders": "최근 폴더",
            "fit": "캐릭터를 화면에 맞추기",
            "center": "캐릭터 가운데 정렬",
            "resetCamera": "카메라 초기화",
            "skin": "스킨",
            "none": "없음",
            "background": "배경",
            "selectColor": "색상 선택",
            "selectImage": "이미지 선택",
            "chooseImage": "이미지 선택",
            "modBackgrounds": "모드 배경",
            "noBackgrounds": "textures/에 이미지가 없습니다.",
            "backgroundsFailed": "모드 배경을 불러오지 못했습니다.",
            "resetBackground": "배경 초기화",
            "removeImage": "이미지 제거",
            "color": "색상",
            "createSequence": "시퀀스 만들기",
            "editSequence": "시퀀스 편집",
            "newSequence": "새 시퀀스",
            "saveSequence": "시퀀스 저장",
            "name": "이름",
            "animation": "애니메이션",
            "startAfter": "시작 지연",
            "playFor": "재생 시간",
            "auto": "자동",
            "addAnimation": "애니메이션 추가",
            "addStep": "단계 추가",
            "step": "단계 {number}",
            "sequenceHelp": "단계는 순서대로, 같은 단계의 애니메이션은 함께 재생됩니다. 시작 지연은 단계 시작을 기준으로 합니다. 자동은 원래 길이를 사용하며 반복은 지정한 시간 동안 재생합니다.",
            "restart": "미리보기 처음부터 재생",
            "play": "재생",
            "pause": "일시 정지",
            "playPreview": "미리보기 재생",
            "pausePreview": "미리보기 일시 정지",
            "restartAll": "모든 미리보기 처음부터 재생",
            "playAll": "모든 미리보기 재생",
            "pauseAll": "모든 미리보기 일시 정지",
            "loopAll": "모든 미리보기 반복",
            "loop": "애니메이션 반복",
            "noAnimations": "애니메이션 없음",
            "noAnimation": "애니메이션 없음",
            "global": "전체 ({animation})",
            "layers": "레이어",
            "showAllLayers": "모두 표시",
            "hideAllLayers": "모두 숨기기",
            "resetLayers": "초기화",
            "searchLayers": "레이어 검색…",
            "noLayers": "레이어가 없습니다.",
            "settings": "설정",
            "characters": "캐릭터",
            "application": "애플리케이션",
            "theme": "테마",
            "rendering": "렌더링",
            "onTopHelp": "미리보기를 다른 창 위에 표시합니다.",
            "alphaHelp": "텍스처에 사전 곱셈 알파를 사용합니다.",
            "help": "도움말",
            "close": "닫기",
            "options": "미리보기 옵션",
            "addRight": "오른쪽에 미리보기 추가",
            "addBottom": "아래에 미리보기 추가",
            "rearrange": "미리보기 재배치",
            "dragMove": "미리보기 또는 행 사이로 드래그하여 이동",
            "closePreview": "미리보기 닫기",
            "progress": "애니메이션 진행",
            "previewAnimation": "미리보기 애니메이션",
            "previewLayers": "이 미리보기의 레이어",
            "closeLayers": "레이어 닫기",
            "searchLayersLabel": "레이어 검색",
            "closeSettings": "설정 닫기",
            "closeEditor": "시퀀스 편집기 닫기",
            "sequenceSteps": "시퀀스 단계",
            "loopDuration": "지정 시간 동안 반복",
            "resize": "드래그하여 크기 조절.",
            "resizeCharacters": "캐릭터 패널 크기 조절",
            "edit": "{name} 편집",
            "delete": "{name} 삭제",
            "animationNumber": "애니메이션 {number}",
            "closeStep": "단계 {number} 닫기",
            "reorderAnimation": "애니메이션 {number} 순서 변경",
            "loopNumber": "애니메이션 {number} 반복",
            "delayNumber": "애니메이션 {number} 시작 지연",
            "durationNumber": "애니메이션 {number} 재생 시간",
            "removeAnimation": "애니메이션 {number} 제거"
        },
        common: {
            viewLogs: '로그 보기',
            openFolder: '폴더 열기',
            retry: '다시 시도',
            goBack: '돌아가기',
            close: '닫기'
        },
        app: {
            copyMachineId: "클립보드에 복사",
            copied: "클립보드에 복사했습니다",
            machineIdNotFound: "기기 ID를 가져올 수 없습니다",
            backToHome: '뒤로',
            toggleControls: '컨트롤',
        },
        homePage: {
            title: '모드 미리보기',
            subtitle: '폴더를 드래그 앤 드롭하거나 선택하세요',
            recentFoldersLabel: '최근 폴더',
            recentFoldersEmpty: '최근 폴더를 찾을 수 없습니다.',
            openFolderButton: '폴더 찾아보기',
        },
        characterList: {
            searchPlaceholder: '캐릭터 검색...',
            noCharactersFound: '캐릭터를 찾을 수 없습니다.',
            loadingCharacters: '캐릭터 로딩 중...',
            tabs: {
                minigames: "미니게임",
                standing: '기본',
                cutscene: '컷신',
                dating: '데이트'
            },
            sort: {
                newest: '최신순',
                oldest: '오래된 순',
                a_z: '가나다순',
                z_a: '가나다역순'
            },
            loadingCharacter: '캐릭터 로딩 중...',
            information: '캐릭터 에셋은 GitHub 저장소에서 로드됩니다'
        },
        error: {
            title: '문제가 발생했습니다',
            message: '예상치 못한 오류가 발생했습니다. 다시 시도해 주세요.',
            noInternet: {
                title: '인터넷 연결 없음',
                message: '인터넷 연결 없이는 캐릭터 에셋을 로드할 수 없습니다.',
                checking: '확인 중...',
            }
        },
        controls: {
            title: "컨트롤",
            noSource: "소스 없음!",
            links: {
                suggestFeature: "기능 제안하기",
                reportIssue: "문제 신고하기"
            },
            render: {
                title: "렌더링",
                premultipliedAlpha: "미리 곱셈된 알파",
                backgroundColor: "배경색",
                backgroundImage: "배경 이미지",
                chooseImage: "이미지 선택"
            },
            animations: {
                title: "애니메이션",
                available: "{count}개 사용 가능",
                loopAnimation: "애니메이션 반복",
                noAnimations: "사용 가능한 애니메이션이 없습니다"
            },
            actions: {
                title: "작업",
                viewHistory: "히스토리 보기",
                openLogs: "로그 열기"
            },
            appSettings: {
                title: "앱 설정",
                language: "언어",
                alwaysOnTop: "항상 위에 표시"
            },
            version: "BD2ModPreview v{version}"
        },
        historyDialog: {
            title: '히스토리 ({count})',
            noHistory: '최근 히스토리 없음',
            unknownCharacter: '알 수 없음',
            unknownModType: '알 수 없음',
            sourceTypes: {
                github: 'Github',
                folder: '폴더'
            },
            modTypes: {
                standing: '기본',
                cutscene: '컷신',
                npc: 'NPC',
                scene: '장면',
                dating: '데이트'
            },
            actions: {
                remove: '히스토리에서 제거',
                loadAnimation: '애니메이션 로드'
            }
        },
        errors: {
            DirectoryNotFound: {
                title: '디렉토리를 찾을 수 없음',
                message: '선택한 폴더를 찾을 수 없습니다.'
            },
            MissingSkeletonOrJson: {
                title: '스켈레톤 파일 누락',
                message: '선택한 폴더에 필요한 스켈레톤 .json 또는 .skel 파일이 없습니다.',
                actionLabel: 'Github에서 원본 스켈레톤 다운로드'
            },
            AssetLoadingError: {
                title: '에셋 로딩 오류',
                message: 'Spine 에셋 로딩에 실패했습니다.'
            },
            AssetNotFoundError: {
                title: '에셋을 찾을 수 없음',
                message: '에셋을 찾을 수 없습니다.'
            },
            AssetTooManyRequestsError: {
                title: '너무 많은 요청',
                message: '너무 많은 요청을 했습니다. 나중에 다시 시도해 주세요.'
            },
            InitializationError: {
                title: '초기화 오류',
                message: 'Spine 플레이어 초기화에 실패했습니다.'
            },
            PlayerError: {
                title: '플레이어 오류',
                message: 'Spine 플레이어에서 오류가 발생했습니다.'
            },
            SkeletonError: {
                title: '스켈레톤 오류',
                message: '스켈레톤(.skel 또는 .json) 로드에 실패했습니다. 스켈레톤이 손상되었거나 아틀라스와 스켈레톤 파일 간에 불일치가 있을 수 있습니다.'
            },
            SkeletonNotFound: {
                title: '스켈레톤을 찾을 수 없음',
                message: '앗! GitHub 저장소에서 스켈레톤 에셋을 찾을 수 없습니다.'
            },
            CharacterIdNotFound: {
                title: '캐릭터 ID를 찾을 수 없음',
                message: '폴더에서 캐릭터 ID를 확인할 수 없습니다.'
            },
            DirectoryInvalidError: {
                title: '잘못된 디렉토리',
                message: '선택한 디렉토리가 잘못되었거나 Spine 에셋이 포함되어 있지 않습니다.'
            },
            UnknownError: {
                title: "예상치 못한 오류가 발생했습니다",
                message: "예상치 못한 오류가 발생했습니다. 자세한 정보는 로그를 확인하세요."
            }
        }
    }
}

export const i18n = createI18n({
    legacy: false,
    locale: 'en_US',
    fallbackLocale: 'en_US',
    messages
})