// 学習カリキュラムの定義
export const CURRICULUM_STAGES = [
    {
        id: 1,
        title: "Stage 1: 確率・分布の基礎",
        subtitle: "まずは統計学の言語である「確率」を制する",
        category: "確率と分布",
        description: "確率変数、期待値、主要な確率分布を理解します。これらは全ての分野の土台となります。",
        requiredLevel: 1,
        topics: [
            "確率変数と確率分布",
            "期待値・分散・共分散",
            "離散型分布(二項・ポアソン・幾何・負の二項)",
            "連続型分布(正規・指数・ガンマ・ベータ)"
        ]
    },
    {
        id: 2,
        title: "Stage 2: 推定と検定の理論",
        subtitle: "データから母集団の性質を見抜く",
        category: "統計的推測",
        description: "点推定、区間推定、仮説検定の論理を学びます。最尤法や尤度比検定は準1級の最重要項目です。",
        requiredLevel: 5,
        topics: [
            "最尤法",
            "点推定(不偏性・一致性・有効性)",
            "母平均・母分散の検定",
            "尤度比検定"
        ]
    },
    {
        id: 3,
        title: "Stage 3: 多変量解析の入り口",
        subtitle: "複雑なデータを要約・分類する",
        category: "多変量解析",
        description: "たくさんの変数を扱う手法を学びます。主成分分析や判別分析は実務でも頻出です。",
        requiredLevel: 10,
        topics: [
            "主成分分析",
            "判別分析(線形・2次・正準)",
            "階層型クラスター分析",
            "非階層型クラスター分析(k-means法)"
        ]
    },
    {
        id: 4,
        title: "Stage 4: 回帰モデルの拡張",
        subtitle: "予測モデルを構築し、評価する",
        category: "回帰・線形モデル",
        description: "単回帰から重回帰へ。さらにロジスティック回帰や正則化など、現代的な手法へと進みます。",
        requiredLevel: 15,
        topics: [
            "重回帰分析",
            "多重共線性",
            "ロジスティック回帰",
            "正則化回帰(Lasso・Ridge)"
        ]
    },
    {
        id: 5,
        title: "Stage 5: 実験と分散分析",
        subtitle: "効率的なデータの集め方",
        category: "実験計画・分散分析",
        description: "実験計画法とANOVA（分散分析）を学びます。交互作用やブロック化の概念が鍵です。",
        requiredLevel: 20,
        topics: [
            "一元配置分散分析",
            "二元配置分散分析(交互作用)",
            "フィッシャーの3原則",
            "直交配列(直交表)"
        ]
    },
    {
        id: 6,
        title: "Stage 6: 時系列と確率過程",
        subtitle: "時間の流れの中にある法則",
        category: "時系列・確率過程",
        description: "自己相関やARMAモデル、マルコフ連鎖など、時間変化するデータを扱う手法です。",
        requiredLevel: 25,
        topics: [
            "自己相関・偏自己相関",
            "ARモデル・MAモデル・ARMAモデル",
            "マルコフ連鎖(推移確率・定常分布)",
            "ブラウン運動(ウィーナー過程)"
        ]
    },
    {
        id: 7,
        title: "Stage 7: 高度なモデルと標本",
        subtitle: "より現実に即した統計モデリング",
        category: "標本・分割表・モデル",
        description: "標本調査法や分割表の解析、モデル選択基準(AIC)など、応用的なトピックを扱います。",
        requiredLevel: 30,
        topics: [
            "標本調査法",
            "分割表の解析(オッズ比・連関係数)",
            "モデル選択基準(AIC・BIC)",
            "EMアルゴリズム"
        ]
    },
    {
        id: 8,
        title: "Stage 8: ベイズとシミュレーション",
        subtitle: "現代統計学のフロンティア",
        category: "ベイズ・シミュレーション",
        description: "ベイズ統計の考え方と、計算機を使ったシミュレーション手法を学びます。",
        requiredLevel: 35,
        topics: [
            "ベイズの定理・事後分布",
            "ベイズ推定(点推定・区間推定)",
            "MCMC(マルコフ連鎖モンテカルロ法)",
            "モンテカルロ法"
        ]
    }
];