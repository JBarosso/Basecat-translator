import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, TrendingUp, DollarSign, BarChart, Type } from "lucide-react"
import { getLanguageByCode } from "@/lib/languages"

export function StatsView({ stats, onReset }) {
    if (!stats || stats.totalTranslations === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <p className="text-sm italic">Les statistiques apparaîtront après votre première traduction</p>
            </div>
        );
    }

    const avgCost = stats.totalTranslations > 0 ? stats.totalCost / stats.totalTranslations : 0;
    const totalTokens = (stats.totalInputTokens || 0) + (stats.totalOutputTokens || 0);

    const langStats = Object.entries(stats.byLanguage || {}).map(([code, data]) => {
        const langInfo = getLanguageByCode(code);
        return {
            code,
            name: langInfo ? langInfo.name : code,
            flag: langInfo ? langInfo.flag : '🌐',
            count: data.count,
            cost: data.cost,
            percentage: ((data.count / stats.totalTranslations) * 100).toFixed(1)
        };
    }).sort((a, b) => b.count - a.count);

    return (
        <div className="space-y-4">
            {/* Grid 2x2 for main metrics */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-500/30 rounded-xl text-center shadow-sm">
                    <div className="bg-blue-500/20 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1">
                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-xl font-bold">{stats.totalTranslations}</div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Traductions</div>
                </div>

                <div className="p-3 bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-200/50 dark:border-pink-500/30 rounded-xl text-center shadow-sm">
                    <div className="bg-pink-500/20 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1">
                        <DollarSign className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="text-xl font-bold">${stats.totalCost.toFixed(4)}</div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Coût Total</div>
                </div>

                <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-200/50 dark:border-cyan-500/30 rounded-xl text-center shadow-sm">
                    <div className="bg-cyan-500/20 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1">
                        <BarChart className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold">${avgCost.toFixed(4)}</div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Coût Moyen</div>
                </div>

                <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-200/50 dark:border-green-500/30 rounded-xl text-center shadow-sm">
                    <div className="bg-green-500/20 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1">
                        <Type className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-xl font-bold">{totalTokens.toLocaleString()}</div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Tokens</div>
                </div>
            </div>

            {/* Language breakdown title */}
            <div className="px-1 flex items-center gap-2 mt-6">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-shrink-0">Répartition par langue</span>
                <div className="h-[1px] bg-border flex-grow"></div>
            </div>

            {/* Language list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {langStats.map(item => (
                    <div key={item.code} className="flex items-center justify-between p-2 rounded-lg bg-card border hover:bg-accent/30 transition-colors group">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{item.flag}</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">{item.name}</span>
                                <span className="text-[10px] text-muted-foreground">{item.count} trad. ({item.percentage}%)</span>
                            </div>
                        </div>
                        <div className="text-xs font-mono font-bold text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                            ${item.cost.toFixed(4)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer with last update and reset */}
            <div className="pt-4 flex flex-col items-center gap-3">
                <div className="text-[10px] text-muted-foreground italic">
                    Dernière mise à jour : {new Date(stats.lastUpdated).toLocaleString()}
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs gap-2 py-5"
                    onClick={onReset}
                >
                    <Trash2 className="h-3 w-3" />
                    Réinitialiser les statistiques
                </Button>
            </div>
        </div>
    );
}
