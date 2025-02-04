import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import type { ParsedCourse } from '@/utils/course';
import generateRandomColor from '@/utils/random-color';

import EmptySlot from './empty-slot';
import ScheduleItem from './schedule-item';

const MIN_HEIGHT = 49 * 11;

type ScheduleItemData =
  | {
      type: 'course';
      schedule: ParsedCourse;
      span: number;
      color: string; // 课程的颜色
    }
  | {
      type: 'empty';
    };

interface CalendarColProps {
  week: number;
  weekday: number;
  schedules: ParsedCourse[];
  onSyllabusPress: (syllabus: string) => void; // 教学大纲点击事件
  onLessonPlanPress: (lessonPlan: string) => void; // 授课计划点击事件
}

// 课程表的一列，即一天的课程
const CalendarCol: React.FC<CalendarColProps> = ({ week, weekday, schedules, onSyllabusPress, onLessonPlanPress }) => {
  const [height, setHeight] = useState<number>(MIN_HEIGHT);

  // 创建课程颜色映射
  const courseColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    schedules.forEach(schedule => {
      if (!map[schedule.syllabus]) {
        map[schedule.syllabus] = generateRandomColor(schedule.syllabus); // 基于 syllabus 生成颜色
      }
    });
    return map;
  }, [schedules]);

  const scheduleData = useMemo(() => {
    const schedulesOnDay = schedules.filter(schedule => schedule.weekday === weekday);
    const res: ScheduleItemData[] = [];

    for (let i = 1; i <= 11; i++) {
      const schedule = schedulesOnDay.find(s => s.startClass === i && s.startWeek <= week && s.endWeek >= week);

      if (schedule) {
        const span = schedule.endClass - schedule.startClass + 1;
        res.push({
          type: 'course',
          schedule,
          span,
          color: courseColorMap[schedule.syllabus], // 从颜色映射中取颜色
        });
        i += span - 1;
      } else {
        res.push({ type: 'empty' });
      }
    }

    return res;
  }, [schedules, weekday, week, courseColorMap]);

  return (
    <View
      className="flex w-[14.285714%] flex-shrink-0 flex-grow flex-col"
      onLayout={({ nativeEvent }) => {
        setHeight(Math.max(MIN_HEIGHT, nativeEvent.layout.height));
      }}
    >
      {scheduleData.map((item, index) =>
        item.type === 'course' ? (
          <ScheduleItem
            key={index}
            height={height}
            span={item.span}
            color={item.color}
            schedule={item.schedule}
            onSyllabusPress={onSyllabusPress}
            onLessonPlanPress={onLessonPlanPress}
          />
        ) : (
          <EmptySlot key={index} />
        ),
      )}
    </View>
  );
};

export default CalendarCol;
