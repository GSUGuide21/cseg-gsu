import React from "react"
import { 
  Header, 
  Content, 
  Footer, 
  PageWrapper 
} from "./globals"
import { IntersectionProvider } from "../contexts/Intersection"
 
export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <IntersectionProvider>
      <PageWrapper>
        <Header />
        <Content>{children}</Content>
        <Footer />
      </PageWrapper>
    </IntersectionProvider>
  )
}