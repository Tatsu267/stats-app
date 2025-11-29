// 分野ごとの設定（名前、説明、色、サブカテゴリ）
export const CATEGORY_CONFIG = {
    '確率・分布': {
        description: '確率変数、各種確率分布、極限定理、変数変換など',
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        subcategories: [
            '確率変数と確率分布', '期待値と分散', '変数変換', '離散型確率分布(二項・ポアソン等)', 
            '連続型確率分布(正規・指数等)', '多変量確率分布', '大数の法則・中心極限定理', 'チェビシェフの不等式',
            // ▼ 追加: 頻出トピック
            'ブラウン運動', '条件付き分布', '積率母関数', 'ポアソン過程', '多変量正規分布'
        ]
    },
    '推測統計': {
        description: '点推定、区間推定、仮説検定、検出力、最尤法など',
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        subcategories: [
            '点推定(不偏性・一致性)', '最尤法', '区間推定(母平均・母分散)', '仮説検定の基礎', 
            '第一種・第二種の過誤', '検出力', '尤度比検定', '適合度検定',
            // ▼ 追加: 頻出トピック
            '分割表'
        ]
    },
    '多変量解析': {
        description: '主成分分析、判別分析、因子分析、クラスター分析、共分散構造など',
        color: 'text-purple-400',
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30',
        subcategories: [
            '主成分分析', '判別分析', '因子分析', 'クラスター分析', '多次元尺度構成法', 
            '正準相関分析', '共分散構造分析',
            // ▼ 追加: 頻出トピック
            'グラフィカルモデリング'
        ]
    },
    '線形モデル': {
        description: '回帰分析、分散分析(ANOVA)、一般化線形モデル(GLM)など',
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30',
        subcategories: [
            '単回帰分析', '重回帰分析', '分散分析(一元・二元)', '回帰診断', 
            '一般化線形モデル(GLM)', 'ロジスティック回帰', 'モデル選択(AIC等)'
        ]
    },
    '時系列解析': {
        description: '自己相関、ARMAモデル、状態空間モデル、トレンド分析など',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/20',
        border: 'border-cyan-500/30',
        subcategories: [
            '自己相関・偏自己相関', '定常過程', 'AR/MA/ARMAモデル', 'ARIMAモデル', 
            '状態空間モデル', 'トレンドと季節変動', '時系列解析'
        ]
    },
    'ベイズ統計': {
        description: 'ベイズの定理、事前・事後分布、ベイズ推定、MCMCなど',
        color: 'text-pink-400',
        bg: 'bg-pink-500/20',
        border: 'border-pink-500/30',
        subcategories: [
            'ベイズの定理', '事前分布と事後分布', '共役事前分布', 'ベイズ推定', 
            'MCMC(マルコフ連鎖モンテカルロ法)', '階層ベイズモデル'
        ]
    },
    '実験・その他': {
        description: '実験計画法、ノンパラメトリック検定、標本調査法、シミュレーションなど',
        color: 'text-gray-400',
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30',
        subcategories: [
            '実験計画法(配置・ブロック)', '直交表', 'ノンパラメトリック検定', 
            'ウィルコクソンの順位和検定', '標本調査法', '乱数シミュレーション',
            // ▼ 追加: 頻出トピック
            '生存時間解析', '不完全データの統計処理'
        ]
    }
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_CONFIG);

// 統計検定準1級 頻出分野リスト
export const IMPORTANT_TOPICS = [
    '最尤法', 'ノンパラメトリック検定', 'MCMC(マルコフ連鎖モンテカルロ法)', 'ブラウン運動', '時系列解析',
    'クラスター分析', '主成分分析', '因子分析', '分散分析(一元・二元)', '標本調査法',
    '条件付き分布', 'ロジスティック回帰', '生存時間解析', '積率母関数', 'ポアソン過程',
    'ベイズ推定', '多変量正規分布', '不完全データの統計処理', '重回帰分析',
    '分割表', 'グラフィカルモデリング', '多次元尺度構成法', '正準相関分析', '判別分析', '乱数シミュレーション'
];

/**
 * トピック名から、それが属するメインカテゴリー名を検索して返す関数
 * @param {string} topic 
 * @returns {string} カテゴリー名 (見つからない場合は '実験・その他')
 */
export function getCategoryByTopic(topic) {
    for (const [categoryName, config] of Object.entries(CATEGORY_CONFIG)) {
        if (config.subcategories.includes(topic)) {
            return categoryName;
        }
    }
    return '実験・その他'; // フォールバック
}