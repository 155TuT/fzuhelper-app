import { Href, router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

import { Icon } from '@/components/Icon';
import LabelIconEntry from '@/components/label-icon-entry';
import PageContainer from '@/components/page-container';
import { Text } from '@/components/ui/text';

import { getApiV1JwchUserInfo } from '@/api/generate';
import usePersistedQuery from '@/hooks/usePersistedQuery';
import { EXPIRE_ONE_DAY, JWCH_CURRENT_SEMESTER_KEY, JWCH_USER_INFO_KEY } from '@/lib/constants';
import { fetchJwchLocateDate } from '@/lib/locate-date';
import { JWCHLocateDateResult } from '@/types/data';
import { UserInfo } from '@/types/user';

import AvatarDefault from '@/assets/images/my/avatar_default.png';
import CalendarIcon from '@/assets/images/my/ic_calendar.png';
import EcardIcon from '@/assets/images/my/ic_ecard.png';
import HelpIcon from '@/assets/images/my/ic_help.png';

const defaultUserInfo: UserInfo = {
  stu_id: '未知',
  name: '未知',
  birthday: '未知',
  sex: '未知',
  college: '未知',
  grade: '未知',
  major: '未知',
};

const defaultTermInfo: JWCHLocateDateResult = {
  week: -1,
  year: -1,
  term: -1,
};

export default function HomePage() {
  const [userInfo, setUserInfo] = useState<UserInfo>(defaultUserInfo);
  const [termInfo, setTermInfo] = useState<JWCHLocateDateResult>(defaultTermInfo);

  interface MenuItem {
    icon: ImageSourcePropType;
    name: string; // 菜单项名称
    link?: Href; // 跳转链接
    operation?: () => void; // 点击操作
  }

  // 菜单项数据
  const menuItems: MenuItem[] = [
    {
      icon: CalendarIcon,
      name: '校历',
      link: '/common/academic-calendar' as Href,
    },
    {
      icon: HelpIcon,
      name: '帮助与反馈',
      link: '/common/help' as Href,
    },
    {
      icon: EcardIcon,
      name: '关于我们',
      link: '/common/about' as Href,
    },
  ];

  // 获取用户信息
  const { data: userData } = usePersistedQuery({
    queryKey: [JWCH_USER_INFO_KEY],
    queryFn: () => getApiV1JwchUserInfo(),
    cacheTime: 1 * EXPIRE_ONE_DAY, // 缓存 1 天
  });

  // 获取当前学期信息
  const { data: termData } = usePersistedQuery({
    queryKey: [JWCH_CURRENT_SEMESTER_KEY],
    queryFn: () => fetchJwchLocateDate(),
    cacheTime: EXPIRE_ONE_DAY, // 缓存 1 天
  });

  // 在组件加载时初始化数据
  useEffect(() => {
    if (userData) {
      setUserInfo(userData.data.data);
    } else {
      setUserInfo(defaultUserInfo); // 清空学期信息
    }
  }, [userData]);

  useEffect(() => {
    if (termData) {
      setTermInfo(termData);
    } else {
      setTermInfo(defaultTermInfo); // 清空学期信息
    }
  }, [termData]);

  return (
    <>
      <PageContainer>
        <Tabs.Screen
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => <Icon href="/settings/app" name="settings-outline" size={24} className="mr-4" />,
          }}
        />
        {/* 用户信息 */}
        <View>
          <View className="flex flex-row items-center p-8">
            <Image source={AvatarDefault} className="mr-6 h-24 w-24 rounded-full" />
            <View>
              <Text className="text-xl font-bold">{userInfo.name}</Text>
              <Text className="mt-2 text-sm text-text-secondary">这是一条签名</Text>
            </View>
          </View>
          <View className="h-full rounded-tr-4xl bg-card px-8">
            <View className="mt-6">
              <View className="w-full flex-row justify-between">
                <Text>{userInfo.college}</Text>
                <Text>{userInfo.stu_id}</Text>
              </View>
              <View className="mt-2 w-full flex-row justify-between">
                <Text className="text-text-secondary">{termInfo.year + '学年第' + termInfo.term + '学期'}</Text>
                <Text className="text-text-secondary">第 {termInfo.week} 周</Text>
              </View>
            </View>

            {/* 菜单列表 */}
            <View className="mt-4 space-y-4">
              {menuItems.map((item, index) => (
                <LabelIconEntry
                  key={index}
                  icon={item.icon}
                  label={item.name}
                  onPress={() => {
                    if (item.link) {
                      router.push(item.link);
                    } else {
                      item.operation && item.operation();
                    }
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </PageContainer>
    </>
  );
}
