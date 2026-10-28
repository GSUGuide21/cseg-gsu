import ComponentsDemoPage from '../app/(page)/dev/components/page'
import DashboardDemoPage from '../app/(page)/dev/dashboard/page'
import PostEditorDemoPage from '../app/(page)/dev/post-editor/page'
import PageEditorDemoPage from '../app/(page)/dev/page-editor/page'

// The post editor preview imports the dashboard's server actions, which need a server; only the 404 is checked here
jest.mock('../app/lib/dashboard/actions', () => ({}))
import FormsDemoPage from '../app/(page)/dev/forms/page'

describe('Development-only pages', () => {
  it('404s the form demo outside next dev', () => {
    // Jest runs with NODE_ENV=test; builds use "production". Either way, not "development".
    expect(process.env.NODE_ENV).not.toBe('development')
    expect(() => FormsDemoPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/)
  })

  it('404s the components demo outside next dev', () => {
    expect(() => ComponentsDemoPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/)
  })

  it('404s the dashboard demo outside next dev', () => {
    expect(() => DashboardDemoPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/)
  })

  it('404s the page editor preview outside next dev', () => {
    expect(() => PageEditorDemoPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/)
  })

  it('404s the post editor preview outside next dev', () => {
    expect(() => PostEditorDemoPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/)
  })
})
