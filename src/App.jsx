import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Globe, CheckCircle, BarChart3, AlertTriangle, ExternalLink, RefreshCw, X, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

import { LanguageSelector } from "@/components/LanguageSelector"
import { useChromeStorage } from "@/hooks/useChromeStorage"
import { useCurrentPage } from "@/hooks/useCurrentPage"
import { useProductStatus } from "@/hooks/useProductStatus"
import { useTranslation } from "@/hooks/useTranslation"
import { useValidation } from "@/hooks/useValidation"
import { ProgressList } from "@/components/ProgressList"
import { StatsView } from "@/components/StatsView"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

function App() {
  const [selectedLangs, setSelectedLangs] = useChromeStorage('selectedTargetLanguages', [])
  const [apiKey, setApiKey] = useChromeStorage('openaiApiKey', '')
  const [theme, setTheme] = useChromeStorage('theme', 'light')
  const [showSettings, setShowSettings] = useState(false)

  const pageInfo = useCurrentPage()
  const productStatus = useProductStatus(pageInfo.productId, selectedLangs)
  const { translateProduct, translating, progress, error: translationError } = useTranslation(apiKey)
  const { validateProduct, validating, validationProgress, validationError } = useValidation()
  const [stats, setStats] = useChromeStorage('translationStats', null, 'local')
  const [statsOpen, setStatsOpen] = useState(false)

  const handleOpenLanguages = async () => {
    if (!pageInfo.productId || selectedLangs.length === 0) return

    try {
      const currentUrl = new URL(pageInfo.url)
      for (const langCode of selectedLangs) {
        const newUrl = new URL(currentUrl.href)
        newUrl.searchParams.set('loc_data', langCode)
        await chrome.tabs.create({ url: newUrl.href, active: false })
      }
    } catch (error) {
      console.error('Error opening tabs:', error)
    }
  }

  const handleCloseTabs = async () => {
    if (!pageInfo.productId) return;

    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const tabsToClose = allTabs.filter(t => {
        if (!t.url || !t.url.includes(`id=${pageInfo.productId}`)) return false;
        const url = new URL(t.url);
        const lang = url.searchParams.get('loc_data');
        return selectedLangs.includes(lang);
      });

      const tabIds = tabsToClose.map(t => t.id);
      if (tabIds.length > 0) {
        await chrome.tabs.remove(tabIds);
      }
    } catch (error) {
      console.error('Error closing tabs:', error);
    }
  };

  const handleTranslateAll = async () => {
    if (!pageInfo.productId || !productStatus.ready) return;

    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const targetTabs = allTabs
      .filter(t => t.url && t.url.includes(`id=${pageInfo.productId}`))
      .map(t => {
        const url = new URL(t.url);
        const lang = url.searchParams.get('loc_data');
        return { tab: t, langCode: lang };
      })
      .filter(item => selectedLangs.includes(item.langCode));

    const sourceTab = allTabs.find(t => {
      if (!t.url || !t.url.includes(`id=${pageInfo.productId}`)) return false;
      const url = new URL(t.url);
      const lang = url.searchParams.get('loc_data');
      return !selectedLangs.includes(lang);
    });

    if (targetTabs.length > 0 && sourceTab) {
      translateProduct(pageInfo.productId, sourceTab.id, targetTabs);
    } else {
      console.error('Missing source or target tabs');
    }
  };

  const handleTranslateCurrent = async () => {
    if (!pageInfo.productId || !pageInfo.lang) return;

    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const currentTab = allTabs.find(t => t.active && t.url && t.url.includes(`id=${pageInfo.productId}`));

    if (!currentTab) return;

    const sourceTab = allTabs.find(t => {
      if (!t.url || !t.url.includes(`id=${pageInfo.productId}`)) return false;
      const url = new URL(t.url);
      const lang = url.searchParams.get('loc_data');
      return !selectedLangs.includes(lang);
    });

    if (sourceTab) {
      translateProduct(pageInfo.productId, sourceTab.id, [{ tab: currentTab, langCode: pageInfo.lang }]);
    }
  };

  const handleValidateCurrent = async () => {
    if (!pageInfo.productId || !pageInfo.lang) return;

    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const currentTab = allTabs.find(t => t.active && t.url && t.url.includes(`id=${pageInfo.productId}`));

    if (currentTab) {
      validateProduct(pageInfo.productId, [{ tab: currentTab, langCode: pageInfo.lang }]);
    }
  };

  const handleValidateAll = async () => {
    if (!pageInfo.productId || !productStatus.ready) return;

    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const targetTabs = allTabs
      .filter(t => t.url && t.url.includes(`id=${pageInfo.productId}`))
      .map(t => {
        const url = new URL(t.url);
        const lang = url.searchParams.get('loc_data');
        return { tab: t, langCode: lang };
      })
      .filter(item => selectedLangs.includes(item.langCode));

    if (targetTabs.length > 0) {
      validateProduct(pageInfo.productId, targetTabs);
    } else {
      console.error('No target tabs found for validation');
    }
  };

  return (
    <div className={cn("w-full h-screen bg-background text-foreground flex flex-col", theme === 'dark' && 'dark')}>
      <header className="px-4 py-2 border-b flex items-center justify-between bg-card shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐱</span>
          <h1 className="font-bold text-lg tracking-tight">Basecat Translator</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="hover:bg-accent hover:text-accent-foreground"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {showSettings && (
        <div className="p-4 bg-muted/50 border-b">
          <Label htmlFor="apiKey">Clé API OpenAI</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Nécessaire pour la traduction automatique.</p>
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-8 max-w-2xl mx-auto">
          {/* Status Card */}
          <Card className={`transition-colors ${pageInfo.isBasecat ? (pageInfo.productId ? "border-primary/30 bg-primary/5" : "border-yellow-200 bg-yellow-50") : "border-destructive/50 bg-destructive/10"}`}>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {pageInfo.isBasecat ? (
                    pageInfo.productId ? <CheckCircle className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  État de la page
                </span>
                {pageInfo.loading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-sm">
                {pageInfo.isBasecat ? (
                  pageInfo.productId ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Langue actuelle:</span>
                        <Badge variant="outline" className="bg-background">{pageInfo.lang}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ID Produit:</span>
                        <span className="font-mono text-xs bg-background px-2 py-0.5 rounded border">{pageInfo.productId}</span>
                      </div>
                    </div>
                  ) : (
                    "Aucun produit détecté"
                  )
                ) : (
                  "Naviguez sur une fiche produit Basecat"
                )}
              </div>
            </CardContent>
          </Card>

          {/* Language Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Langues cibles</CardTitle>
                <span className="text-xs text-muted-foreground">{selectedLangs.length} sélectionnée(s)</span>
              </div>
            </CardHeader>
            <CardContent>
              <LanguageSelector
                selectedLangs={selectedLangs}
                onSelectionChange={setSelectedLangs}
              />
            </CardContent>
          </Card>

          {/* Status Counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-3 bg-card rounded-lg border text-center">
              <span className="text-2xl font-bold text-primary">{productStatus.sourceLangs}</span>
              <span className="text-xs text-muted-foreground font-medium">Sources (ouvertes)</span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-card rounded-lg border text-center">
              <span className="text-2xl font-bold text-primary">{productStatus.targetLangs}</span>
              <span className="text-xs text-muted-foreground font-medium">Cibles (ouvertes)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 border-primary/30 hover:bg-primary/5"
              onClick={handleOpenLanguages}
              disabled={!pageInfo.productId || selectedLangs.length === 0}
            >
              <ExternalLink className="mr-3 h-4 w-4 text-primary" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Ouvrir les onglets</span>
                <span className="text-xs font-normal text-muted-foreground">Ouvre toutes les langues sélectionnées</span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 border-destructive/30 hover:bg-destructive/10 dark:border-red-500/50 dark:text-red-400"
              onClick={handleCloseTabs}
              disabled={!pageInfo.productId || selectedLangs.length === 0}
            >
              <X className="mr-3 h-4 w-4 text-destructive dark:text-red-500" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Fermer les onglets</span>
                <span className="text-xs font-normal text-muted-foreground dark:text-muted-foreground/80">Ferme tous les onglets cibles ouverts</span>
              </div>
            </Button>

            <Separator className="my-2" />

            <div className="flex flex-row flex-wrap gap-3 items-center justify-start">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 basis-[180px] h-auto py-[14px] px-4 border-primary/50 text-sm font-semibold hover:bg-primary/5 shadow-sm transition-all"
                disabled={!pageInfo.productId || !apiKey || translating}
                onClick={handleTranslateCurrent}
              >
                <Globe className="h-4 w-4 mr-2 shrink-0" />
                Traduire page
              </Button>
              <Button
                size="sm"
                className="flex-1 basis-[180px] h-auto py-[14px] px-4 text-sm font-semibold shadow-md border-primary border-2 bg-primary hover:bg-primary/90 transition-all"
                disabled={!productStatus.ready || !apiKey || translating}
                onClick={handleTranslateAll}
              >
                <Globe className="h-4 w-4 mr-2 shrink-0" />
                Traduire tout
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 basis-[180px] h-auto py-[14px] px-4 border-primary/50 text-sm font-semibold hover:bg-primary/5 shadow-sm transition-all"
                disabled={!pageInfo.productId || validating}
                onClick={handleValidateCurrent}
              >
                <CheckCircle className="h-4 w-4 mr-2 shrink-0" />
                Valider page
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 basis-[180px] h-auto py-[14px] px-4 text-sm font-semibold shadow-md border-secondary-foreground/20 border-2 bg-secondary hover:bg-secondary/80 transition-all"
                disabled={validating || !productStatus.ready}
                onClick={handleValidateAll}
              >
                <CheckCircle className="h-4 w-4 mr-2 shrink-0" />
                Valider tout
              </Button>
            </div>
          </div>

          {/* Global Errors */}
          {(translationError || validationError) && (
            <Card className="border-destructive/50 bg-destructive/5 p-3 flex items-start gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Une erreur est survenue :</p>
                <p className="opacity-80">{translationError || validationError}</p>
              </div>
            </Card>
          )}

          {/* Progress */}
          {progress[pageInfo.productId] && (
            <ProgressList progress={progress[pageInfo.productId]} type="Translate" />
          )}
          {validationProgress[pageInfo.productId] && (
            <ProgressList progress={validationProgress[pageInfo.productId]} type="Validate" />
          )}

          {/* Stats */}
          <Accordion>
            <AccordionItem>
              <AccordionTrigger
                isOpen={statsOpen}
                onClick={() => setStatsOpen(!statsOpen)}
                className="text-sm py-3"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Statistiques
                </div>
              </AccordionTrigger>
              <AccordionContent isOpen={statsOpen}>
                <StatsView
                  stats={stats}
                  onReset={() => setStats(null)}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  )
}

export default App
