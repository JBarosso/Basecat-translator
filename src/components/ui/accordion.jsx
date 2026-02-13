import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Accordion = React.forwardRef(({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {children}
    </div>
))
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef(({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn("border rounded-lg", className)} {...props}>
        {children}
    </div>
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef(
    ({ className, children, isOpen, onClick, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(
                "flex w-full items-center justify-between p-4 font-medium transition-all hover:bg-muted/50",
                className
            )}
            onClick={onClick}
            {...props}
        >
            {children}
            <ChevronDown
                className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                )}
            />
        </button>
    )
)
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef(
    ({ className, children, isOpen, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "overflow-hidden transition-all",
                isOpen ? "max-h-96" : "max-h-0"
            )}
            {...props}
        >
            <div className={cn("p-4 pt-0", className)}>{children}</div>
        </div>
    )
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
