"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // next-themes SSR hydration — faqat client da ko'rsatish
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg" />
  }

  const options = [
    { value: "light",  label: "Kunduzgi",  icon: Sun },
    { value: "dark",   label: "Tungi",     icon: Moon },
    { value: "system", label: "Tizim",     icon: Monitor },
  ] as const

  const CurrentIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Rejimni o'zgartirish"
        >
          <CurrentIcon className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {options.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "gap-2.5 cursor-pointer text-sm",
              theme === value && "bg-primary/10 text-primary font-medium",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
