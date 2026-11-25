export default defineAppConfig({
  pages: ['pages/home/index', 'pages/profile/index'],
  lazyCodeLoading: 'requiredComponents',
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F7F7F2',
    navigationBarTitleText: '今天吃啥',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F7F7F2',
  },
  style: 'v2',
  sitemapLocation: 'sitemap.json',
})
