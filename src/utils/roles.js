import { Briefcase, ShoppingCart, Activity, TrendingUp, Factory, Landmark } from 'lucide-react';

export const ROLES = {
    'data_scientist': {
        id: 'data_scientist',
        name: 'データサイエンティスト',
        description: 'IT企業でユーザーログの解析や、機械学習モデルの構築・評価を担当します。',
        icon: Briefcase,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        focus: '多変量解析、ベイズ統計、線形モデル'
    },
    'marketing_analyst': {
        id: 'marketing_analyst',
        name: 'マーケティングアナリスト',
        description: '小売・EC業界で、売上データの分析やキャンペーンの効果検証(A/Bテスト)を行います。',
        icon: ShoppingCart,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/30',
        focus: '推測統計、線形モデル、実験計画法'
    },
    'medical_researcher': {
        id: 'medical_researcher',
        name: '医療統計家 (Biostatistician)',
        description: '製薬会社や研究所で、治験データの分析や生存時間解析を行い、新薬の有効性を検証します。',
        icon: Activity,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        focus: '推測統計、実験計画法、ノンパラメトリック検定'
    },
    'financial_quant': {
        id: 'financial_quant',
        name: '金融クオンツ',
        description: '金融機関で市場データの時系列分析や、リスク管理モデルの構築を行います。',
        icon: TrendingUp,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        focus: '時系列解析、確率・分布、ベイズ統計'
    },
    'quality_control': {
        id: 'quality_control',
        name: '品質管理エンジニア',
        description: '製造業の工場で、製品の規格外れを防ぐための工程管理や抜き取り検査を設計します。',
        icon: Factory,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        focus: '推測統計、確率・分布、実験計画法'
    }
};

export const ROLE_IDS = Object.keys(ROLES);