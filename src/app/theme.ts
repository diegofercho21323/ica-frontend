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
  },
  components: {
    Layout: {
      headerBg: tokens.colorBgContainer,
      headerColor: tokens.colorText,
      headerHeight: 64,
      siderBg: tokens.colorBgContainer,
      lightSiderBg: tokens.colorBgContainer,
      bodyBg: tokens.colorBgLayout,
    },
  },
}
