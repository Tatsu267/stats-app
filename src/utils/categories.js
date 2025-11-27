// 分野ごとの設定（名前、説明、色）
export const CATEGORY_CONFIG = {
    '確率・分布': {
        description: '確率変数、各種確率分布、極限定理、変数変換など',
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30'
    },
    '推測統計': {
        description: '点推定、区間推定、仮説検定、検出力、最尤法など',
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30'
    },
    '多変量解析': {
        description: '主成分分析、判別分析、因子分析、クラスター分析、共分散構造など',
        color: 'text-purple-400',
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30'
    },
    '線形モデル': {
        description: '回帰分析、分散分析(ANOVA)、一般化線形モデル(GLM)など',
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30'
    },
    '時系列解析': {
        description: '自己相関、ARMAモデル、状態空間モデル、トレンド分析など',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/20',
        border: 'border-cyan-500/30'
    },
    'ベイズ統計': {
        description: 'ベイズの定理、事前・事後分布、ベイズ推定、MCMCなど',
        color: 'text-pink-400',
        bg: 'bg-pink-500/20',
        border: 'border-pink-500/30'
    },
    '実験・その他': {
        description: '実験計画法、ノンパラメトリック検定、標本調査法、シミュレーションなど',
        color: 'text-gray-400',
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30'
    }
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_CONFIG);