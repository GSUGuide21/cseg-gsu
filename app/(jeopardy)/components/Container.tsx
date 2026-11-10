'use client'
import React, { FC } from "react"
import { GameProvider } from "./Context"
import type { BoardContainerProps } from './types'

export const Container: FC<BoardContainerProps> = ({ children }) => {
  return (
    <GameProvider>
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="w-full h-full flex items-center justify-center relative">
          {/* Background pattern overlay */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          {children}  
        </div>
      </div>
    </GameProvider>
  )
}