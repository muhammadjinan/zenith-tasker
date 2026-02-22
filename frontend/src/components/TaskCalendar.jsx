import React, { useState, useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TaskCalendar = ({ tasks = [], onTaskClick, embedded = false }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Build a map of date -> tasks for the current month
    const tasksByDate = useMemo(() => {
        const map = {};
        tasks.forEach(task => {
            if (task.due_date) {
                const d = new Date(task.due_date);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (!map[key]) map[key] = [];
                map[key].push(task);
            }
        });
        return map;
    }, [tasks]);

    // Get calendar grid days
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
        }

        // Next month leading days (fill to 42 = 6 rows)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
        }

        return days;
    }, [year, month]);

    const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const today = new Date();
    const isToday = (d) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

    const getTasksForDay = (d) => {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return tasksByDate[key] || [];
    };

    // Priority color helper
    const getPriorityDot = (priority) => {
        if (priority === 'high') return 'bg-red-400';
        if (priority === 'medium') return 'bg-amber-400';
        return 'bg-blue-400';
    };

    // Selected day state for task preview
    const [selectedDay, setSelectedDay] = useState(null);
    const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

    return (
        <div className={embedded ? '' : 'p-6 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10'}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                {!embedded && (
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Calendar
                    </h2>
                )}
                <div className={`flex items-center gap-2 ${embedded ? 'ml-auto' : ''}`}>
                    <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-white/5 transition-all">
                        Today
                    </button>
                    <button onClick={goToPrevMonth} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-sm font-medium text-white min-w-[140px] text-center">{MONTHS[month]} {year}</span>
                    <button onClick={goToNextMonth} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayObj, idx) => {
                    const dayTasks = getTasksForDay(dayObj.date);
                    const hasTask = dayTasks.length > 0;
                    const isTodayCell = isToday(dayObj.date);
                    const isSelected = selectedDay && dayObj.date.getTime() === selectedDay.getTime();

                    return (
                        <button
                            key={idx}
                            onClick={() => {
                                if (hasTask) setSelectedDay(isSelected ? null : dayObj.date);
                            }}
                            className={`
                                relative flex flex-col items-center py-2 rounded-lg text-sm transition-all min-h-[44px]
                                ${!dayObj.isCurrentMonth ? 'text-slate-600' : 'text-slate-300'}
                                ${isTodayCell ? 'bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30' : ''}
                                ${isSelected ? 'bg-indigo-500/15 border border-indigo-500/30' : ''}
                                ${hasTask && !isTodayCell && !isSelected ? 'hover:bg-white/5 cursor-pointer' : ''}
                                ${!hasTask ? 'cursor-default' : ''}
                            `}
                        >
                            <span>{dayObj.day}</span>
                            {/* Task dots */}
                            {hasTask && (
                                <div className="flex gap-0.5 mt-1">
                                    {dayTasks.slice(0, 3).map((t, i) => (
                                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(t.priority)}`}></span>
                                    ))}
                                    {dayTasks.length > 3 && <span className="text-[8px] text-slate-500 ml-0.5">+{dayTasks.length - 3}</span>}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected Day Task Preview */}
            {selectedDay && selectedDayTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <h4 className="text-xs font-medium text-slate-400 mb-2">
                        Tasks on {selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h4>
                    <div className="space-y-2">
                        {selectedDayTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => onTaskClick && onTaskClick()}
                                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-white/10 cursor-pointer transition-all"
                            >
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDot(task.priority)}`}></span>
                                <span className="text-sm text-white truncate flex-1">{task.title || 'Untitled Task'}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${task.status === 'completed' || task.status === 'done'
                                    ? 'bg-green-500/15 text-green-400'
                                    : task.status === 'in_progress'
                                        ? 'bg-amber-500/15 text-amber-400'
                                        : 'bg-blue-500/15 text-blue-400'
                                    }`}>
                                    {task.status === 'completed' || task.status === 'done' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskCalendar;
