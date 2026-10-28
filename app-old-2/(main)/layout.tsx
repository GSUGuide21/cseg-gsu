import { ReactNode } from 'react'
import { 
  Header, 
  Content, 
  Footer,
  Wrapper 
} from './globals'
import { IntersectionProvider } from '../contexts'

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <IntersectionProvider>
      <Wrapper className="page-layout">
        <Header />
        <Content>{children}</Content>
        <Footer />
      </Wrapper>
    </IntersectionProvider>
  )
}