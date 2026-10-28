'use client'
import clsx from "clsx"
import React, { 
  useState, 
  useEffect, 
  useCallback 
} from "react"
import { Menu } from "lucide-react"
import { Logo } from "./Logo"
import { NavigationList } from "./Navigation/NavigationList"
import { useBreakpoint, type BreakpointContextType } from "@/app-old/contexts/Breakpoint"
import { useOutsideClick } from "@/app-old/hooks"

type MobileNavigationProps = React.HTMLAttributes<HTMLElement>

export const MobileNavigation: React.FC<MobileNavigationProps> = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const { isDesktop } = useBreakpoint() as BreakpointContextType

  useEffect(() => {
    if (isDesktop) setIsOpen(false)
  }, [isDesktop, setIsOpen])

  const handleToggle = useCallback(() => setIsOpen(prev => !prev), [])
  const handleClose = useCallback(() => setIsOpen(false), [])
  const ref = useOutsideClick(handleClose)

  return (
    <div
      className="page-header__inner mobile-navigation"
      ref={ref as React.RefObject<HTMLDivElement>}>
      <Logo />
      <div className="page-header__mobile-navigation">
        <button
          className="page-header__mobile-navigation-toggle"
          aria-label="Toggle mobile navigation"
          onClick={handleToggle}>
          <Menu size={24} />
        </button>
        <section
          className={clsx("page-header__mobile-navigation-menu", {
            "is-open": isOpen,
          })}
          role="navigation">
          <NavigationList />
        </section>
      </div>
    </div>
  )
} 


  /* const { isDesktop } = useBreakpoint()
  const { isMobile } = useMedia(MAX_TABLET_WIDTH)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const ref = useOutsideClick(handleClose, isOpen)

  useEffect(() => {
    if (isDesktop) {
      setIsOpen(false)
    }
  }, [isDesktop]) */