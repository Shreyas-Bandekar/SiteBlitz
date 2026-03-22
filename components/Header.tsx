"use client";

import Link from "next/link";
import { Button } from "./ui/Button";
import { Activity, Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            SiteBlitz
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="#testimonials" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Testimonials
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" className="hidden sm:inline-flex text-sm">Sign In</Button>
          <Button variant="default" className="text-sm">Get Started</Button>
          <button 
            type="button" 
            className="md:hidden inline-flex p-2 text-foreground focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 pb-6 shadow-lg animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-4">
            <Link href="#features" onClick={() => setIsOpen(false)} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" onClick={() => setIsOpen(false)} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="#testimonials" onClick={() => setIsOpen(false)} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Testimonials
            </Link>
            <div className="mt-2 text-sm text-foreground/80 flex flex-col gap-2">
              <Button variant="outline" className="w-full text-sm">Sign In</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
