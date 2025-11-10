import type { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useNavigation } from '@react-navigation/native'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiKeySetupSheet } from '@/componentsV2/features/ApiKeySetup/ApiKeySetupSheet'
import { useDialog } from '@/hooks/useDialog'
import { getDefaultModel } from '@/services/AssistantService'
import { hasApiKey } from '@/services/ApiService'
import { getProviderByModel } from '@/services/ProviderService'
import type { RootNavigationProps } from '@/types/naviagate'
import { storage } from '@/utils'

const API_KEY_SETUP_SKIPPED_KEY = 'api_key_setup_skipped'
const API_KEY_FIRST_USE_PROMPTED_KEY = 'api_key_first_use_prompted'

/**
 * Hook to check API key and show setup prompt if needed
 * Returns a function that checks API key before performing an action
 */
export function useApiKeyCheck() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const navigation = useNavigation<RootNavigationProps>()
  const apiKeySetupSheetRef = useRef<BottomSheetModal>(null)

  /**
   * Check if API key is configured
   * If not, show prompt to user and block the action
   * @returns Promise<boolean> - true if API key is configured, false otherwise
   */
  const checkApiKey = async (): Promise<boolean> => {
    try {
      const defaultModel = getDefaultModel()
      const provider = getProviderByModel(defaultModel)
      const hasKey = hasApiKey(provider)

      if (hasKey) {
        return true
      }

      // 只要 API key 为空，就弹出配置对话框（不管之前是否点击过"稍后设置"）
      // 直接显示配置表单，并阻止操作
      apiKeySetupSheetRef.current?.present()
      
      // 返回 false 阻止发送
      return false
    } catch (error) {
      console.error('Failed to check API key:', error)
      return false
    }
  }

  const handleApiKeyConfigured = () => {
    // API 密钥已配置，清除跳过标记
    storage.delete(API_KEY_SETUP_SKIPPED_KEY)
    storage.delete(API_KEY_FIRST_USE_PROMPTED_KEY)
  }

  const handleApiKeySkip = () => {
    // 用户选择稍后配置，记录标记
    storage.set(API_KEY_SETUP_SKIPPED_KEY, true)
  }

  return {
    checkApiKey,
    ApiKeySetupSheet: (
      <ApiKeySetupSheet
        ref={apiKeySetupSheetRef}
        onConfigured={handleApiKeyConfigured}
        onSkip={handleApiKeySkip}
        showSkip={true}
      />
    )
  }
}

