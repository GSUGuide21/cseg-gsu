'use client'
import React from "react"
import { Logo } from "./Logo"
import { NavigationList } from "./Navigation/NavigationList"

type PageNavigationProps = React.HTMLAttributes<HTMLElement>

export const PageNavigation: React.FC<PageNavigationProps> = () => (
  <div className="page-header__inner page-navigation">
    <Logo />
    <NavigationList />
  </div>
)