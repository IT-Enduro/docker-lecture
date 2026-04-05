// @ts-check

const config = {
  title: 'Интенсив по Docker',
  tagline: 'Интенсив по Docker',
  favicon: 'images/logo.svg',
  url: 'https://it-enduro.com',
  baseUrl: '/docker-lecture/',
  organizationName: 'it-enduro',
  projectName: 'docker-lecture',
  onBrokenLinks: 'ignore',
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru']
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/'
        },
        blog: false,
        theme: {
          customCss: require.resolve('./static/css/custom.css')
        }
      }
    ]
  ],
  themeConfig: {
    navbar: {
      title: 'Интенсив по Docker',
      items: [
        {
          href: 'https://github.com/it-enduro/docker-lecture',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    prism: {
      additionalLanguages: ['bash', 'docker']
    }
  }
};

module.exports = config;
