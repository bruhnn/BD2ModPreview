import { createI18n } from 'vue-i18n'

const messages = {
    en: {
        common: {
            viewLogs: 'View Logs',
            openFolder: 'Open Folder',
            retry: 'Retry',
            goBack: 'Go Back',
            close: 'Close'
        },
        app: {
            backToHome: 'Back',
            toggleControls: 'Controls',
        },
        homePage: {
            title: 'Mod Preview',
            subtitle: 'Drag & Drop or Choose a Folder',
            recentFoldersLabel: 'Recent Folders',
            recentFoldersEmpty: 'No recent folders found.',
            openFolderButton: 'Browse Folder',
        },
        characterList: {
            searchPlaceholder: 'Search characters...',
            noCharactersFound: 'No characters found.',
            loadingCharacters: 'Loading characters...',
            tabs: {
                standing: 'Standing',
                cutscene: 'Cutscene',
                dating: 'Dating'
            },
            sort: {
                newest: 'Newest',
                oldest: 'Oldest',
                a_z: 'A-Z',
                z_a: 'Z-A'
            },
            loadingCharacter: 'Loading character...',
            information: 'Character assets are loaded from GitHub repository'
        },
        error: {
            title: 'Something went wrong',
            message: 'An unexpected error occurred. Please try again.',
            noInternet: {
                title: 'No Internet Connection',
                message: 'Character assets cannot be loaded without an internet connection.',
                checking: 'Checking...',
            }
        },
        controls: {
            title: "Controls",
            noSource: "No source!",
            links: {
                suggestFeature: "Suggest a Feature",
                reportIssue: "Report an Issue"
            },
            render: {
                title: "Render",
                premultipliedAlpha: "Premultiplied Alpha",
                backgroundColor: "Background Color",
                backgroundImage: "Background Image",
                chooseImage: "Choose Image"
            },
            animations: {
                title: "Animations",
                available: "{count} available",
                loopAnimation: "Loop Animation",
                noAnimations: "No animations available"
            },
            actions: {
                title: "Actions",
                viewHistory: "View History",
                openLogs: "Open Logs"
            },
            appSettings: {
                title: "App Settings",
                language: "Language"
            },
            version: "BD2ModPreview v{version}"
        },
        historyDialog: {
            title: 'History ({count})',
            noHistory: 'No recent history',
            unknownCharacter: 'Unknown',
            unknownModType: 'Unknown',
            sourceTypes: {
                github: 'Github',
                folder: 'Folder'
            },
            modTypes: {
                standing: 'Standing',
                cutscene: 'Cutscene',
                npc: 'NPC',
                scene: 'Scene',
                dating: 'Dating'
            },
            actions: {
                remove: 'Remove from history',
                loadAnimation: 'Load Animation'
            }
        },
        errors: {
            DirectoryNotFound: {
                title: 'Directory Not Found',
                message: 'The selected folder was not found.'
            },
            MissingSkeletonOrJson: {
                title: 'Missing Skeleton File',
                message: 'The selected folder is missing the required skeleton .json or .skel file.',
                actionLabel: 'Download Original Skeleton from Github'
            },
            AssetLoadingError: {
                title: 'Asset Loading Error',
                message: 'Failed to load Spine assets.'
            },
            AssetNotFoundError: {
                title: 'Asset Not Found',
                message: 'The asset was not found.'
            },
            AssetTooManyRequestsError: {
                title: 'Too Many Requests',
                message: 'You have made too many requests. Please try again later.'
            },
            InitializationError: {
                title: 'Initialization Error',
                message: 'Failed to initialize the Spine player.'
            },
            PlayerError: {
                title: 'Player Error',
                message: 'An error occurred in the Spine player.'
            },
            SkeletonError: {
                title: 'Skeleton Error',
                message: 'Failed to load skeleton (.skel or .json). Skeleton might be corrupted or there is a mismatch between atlas and skeleton files.'
            },
            SkeletonNotFound: {
                title: 'Skeleton Not Found',
                message: 'Oops! The skeleton asset is missing from the GitHub repository.'
            },
            CharacterIdNotFound: {
                title: 'Character ID Not Found',
                message: 'Could not resolve character ID from the folder.'
            },
            DirectoryInvalidError: {
                title: 'Invalid Directory',
                message: 'The selected directory is invalid or does not contain Spine assets.'
            },
            UnknownError: {
                title: "An unexpected error occurred",
                message: "An unexpected error occurred. More information in the logs."
            }
        }
    },
    zh: {
        common: {
            viewLogs: '查看日志',
            openFolder: '打开文件夹',
            retry: '重试',
            goBack: '返回',
            close: '关闭'
        },
        app: {
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
                language: "语言"
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
    ja: {
        common: {
            viewLogs: 'ログを表示',
            openFolder: 'フォルダーを開く',
            retry: '再試行',
            goBack: '戻る',
            close: '閉じる'
        },
        app: {
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
                language: "言語"
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
    ko: {
    common: {
        viewLogs: '로그 보기',
        openFolder: '폴더 열기',
        retry: '다시 시도',
        goBack: '돌아가기',
        close: '닫기'
    },
    app: {
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
            language: "언어"
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
    locale: 'en',
    fallbackLocale: 'en',
    messages
})
