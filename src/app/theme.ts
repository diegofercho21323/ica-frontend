import type { ThemeConfig } from 'antd'
import { tokens } from './tokens'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: tokens.colorAction,
    colorBgBase: tokens.colorSurfaceSunken,
    colorBgContainer: tokens.colorSurface,
    colorTextBase: tokens.colorTextStrong,
    colorBorder: tokens.colorBorderSubtle,
    colorSuccess: tokens.colorConfirm,
    colorWarning: tokens.colorAttention,
    colorError: tokens.colorCritical,
    borderRadius: tokens.radiusControl,
    fontFamily: tokens.fontFamilyBase,
  },
  components: {
    Layout: {
      headerBg: tokens.colorSurface,
      headerColor: tokens.colorTextStrong,
      headerHeight: 64,
      siderBg: tokens.colorSurface,
      lightSiderBg: tokens.colorSurface,
      bodyBg: tokens.colorSurfaceSunken,
    },
  },
}
