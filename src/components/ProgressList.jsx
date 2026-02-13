import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export function ProgressList({ progress, type = "Translate" }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Check if all items are completed
        const allCompleted = Object.values(progress).every(
            item => item.status === 'completed' || item.status === 'error'
        );

        if (allCompleted) {
            const timer = setTimeout(() => {
                setVisible(false);
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            setVisible(true);
        }
    }, [progress]);

    if (!visible) return null;

    return (
        <Card className={`transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm">{type === "Translate" ? "Traduction" : "Validation"} en cours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {Object.entries(progress).map(([langCode, item]) => {
                    const isCompleted = item.status === 'completed';
                    const isError = item.status === 'error';
                    const isInProgress = !isCompleted && !isError;

                    return (
                        <div key={langCode} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2">
                                    {isCompleted && <CheckCircle className="h-3 w-3 text-green-600" />}
                                    {isError && <XCircle className="h-3 w-3 text-destructive" />}
                                    {isInProgress && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                    {langCode.split('_')[0].toUpperCase()}
                                </span>
                                <span className="text-xs text-muted-foreground">{item.message || item.status}</span>
                            </div>
                            <Progress value={item.percent} className="h-1.5" />
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
