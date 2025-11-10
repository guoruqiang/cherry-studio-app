import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import { Button } from 'heroui-native'
import React, { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, TouchableOpacity } from 'react-native'

import { Container, ExternalLink, GroupTitle, Text, TextField, XStack, YStack } from '@/componentsV2'
import { Eye, EyeOff, X } from '@/componentsV2/icons/LucideIcon'
import { useBottom } from '@/hooks/useBottom'
import { useTheme } from '@/hooks/useTheme'
import { PROVIDER_URLS } from '@/config/providers'
import { useProvider } from '@/hooks/useProviders'
import { getDefaultModel } from '@/services/AssistantService'
import { hasApiKey } from '@/services/ApiService'
import type { RootNavigationProps } from '@/types/naviagate'

interface ApiKeySetupSheetProps {
  providerId?: string
  onConfigured?: () => void
  onSkip?: () => void
  showSkip?: boolean
}

export const ApiKeySetupSheet = forwardRef<BottomSheetModal, ApiKeySetupSheetProps>(
  ({ providerId, onConfigured, onSkip, showSkip = true }, ref) => {
    const { isDark } = useTheme()
    const { t } = useTranslation()
    const bottom = useBottom()
    const navigation = useNavigation<RootNavigationProps>()
    const [isVisible, setIsVisible] = useState(false)
    const [showApiKey, setShowApiKey] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [apiHost, setApiHost] = useState('')
    const [clipboardDetected, setClipboardDetected] = useState(false)

    // 获取默认 provider 或指定 provider
    const defaultModel = getDefaultModel()
    const targetProviderId = providerId || defaultModel.provider
    const { provider, isLoading, updateProvider } = useProvider(targetProviderId)

    // 初始化数据
    useEffect(() => {
      if (provider) {
        setApiKey(provider.apiKey || '')
        setApiHost(provider.apiHost || '')
      }
    }, [provider])

    // 检测剪贴板中的 API key（当对话框打开且 API key 为空时）
    useEffect(() => {
      const checkClipboard = async () => {
        if (!isVisible || apiKey.trim()) {
          // 如果对话框未打开或已有 API key，不检测
          return
        }

        try {
          const clipboardText = await Clipboard.getStringAsync()
          if (!clipboardText) {
            return
          }

          // 检测 sk- 开头的 API key 格式
          // 格式：sk- 后面跟着字母、数字、下划线、连字符等字符，长度通常在 20-200 之间
          const apiKeyPattern = /^sk-[a-zA-Z0-9_-]{20,200}$/
          const trimmedText = clipboardText.trim()

          if (apiKeyPattern.test(trimmedText)) {
            setApiKey(trimmedText)
            setClipboardDetected(true)
            // 3 秒后隐藏提示
            setTimeout(() => {
              setClipboardDetected(false)
            }, 3000)
          }
        } catch (error) {
          // 静默失败，不影响用户体验
          console.log('Failed to read clipboard:', error)
        }
      }

      // 延迟一点检测，确保对话框已完全打开
      const timer = setTimeout(() => {
        checkClipboard()
      }, 300)

      return () => clearTimeout(timer)
    }, [isVisible, apiKey])

    useEffect(() => {
      if (!isVisible) return

      const backAction = () => {
        ;(ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()
        return true
      }

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)
      return () => backHandler.remove()
    }, [ref, isVisible])

    const toggleApiKeyVisibility = () => {
      setShowApiKey(prev => !prev)
    }

    const handleSave = async () => {
      if (!provider) return

      const updatedProvider = { ...provider, apiKey, apiHost }
      await updateProvider(updatedProvider)

      // 检查是否已配置
      if (hasApiKey(updatedProvider)) {
        onConfigured?.()
        ;(ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()
      }
    }

    const handleGoToSettings = () => {
      ;(ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()
      // 导航到 provider 设置页面
      navigation.navigate('HomeScreen', {
        screen: 'Home',
        params: {
          screen: 'ProvidersSettings',
          params: {
            screen: 'ProviderSettingsScreen',
            params: { providerId: targetProviderId }
          }
        }
      })
    }

    const handleSkip = () => {
      onSkip?.()
      ;(ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()
    }

    const webSearchProviderConfig = targetProviderId ? PROVIDER_URLS[targetProviderId] : undefined
    const apiKeyWebsite = webSearchProviderConfig?.websites?.apiKey

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
    )

    if (isLoading) {
      return null
    }

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['80%']}
        enableDynamicSizing={false}
        backgroundStyle={{
          borderRadius: 24,
          backgroundColor: isDark ? '#121213ff' : '#f7f7f7ff'
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? '#f9f9f9ff' : '#202020ff'
        }}
        backdropComponent={renderBackdrop}
        onDismiss={() => setIsVisible(false)}
        onChange={index => setIsVisible(index >= 0)}>
        <BottomSheetScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: bottom
          }}>
          <YStack className="flex-1 gap-4 px-4">
            {/* Header */}
            <XStack className="items-center justify-between border-b border-black/10 pb-4">
              <Text className="text-lg font-bold">{t('api_key_setup.title')}</Text>
              <TouchableOpacity
                style={{
                  padding: 4,
                  backgroundColor: isDark ? '#333333' : '#dddddd',
                  borderRadius: 16
                }}
                onPress={() => (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={16} />
              </TouchableOpacity>
            </XStack>

            {/* Description */}
            <YStack className="gap-2">
              <Text className="text-text-secondary text-sm leading-5">{t('api_key_setup.description')}</Text>
            </YStack>

            {/* API Key Input */}
            <YStack className="gap-2">
              <GroupTitle>{t('settings.provider.api_key.label')}</GroupTitle>
              <XStack className="relative gap-2">
                <TextField className="flex-1">
                  <TextField.Input
                    className="h-12 pr-0"
                    value={apiKey}
                    secureTextEntry={!showApiKey}
                    placeholder={t('settings.provider.api_key.placeholder')}
                    onChangeText={text => {
                      setApiKey(text)
                      // 用户手动输入时，清除剪贴板检测提示
                      if (clipboardDetected) {
                        setClipboardDetected(false)
                      }
                    }}>
                    <TextField.InputEndContent>
                      <Button size="sm" variant="ghost" isIconOnly onPress={toggleApiKeyVisibility}>
                        <Button.Label>
                          {showApiKey ? <EyeOff className="text-white" size={16} /> : <Eye size={16} />}
                        </Button.Label>
                      </Button>
                    </TextField.InputEndContent>
                  </TextField.Input>
                </TextField>
              </XStack>

              {/* 剪贴板检测提示 */}
              {clipboardDetected && (
                <XStack className="items-center gap-2 rounded-lg bg-green-100/20 px-3 py-2">
                  <Text className="text-green-100 text-xs">{t('api_key_setup.clipboard_detected')}</Text>
                </XStack>
              )}

              {apiKeyWebsite && (
                <XStack className="justify-end px-3">
                  <ExternalLink href={apiKeyWebsite} content={t('settings.provider.api_key.get')} />
                </XStack>
              )}
            </YStack>

            {/* API Host Input */}
            <YStack className="gap-2">
              <GroupTitle>{t('settings.provider.api_host.label')}</GroupTitle>
              <TextField>
                <TextField.Input
                  className="h-12"
                  placeholder={t('settings.provider.api_host.placeholder')}
                  value={apiHost}
                  onChangeText={setApiHost}
                />
              </TextField>
            </YStack>

            {/* Actions */}
            <YStack className="gap-3 pt-4">
              <Button variant="primary" onPress={handleSave} isDisabled={!apiKey.trim()}>
                <Button.Label>{t('api_key_setup.save')}</Button.Label>
              </Button>

              {showSkip && (
                <Button variant="ghost" onPress={handleSkip}>
                  <Button.Label>{t('api_key_setup.skip')}</Button.Label>
                </Button>
              )}

              <Button variant="ghost" onPress={handleGoToSettings}>
                <Button.Label>{t('api_key_setup.go_to_settings')}</Button.Label>
              </Button>
            </YStack>
          </YStack>
        </BottomSheetScrollView>
      </BottomSheetModal>
    )
  }
)

ApiKeySetupSheet.displayName = 'ApiKeySetupSheet'

