"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-white"
        >
          DEI Training
        </Link>

        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white" />
            }
          >
            <Menu className="size-5" />
            <span className="sr-only">メニューを開く</span>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="bg-slate-900 border-slate-800"
          >
            <SheetHeader>
              <SheetTitle className="text-white">メニュー</SheetTitle>
              <SheetDescription className="text-slate-400">
                モードを選択してください
              </SheetDescription>
            </SheetHeader>

            <nav className="flex flex-col gap-1 px-4">
              <SheetClose
                render={
                  <Link
                    href="/"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === "/"
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  />
                }
              >
                <BookOpen className="size-4" />
                個人で学ぶ
              </SheetClose>

              <SheetClose
                render={
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname.startsWith("/admin")
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  />
                }
              >
                <Settings className="size-4" />
                研修モード
              </SheetClose>

              <Separator className="my-2 bg-slate-700" />

              <SheetClose
                render={
                  <Link
                    href="/#howto"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  />
                }
              >
                <HelpCircle className="size-4" />
                使い方
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
