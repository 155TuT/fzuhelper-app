import { AntDesign } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, View, useWindowDimensions, type LayoutRectangle } from 'react-native';

import WeekSelector from '@/components/course/week-selector';
import { Text } from '@/components/ui/text';

import type { TermsListResponse_Terms } from '@/api/backend';
import { getApiV1JwchCourseList } from '@/api/generate';
import type { CourseSetting, LocateDateResult } from '@/api/interface';
import usePersistedQuery from '@/hooks/usePersistedQuery';
import { COURSE_DATA_KEY } from '@/lib/constants';
import { getFirstDateByWeek, getWeeksBySemester, parseCourses, type ParsedCourse } from '@/utils/course';
import generateRandomColor, { clearColorMapping } from '@/utils/random-color';

import CourseWeek from './course-week';

interface CoursePageProps {
  config: CourseSetting;
  locateDateResult: LocateDateResult;
  semesterList: TermsListResponse_Terms;
}

// 课程表页面，
const CoursePage: React.FC<CoursePageProps> = ({ config, locateDateResult, semesterList }) => {
  const [week, setWeek] = useState(1); // 当前周数
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const { width } = useWindowDimensions(); // 获取屏幕宽度
  const [flatListLayout, setFlatListLayout] = useState<LayoutRectangle>({ width, height: 0, x: 0, y: 0 }); // FlatList 的布局信息

  const flatListRef = useRef<FlatList>(null);

  // 从设置中读取相关信息（比如当前选择的学期，是否显示非本周课程），设置项由上级组件传入
  const { selectedSemester: term, showNonCurrentWeekCourses } = config;

  // 【查询课程数据】
  // 使用含缓存处理的查询 hooks，这样当网络请求失败时，会返回缓存数据
  // 注：此时访问的是 west2-online 的服务器，而不是教务系统的服务器
  const { data } = usePersistedQuery({
    queryKey: [COURSE_DATA_KEY, term],
    queryFn: () => getApiV1JwchCourseList({ term }),
  });

  // 将学期数据转换为 Map，方便后续使用
  const semesterListMap = useMemo(
    () => Object.fromEntries(semesterList.map(semester => [semester.term, semester])),
    [semesterList],
  );

  // 获取当前学期的开始结束时间（即从 semesterList 中取出当前学期的信息）
  const currentSemester = useMemo(() => semesterListMap[term], [semesterListMap, term]);

  useEffect(() => {
    setWeek(term === locateDateResult.semester ? locateDateResult.week : 1);
  }, [term, locateDateResult, semesterListMap]);

  // 获取当前学期的最大周数
  const maxWeek = useMemo(
    () => getWeeksBySemester(currentSemester.start_date, currentSemester.end_date),
    [currentSemester],
  );
  // 生成一周的日期数据
  const weekArray = useMemo(
    () =>
      Array.from({ length: maxWeek }, (_, i) => ({
        week: i + 1,
        firstDate: getFirstDateByWeek(currentSemester.start_date, i + 1),
      })),
    [maxWeek, currentSemester],
  );

  // 通过这里可以看到，schedules 表示的是全部的课程数据，而不是某一天的课程数据
  // schedules 是一个数组，每个元素是一个课程数据，包含了课程的详细信息

  // 这个 useMemo 用于将课程数据转换为适合展示的格式，在这里我们会先清空显示颜色的索引
  const schedules = useMemo(() => (data ? parseCourses(data.data.data) : []), [data]);
  const schedulesByDays = useMemo(
    () =>
      schedules
        ? schedules.reduce(
            (result, current) => {
              const day = current.weekday - 1;
              if (!result[day]) result[day] = [];
              result[day].push(current);
              return result;
            },
            {} as Record<number, ParsedCourse[]>,
          )
        : {},
    [schedules],
  );

  // 用于存储课程名称和颜色的对应关系，这里我们移入到 useMemo 中，避免每次渲染都重新生成
  const courseColorMap = useMemo(() => {
    clearColorMapping(); // 先清空先前的颜色映射

    const map: Record<string, string> = {};

    schedules.forEach(schedule => {
      if (!map[schedule.syllabus]) {
        map[schedule.syllabus] = generateRandomColor(schedule.name); // 基于课程名称生成颜色
      }
    });
    return map;
  }, [schedules]);

  // 通过 viewability 回调获取当前周
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      setWeek(viewableItems[0].item.week);
    }
  });

  return (
    <>
      {/* 顶部 Tab 导航栏 */}
      <Tabs.Screen
        options={{
          headerTitleAlign: 'center',
          // eslint-disable-next-line react/no-unstable-nested-components
          headerLeft: () => <Text className="ml-4 text-2xl font-medium">课程表</Text>,
          // eslint-disable-next-line react/no-unstable-nested-components
          headerTitle: () => (
            <Pressable onPress={() => setShowWeekSelector(!showWeekSelector)} className="flex flex-row items-center">
              <Text className="mr-1 text-lg">第 {week} 周 </Text>
              <AntDesign name={showWeekSelector ? 'caretup' : 'caretdown'} size={10} color="black" />
            </Pressable>
          ),
          // eslint-disable-next-line react/no-unstable-nested-components
          headerRight: () => (
            <Link href="/course/course-settings" asChild>
              <AntDesign name="setting" size={24} color="black" className="mr-4" />
            </Link>
          ),
        }}
      />

      {/* 课程表详情 */}
      <FlatList
        ref={flatListRef} // 绑定 ref
        horizontal // 水平滚动
        pagingEnabled // 分页滚动
        data={weekArray} // 数据源
        initialNumToRender={4} // 初始渲染数量
        windowSize={3} // 窗口大小
        getItemLayout={(_, index) => ({
          // 提供固定的布局信息
          length: flatListLayout.width, // 每个项的宽度
          offset: flatListLayout.width * index, // 每个项的起始位置
          index, // 当前索引
        })}
        // 渲染列表项（此处一项为一屏的内容）
        renderItem={({ item }) => (
          <CourseWeek
            key={item.week}
            week={item.week}
            startDate={item.firstDate}
            schedulesByDays={schedulesByDays}
            courseColorMap={courseColorMap}
            showNonCurrentWeekCourses={showNonCurrentWeekCourses}
            flatListLayout={flatListLayout}
          />
        )}
        onLayout={({ nativeEvent }) => setFlatListLayout(nativeEvent.layout)} // 获取 FlatList 的布局信息
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        showsHorizontalScrollIndicator={false} // 隐藏水平滚动条
      />

      {/* 周数选择器 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showWeekSelector}
        onRequestClose={() => {
          setShowWeekSelector(!showWeekSelector);
        }}
      >
        <Pressable
          className="flex-1"
          onPress={() => setShowWeekSelector(false)} // 点击外部关闭 Modal
        >
          <View className="flex flex-1 items-center justify-center bg-[#00000050]">
            <View className="max-h-[60%] w-4/5 rounded-lg bg-card p-6">
              <WeekSelector
                currentWeek={week}
                maxWeek={maxWeek}
                onWeekSelect={selectedWeek => {
                  setWeek(selectedWeek);

                  // 滚动到对应周数的位置
                  flatListRef.current?.scrollToIndex({
                    index: selectedWeek - 1, // FlatList 的索引从 0 开始
                    animated: false, // 关闭平滑滚动
                  });
                  setShowWeekSelector(false); // 关闭 Modal
                }}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default CoursePage;
