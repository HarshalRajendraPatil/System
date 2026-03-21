const PORTFOLIO_THEME = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
};

const PORTFOLIO_THEME_ORDER = Object.values(PORTFOLIO_THEME);

const PORTFOLIO_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

module.exports = {
  PORTFOLIO_SLUG_PATTERN,
  PORTFOLIO_THEME,
  PORTFOLIO_THEME_ORDER,
};