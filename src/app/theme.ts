import type { ThemeConfig } from 'antd'
import { tokens } from './tokens'

/**
 * Maps the confirmed Tallycore tokens onto the AntD 5 `ThemeConfig` consumed by
 * `ConfigProvider` in `providers.tsx`. Every value flows from `tokens.ts`; this
 * file adds no literals of its own.
 */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: tokens.colorPrimary,
    colorPrimaryHover: tokens.colorPrimaryHover,
    colorBgLayout: tokens.colorBgLayout,
    colorBgContainer: tokens.colorBgContainer,
    colorText: tokens.colorText,
    colorTextSecondary: tokens.colorTextSecondary,
    colorBorder: tokens.colorBorder,
    colorSuccess: tokens.colorSuccess,
    colorWarning: tokens.colorWarning,
    colorError: tokens.colorError,
    borderRadius: tokens.borderRadius,
    fontFamily: tokens.fontFamily,
    fontSize: tokens.fontSize,
    boxShadow: tokens.boxShadow,
    boxShadowSecondary: tokens.boxShadowSecondary,
    boxShadowTertiary: tokens.boxShadowTertiary,
  },
  components: {
    Layout: {
      headerBg: tokens.colorBgContainer,
      headerColor: tokens.colorText,
      headerHeight: 64,
      siderBg: tokens.colorBgLayout,
      lightSiderBg: tokens.colorBgLayout,
      bodyBg: tokens.colorBgLayout,
    },
    Card: {
      boxShadowTertiary: tokens.boxShadowTertiary,
    },
    Menu: {
      itemSelectedBg: tokens.colorPrimary,
      itemSelectedColor: tokens.colorBgContainer,
      itemBorderRadius: tokens.borderRadius,
    },
  },
}
