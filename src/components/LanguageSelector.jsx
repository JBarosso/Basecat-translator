import { useState, useEffect } from 'react'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { LANGUAGES } from "@/lib/languages"

export function LanguageSelector({ selectedLangs, onSelectionChange }) {

    const handleToggle = (langCode, checked) => {
        let newSelection
        if (checked) {
            newSelection = [...selectedLangs, langCode]
        } else {
            newSelection = selectedLangs.filter(code => code !== langCode)
        }
        onSelectionChange(newSelection)
    }

    return (
        <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((lang) => (
                <div key={lang.code} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <Checkbox
                        id={`lang-${lang.shortCode}`}
                        checked={selectedLangs.includes(lang.code)}
                        onCheckedChange={(checked) => handleToggle(lang.code, checked)}
                    />
                    <Label
                        htmlFor={`lang-${lang.shortCode}`}
                        className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="font-medium">{lang.shortCode.toUpperCase()}</span>
                    </Label>
                </div>
            ))}
        </div>
    )
}
