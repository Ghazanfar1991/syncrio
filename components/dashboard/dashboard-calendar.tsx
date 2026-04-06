import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPlatformIcon } from './platform-utils';
import PostMediaPreview from "@/components/content/post-media-preview";

interface DashboardCalendarProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  calendarViewMode: 'month' | 'week' | 'day';
  setCalendarViewMode: React.Dispatch<React.SetStateAction<'month' | 'week' | 'day'>>;
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  allPosts: Record<string, any[]>;
  dragOverDate: string | null;
  handleDragStart: (e: React.DragEvent, post: any) => void;
  handleDragOver: (e: React.DragEvent, date: Date) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, date: Date) => void;
  handlePostHover: (e: React.MouseEvent, post: any) => void;
  handlePostLeave: () => void;
  onPostClick: (post: any) => void;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({
  currentDate,
  setCurrentDate,
  calendarViewMode,
  setCalendarViewMode,
  selectedDate,
  onDateClick,
  allPosts,
  dragOverDate,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handlePostHover,
  handlePostLeave,
  onPostClick,
}) => {
  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      direction === 'prev' ? newDate.setMonth(prev.getMonth() - 1) : newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      direction === 'prev' ? newDate.setDate(prev.getDate() - 7) : newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      direction === 'prev' ? newDate.setDate(prev.getDate() - 1) : newDate.setDate(prev.getDate() + 1);
      return newDate;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getWeekRange = (date: Date) => {
    const start = new Date(date);
    const currentDayOfWeek = date.getDay();
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    start.setDate(date.getDate() - daysFromMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();
    return startMonth === endMonth ? `${startMonth} ${startDay} - ${endDay}, ${year}` : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getAllPostsForDate = (date: Date) => {
    const dateString = date.toLocaleDateString('en-CA');
    return allPosts[dateString] || [];
  };

  return (
    <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold">Publishing Calendar</div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => {
                setCalendarViewMode('month');
                const firstDayOfMonth = new Date(currentDate);
                firstDayOfMonth.setDate(1);
                setCurrentDate(firstDayOfMonth);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${calendarViewMode === 'month' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              Month
            </button>
            <button
              onClick={() => {
                setCalendarViewMode('week');
                const currentDayOfWeek = currentDate.getDay();
                const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
                const mondayOfCurrentWeek = new Date(currentDate);
                mondayOfCurrentWeek.setDate(currentDate.getDate() - daysFromMonday);
                setCurrentDate(mondayOfCurrentWeek);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${calendarViewMode === 'week' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              Week
            </button>
            <button
              onClick={() => {
                setCalendarViewMode('day');
                setCurrentDate(new Date());
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${calendarViewMode === 'day' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              Day
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (calendarViewMode === 'month') navigateMonth('prev');
                else if (calendarViewMode === 'week') navigateWeek('prev');
                else navigateDay('prev');
              }}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {calendarViewMode === 'month' && formatMonthYear(currentDate)}
              {calendarViewMode === 'week' && getWeekRange(currentDate)}
              {calendarViewMode === 'day' && getDayName(currentDate)}
            </span>
            <button
              onClick={() => {
                if (calendarViewMode === 'month') navigateMonth('next');
                else if (calendarViewMode === 'week') navigateWeek('next');
                else navigateDay('next');
              }}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Month */}
      {calendarViewMode === 'month' && (
        <div className="overflow-x-auto -mx-2 px-2 [overscroll-behavior-x:contain] [touch-action:pan-x]">
          <div className="grid min-w-[720px] sm:min-w-0 grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-center py-2 opacity-60">{day}</div>
            ))}
            {(() => {
              const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
              const days = [];
              for (let i = 0; i < startingDayOfWeek; i++) days.push(<div key={`empty-${i}`} className="aspect-square" />);
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const posts = getAllPostsForDate(date);
                const hasPosts = posts.length > 0;
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                const dateString = date.toLocaleDateString('en-CA');
                const isDragOver = dragOverDate === dateString;
                days.push(
                  <div
                    key={day}
                    className={`min-h-[88px] sm:min-h-[100px] p-2 rounded-xl flex flex-col transition-all shadow-sm ${isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md' : isDragOver ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600 shadow-lg' : hasPosts ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 shadow-md' : isToday ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md' : 'bg-white/80 dark:bg-neutral-800/60 hover:bg-white/90 dark:hover:bg-neutral-700/70 shadow-sm'}`}
                    onClick={() => onDateClick(date)}
                    onDragOver={(e) => handleDragOver(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, date)}
                  >
                    <span className="font-medium text-sm mb-1">{day}</span>
                    {hasPosts && (
                      <div className="space-y-1 flex-1">
                        {posts.slice(0, 2).map((post: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={post.status !== 'PUBLISHED' && post.status !== 'published'}
                            onDragStart={(e) => handleDragStart(e, post)}
                            onMouseEnter={(e) => handlePostHover(e, post)}
                            onMouseLeave={() => handlePostLeave()}
                            className="bg-white/60 dark:bg-neutral-700/60 rounded-lg p-2 border border-white/20 dark:border-neutral-600/20 cursor-pointer hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors shadow-sm relative group"
                            onClick={(e) => { e.stopPropagation(); onPostClick(post); onDateClick(date); }}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              {post.platform && <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{getPlatformIcon(post.platform)}</div>}
                              <div className="text-xs font-medium truncate min-w-0 flex-1">{post.accountName || post.platform || 'Post'}</div>
                            </div>
                            {(() => {
                              const media: any[] = [];
                              if (Array.isArray(post.media)) media.push(...post.media);
                              if (Array.isArray(post.mediaItems)) media.push(...post.mediaItems);
                              if (Array.isArray(post.imageUrls)) media.push(...post.imageUrls.map((u: string) => ({ type: 'image', url: u })));
                              if (Array.isArray(post.videoUrls)) media.push(...post.videoUrls.map((u: string) => ({ type: 'video', url: u })));
                              if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                              if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                              return media.length > 0 ? <PostMediaPreview media={media as any} height={60} rounded="rounded-md" onOpen={() => onPostClick(post)} /> : null;
                            })()}
                            <div className="text-xs opacity-70 text-center">{post.time || 'Scheduled'}</div>
                          </div>
                        ))}
                        {posts.length > 2 && <div className="text-xs opacity-60 text-center py-1">+{posts.length - 2} more</div>}
                      </div>
                    )}
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>
      )}

      {/* Week View */}
      {calendarViewMode === 'week' && (
        <div className="overflow-x-auto -mx-2 px-2 [overscroll-behavior-x:contain] [touch-action:pan-x]">
          <div className="grid min-w-[720px] sm:min-w-0 grid-cols-7 gap-1 mb-4">
            {(() => {
              const weekStart = new Date(currentDate);
              weekStart.setDate(currentDate.getDate() - currentDate.getDay());
              const weekDays = [];
              for (let i = 0; i < 7; i++) {
                const dayDate = new Date(weekStart);
                dayDate.setDate(weekStart.getDate() + i);
                const posts = getAllPostsForDate(dayDate);
                const isToday = dayDate.toDateString() === new Date().toDateString();
                const isSelected = selectedDate && dayDate.toDateString() === selectedDate.toDateString();
                const dateString = dayDate.toLocaleDateString('en-CA');
                const isDragOver = dragOverDate === dateString;
                weekDays.push(
                  <div
                    key={i}
                    className={`min-h-[110px] sm:min-h-[120px] p-2 rounded-xl flex flex-col transition-all shadow-sm ${isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md' : isDragOver ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600 shadow-lg' : isToday ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md' : 'bg-white/80 dark:bg-neutral-800/60 hover:bg-white/90 dark:hover:bg-neutral-700/70 shadow-sm'}`}
                    onClick={() => onDateClick(dayDate)}
                    onDragOver={(e) => handleDragOver(e, dayDate)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayDate)}
                  >
                    <div className="text-xs font-medium mb-1 text-center">{dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="space-y-1 flex-1">
                      {posts.map((post: any, idx: number) => (
                        <div
                          key={idx}
                          draggable={post.status !== 'PUBLISHED' && post.status !== 'published'}
                          onDragStart={(e) => handleDragStart(e, post)}
                          onMouseEnter={(e) => handlePostHover(e, post)}
                          onMouseLeave={() => handlePostLeave()}
                          className="bg-white/60 dark:bg-neutral-700/60 rounded-lg p-2 border border-white/20 dark:border-neutral-600/20 cursor-pointer hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors shadow-sm relative group"
                          onClick={(e) => { e.stopPropagation(); onPostClick(post); onDateClick(dayDate); }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {post.platform && <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{getPlatformIcon(post.platform)}</div>}
                            <div className="text-xs font-medium truncate min-w-0 flex-1">{post.accountName || post.platform || 'Post'}</div>
                          </div>
                          {(() => {
                            const media: any[] = [];
                            if (Array.isArray(post.media)) media.push(...post.media);
                            if (Array.isArray(post.mediaItems)) media.push(...post.mediaItems);
                            if (Array.isArray(post.imageUrls)) media.push(...post.imageUrls.map((u: string) => ({ type: 'image', url: u })));
                            if (Array.isArray(post.videoUrls)) media.push(...post.videoUrls.map((u: string) => ({ type: 'video', url: u })));
                            if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                            if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                            return media.length > 0 ? <PostMediaPreview media={media as any} height={60} rounded="rounded-md" onOpen={() => onPostClick(post)} /> : null;
                          })()}
                          <div className="text-xs opacity-70 text-center">{post.time || 'Scheduled'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return weekDays;
            })()}
          </div>
        </div>
      )}

      {/* Day View */}
      {calendarViewMode === 'day' && (
        <div className="mb-4">
          <div className="text-center py-4">
            <h3 className="text-lg font-medium">{getDayName(currentDate)}</h3>
          </div>
          {(() => {
            const posts = getAllPostsForDate(currentDate);
            if (posts.length === 0) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">No posts scheduled for this day</div>;
            return (
              <div className="space-y-4">
                {posts.map((post: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-600 shadow-lg p-4"
                    draggable={post.status !== 'PUBLISHED' && post.status !== 'published'}
                    onDragStart={(e) => handleDragStart(e, post)}
                    onMouseEnter={(e) => handlePostHover(e, post)}
                    onMouseLeave={() => handlePostLeave()}
                    onClick={() => onPostClick(post)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {post.platform && <div className="w-8 h-8 bg-gray-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">{getPlatformIcon(post.platform)}</div>}
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{post.accountName || 'Account'}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{post.time || 'Scheduled'} • {post.platform}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${post.status === 'PUBLISHED' || post.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        {post.status?.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex gap-4 mb-4">
                      {(() => {
                        const media: any[] = [];
                        if (Array.isArray(post.media)) media.push(...post.media);
                        if (Array.isArray(post.mediaItems)) media.push(...post.mediaItems);
                        if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                        if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                        return media.length > 0 ? (
                           <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-500 flex-shrink-0">
                             {media[0].type === 'video' ? <video src={media[0].url} className="w-full h-full object-cover" /> : <img src={media[0].url} className="w-full h-full object-cover" />}
                           </div>
                        ) : null;
                      })()}
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{post.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
