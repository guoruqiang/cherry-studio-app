import type { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useNavigation } from '@react-navigation/native'
import { Button } from 'heroui-native'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import FastSquircleView from 'react-native-fast-squircle'

import { Image, SafeAreaContainer, YStack } from '@/componentsV2'
import { ApiKeySetupSheet } from '@/componentsV2/features/ApiKeySetup/ApiKeySetupSheet'
import { useAppState } from '@/hooks/useAppState'
import { useCurrentTopic } from '@/hooks/useTopic'
import { getDefaultAssistant } from '@/services/AssistantService'
import { getDefaultModel } from '@/services/AssistantService'
import { hasApiKey } from '@/services/ApiService'
import { providerService } from '@/services/ProviderService'
import { topicService } from '@/services/TopicService'
import type { RootNavigationProps } from '@/types/naviagate'
import { storage } from '@/utils'

import { ImportDataSheet } from './ImportDataSheet'
import WelcomeTitle from './WelcomeTitle'

const API_KEY_SETUP_SKIPPED_KEY = 'api_key_setup_skipped'

export default function WelcomeScreen() {
  const navigation = useNavigation<RootNavigationProps>()
  const { setWelcomeShown } = useAppState()
  const { switchTopic } = useCurrentTopic()
  const { t } = useTranslation()
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)
  const apiKeySetupSheetRef = useRef<BottomSheetModal>(null)
  const [shouldShowApiKeySetup, setShouldShowApiKeySetup] = useState(false)

  // 检测 API 密钥是否已配置
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // 确保 provider 服务已初始化
        await providerService.initialize()
        
        const defaultModel = getDefaultModel()
        // 使用异步方式获取 provider，确保从数据库加载
        const provider = await providerService.getProvider(defaultModel.provider)
        
        if (!provider) {
          console.error('[API Key Setup] Provider not found:', defaultModel.provider)
          return
        }

        const hasKey = hasApiKey(provider)

        console.log('[API Key Setup] Check result:', {
          hasKey,
          providerId: provider.id,
          providerName: provider.name,
          apiKey: provider.apiKey ? '***' : '(empty)'
        })

        // 只要未配置 API 密钥，就显示引导（不管之前是否跳过）
        if (!hasKey) {
          console.log('[API Key Setup] Showing setup sheet')
          setShouldShowApiKeySetup(true)
          // 延迟显示，让欢迎页先渲染
          setTimeout(() => {
            apiKeySetupSheetRef.current?.present()
          }, 800)
        } else {
          console.log('[API Key Setup] API key already configured')
        }
      } catch (error) {
        // 如果出错，不显示引导
        console.error('[API Key Setup] Failed to check API key:', error)
      }
    }

    // 延迟检查，确保应用初始化完成
    const timer = setTimeout(() => {
      checkApiKey()
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleStart = async () => {
    const defaultAssistant = await getDefaultAssistant()
    const newTopic = await topicService.createTopic(defaultAssistant)
    navigation.navigate('HomeScreen', {
      screen: 'Home',
      params: {
        screen: 'ChatScreen',
        params: { topicId: newTopic.id }
      }
    })
    await switchTopic(newTopic.id)
    await setWelcomeShown(true)
  }

  const handleApiKeyConfigured = () => {
    // API 密钥已配置，清除跳过标记
    storage.delete(API_KEY_SETUP_SKIPPED_KEY)
  }

  const handleApiKeySkip = () => {
    // 用户选择稍后配置，记录标记
    storage.set(API_KEY_SETUP_SKIPPED_KEY, true)
  }

  return (
    <>
      <SafeAreaContainer style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 0 }}>
        <View className="flex-1 items-center justify-center gap-5">
          <FastSquircleView
            style={{
              width: 176,
              height: 176,
              borderRadius: 35,
              overflow: 'hidden'
            }}
            cornerSmoothing={0.6}>
            <Image className="h-full w-full" source={require('@/assets/images/favicon.png')} />
          </FastSquircleView>
          <View className="items-center justify-center px-4">
            <View className="flex-row flex-wrap items-center justify-center">
              <WelcomeTitle className="text-center text-3xl font-bold" />
              <View className="ml-2 h-7 w-7 rounded-full bg-black" />
            </View>
          </View>
        </View>
        {/* register and login*/}
        <View className="bg-ui-card-background h-1/4 w-full items-center justify-center">
          <YStack className="flex-1 items-center justify-center gap-5">
            <Button className="w-3/4" variant="primary" onPress={() => bottomSheetModalRef.current?.present()}>
              <Button.Label className="w-full text-center text-lg">
                {t('common.import_from_cherry_studio')}
              </Button.Label>
            </Button>

            <Button className="w-3/4" variant="secondary" onPress={handleStart}>
              <Button.Label className="w-full text-center text-lg">{t('common.start')}</Button.Label>
            </Button>
          </YStack>
        </View>
        <ImportDataSheet ref={bottomSheetModalRef} handleStart={handleStart} />
        <ApiKeySetupSheet
          ref={apiKeySetupSheetRef}
          onConfigured={handleApiKeyConfigured}
          onSkip={handleApiKeySkip}
          showSkip={true}
        />
      </SafeAreaContainer>
    </>
  )
}
