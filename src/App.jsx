import React, { useState, useEffect, useMemo } from 'react';
import { database } from './firebase';
import { ref, onValue, set } from 'firebase/database';
import { GUIDELINES } from './guidelinesData';

const getDefaultShifts = (dateKey) => [
  { id: 'morning', timeStart: dateKey >= '2026-02-02' ? '09:00' : '08:00', timeEnd: '17:00', icon: '☀️', label: 'Day' },
  { id: 'evening', timeStart: '17:00', timeEnd: '21:00', icon: '🌙', label: 'Night' }
];

const EVENING_CUTOFF = 21 * 60;

const generateColor = (name) => {
  if (!name) return { bg: '', text: '' };

  const colors = [
    { bg: 'bg-amber-200', text: 'text-amber-800' },
    { bg: 'bg-cyan-200', text: 'text-cyan-800' },
    { bg: 'bg-fuchsia-200', text: 'text-fuchsia-800' },
    { bg: 'bg-emerald-200', text: 'text-emerald-800' },
    { bg: 'bg-orange-200', text: 'text-orange-800' },
    { bg: 'bg-violet-200', text: 'text-violet-800' },
    { bg: 'bg-pink-200', text: 'text-pink-800' },
    { bg: 'bg-lime-200', text: 'text-lime-800' },
    { bg: 'bg-sky-200', text: 'text-sky-800' },
    { bg: 'bg-rose-200', text: 'text-rose-800' },
    { bg: 'bg-teal-200', text: 'text-teal-800' },
    { bg: 'bg-indigo-200', text: 'text-indigo-800' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.toLowerCase().charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  let mins = minutes;
  if (mins < 0) mins = 24 * 60 + mins;
  if (mins >= 24 * 60) mins = mins - 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatTime = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const min = parseInt(m);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  if (min === 0) {
    return `${hour12}${ampm}`;
  }
  return `${hour12}:${String(min).padStart(2, '0')}${ampm}`;
};

const renderNotes = (text, onToggle, checkedOverrides) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const checkMatch = line.match(/^\[([ x])\]\s*(.*)/);
    if (checkMatch) {
      const inlineChecked = checkMatch[1] === 'x';
      const checked = checkedOverrides ? !!checkedOverrides[i] : inlineChecked;
      const label = checkMatch[2];
      return (
        <div
          key={i}
          className="flex items-start gap-1.5 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onToggle && onToggle(i); }}
        >
          <span className={`text-sm mt-px ${checked ? 'text-emerald-500' : 'text-slate-400'}`}>
            {checked ? '☑' : '☐'}
          </span>
          <span className={`text-xs sm:text-sm ${checked ? 'line-through text-slate-400' : 'text-slate-600'}`}>
            {label}
          </span>
        </div>
      );
    }
    if (line.trim()) {
      return <p key={i} className="text-xs sm:text-sm text-slate-500 italic">{line}</p>;
    }
    return null;
  });
};

export default function App() {
  const [daysToShow, setDaysToShow] = useState(21);
  const [pastDays, setPastDays] = useState(0);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [activeView, setActiveView] = useState('roster');
  const [guidelinesTab, setGuidelinesTab] = useState('daily');
  const [modal, setModal] = useState({ show: false, type: '', dateKey: '', shiftId: '' });
  const [inputValue, setInputValue] = useState('');
  const [timeInputs, setTimeInputs] = useState({ start: '', end: '' });

  const [carePlan, setCarePlan] = useState(null);
  const [carePlanInputs, setCarePlanInputs] = useState({});
  const [dailyChecks, setDailyChecks] = useState({});
  const [hiddenCarers, setHiddenCarers] = useState({});

  const knownCarers = useMemo(() => {
    const counts = {};
    Object.values(data).forEach(shift => {
      if (shift.name) {
        counts[shift.name] = (counts[shift.name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([name]) => !hiddenCarers[name])
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [data, hiddenCarers]);

  useEffect(() => {
    const dataRef = ref(database, 'shifts');

    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      setData(val || {});
      setLoading(false);
    }, (error) => {
      console.error('Firebase error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cpRef = ref(database, 'carePlan');
    const unsubscribe = onValue(cpRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setCarePlan(val);
      } else {
        const { contacts, ...seedData } = GUIDELINES;
        set(cpRef, seedData);
        setCarePlan(seedData);
      }
    }, (error) => {
      console.error('Firebase carePlan error:', error);
      const { contacts, ...fallback } = GUIDELINES;
      setCarePlan(fallback);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const checksRef = ref(database, `carePlanChecks/${today}`);
    const unsubscribe = onValue(checksRef, (snapshot) => {
      setDailyChecks(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const hcRef = ref(database, 'hiddenCarers');
    const unsubscribe = onValue(hcRef, (snapshot) => {
      setHiddenCarers(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  const hideCarer = async (name) => {
    const updated = { ...hiddenCarers, [name]: true };
    setHiddenCarers(updated);
    await set(ref(database, 'hiddenCarers'), updated);
  };

  const saveData = async (newData) => {
    setData(newData);
    setSyncing(true);
    try {
      await set(ref(database, 'shifts'), newData);
    } catch (e) {
      console.error('Error saving:', e);
    }
    setSyncing(false);
  };

  const saveCarePlan = async (newCarePlan) => {
    setCarePlan(newCarePlan);
    setSyncing(true);
    try {
      await set(ref(database, 'carePlan'), newCarePlan);
    } catch (e) {
      console.error('Error saving care plan:', e);
    }
    setSyncing(false);
  };

  const toggleDailyCheckbox = async (itemIndex, lineIndex) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `${itemIndex}-${lineIndex}`;
    const newChecks = { ...dailyChecks };

    if (newChecks[key]) {
      delete newChecks[key];
    } else {
      newChecks[key] = true;
    }

    setDailyChecks(newChecks);
    await set(ref(database, `carePlanChecks/${today}`), Object.keys(newChecks).length > 0 ? newChecks : null);
  };

  const toggleCarePlanCheckbox = (section, itemIndex, field, lineIndex) => {
    const updated = JSON.parse(JSON.stringify(carePlan));
    const text = updated[section][itemIndex][field] || '';
    const lines = text.split('\n');
    const line = lines[lineIndex];
    if (line.startsWith('[ ] ')) {
      lines[lineIndex] = '[x] ' + line.slice(4);
    } else if (line.startsWith('[x] ')) {
      lines[lineIndex] = '[ ] ' + line.slice(4);
    }
    updated[section][itemIndex][field] = lines.join('\n');
    saveCarePlan(updated);
  };

  const closeModal = () => {
    setModal({ show: false, type: '', dateKey: '', shiftId: '' });
    setCarePlanInputs({});
  };

  const getShiftData = (dateKey, shiftId) => {
    return data[`${dateKey}-${shiftId}`] || {};
  };

  const updateShiftData = (dateKey, shiftId, updates) => {
    const key = `${dateKey}-${shiftId}`;
    const current = data[key] || {};
    const newData = { ...data, [key]: { ...current, ...updates } };
    saveData(newData);
  };

  const getDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -pastDays; i < daysToShow; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDateKey = (date) => date.toISOString().split('T')[0];

  const formatDisplayDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: days[date.getDay()],
      num: date.getDate(),
      month: months[date.getMonth()]
    };
  };

  const isToday = (date) => new Date().toDateString() === date.toDateString();
  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getShiftTimes = (dateKey, shiftId, defaultShift) => {
    const shiftData = getShiftData(dateKey, shiftId);

    if (shiftId === 'evening') {
      const morningData = getShiftData(dateKey, 'morning');
      const eveningStart = morningData.timeEnd || defaultShift.timeStart;
      return {
        start: shiftData.timeStart || eveningStart,
        end: shiftData.timeEnd || defaultShift.timeEnd
      };
    }

    return {
      start: shiftData.timeStart || defaultShift.timeStart,
      end: shiftData.timeEnd || defaultShift.timeEnd
    };
  };

  const isEveningSuppressed = (dateKey) => {
    const morningData = getShiftData(dateKey, 'morning');
    const morningEnd = morningData.timeEnd || getDefaultShifts(dateKey)[0].timeEnd;
    const morningEndMinutes = timeToMinutes(morningEnd);
    return morningEndMinutes >= EVENING_CUTOFF;
  };

  const openModal = (type, dateKey, shiftId, defaultShift) => {
    const shiftData = getShiftData(dateKey, shiftId);

    if (type === 'time') {
      const times = getShiftTimes(dateKey, shiftId, defaultShift);
      setTimeInputs({ start: times.start, end: times.end });
    } else if (type === 'name') {
      setInputValue(shiftData.name || '');
    } else if (type === 'comment') {
      setInputValue(shiftData.comment || '');
    }

    setModal({ show: true, type, dateKey, shiftId });
  };

  const openCarePlanModal = (editType, index) => {
    let inputs = { editType, editIndex: index };

    if (editType === 'daily') {
      const item = carePlan.dailyStructure[index];
      inputs = { ...inputs, time: item.time, label: item.label, routine: item.routine, notes: item.notes || '' };
    } else if (editType === 'weeklyDay') {
      const item = carePlan.weeklyOverview[index];
      inputs = { ...inputs, day: item.day, focus: item.focus, appointments: (item.appointments || []).join('\n'), notes: item.notes };
    } else if (editType === 'goal') {
      const item = carePlan.goals[index];
      inputs = { ...inputs, area: item.area, goal: item.goal, strategies: (item.strategies || []).join('\n'), notes: item.notes };
    } else if (editType === 'communicationItem') {
      inputs = { ...inputs, text: carePlan.communication[index] };
    } else if (editType === 'topicsCategory') {
      const entries = Object.entries(carePlan.topicsAndInterests);
      const [category, items] = entries[index];
      inputs = { ...inputs, category, items: items.join(', ') };
    } else if (editType === 'householdItem') {
      inputs = { ...inputs, text: carePlan.householdSupport[index] };
    } else if (editType === 'rosterItem') {
      inputs = { ...inputs, text: carePlan.rosterHours[index] };
    }

    setCarePlanInputs(inputs);
    setModal({ show: true, type: 'carePlan', dateKey: '', shiftId: '' });
  };

  const adjustTime = (field, delta) => {
    const current = timeInputs[field];
    const currentMinutes = timeToMinutes(current);
    const newMinutes = currentMinutes + (delta * 30);
    setTimeInputs({
      ...timeInputs,
      [field]: minutesToTime(newMinutes)
    });
  };

  const handleSave = () => {
    const { type, dateKey, shiftId } = modal;

    if (type === 'time') {
      updateShiftData(dateKey, shiftId, { timeStart: timeInputs.start, timeEnd: timeInputs.end });

      if (shiftId === 'morning') {
        const eveningKey = `${dateKey}-evening`;
        const currentEvening = data[eveningKey] || {};
        const newData = {
          ...data,
          [`${dateKey}-morning`]: {
            ...(data[`${dateKey}-morning`] || {}),
            timeStart: timeInputs.start,
            timeEnd: timeInputs.end
          },
          [eveningKey]: {
            ...currentEvening,
            timeStart: timeInputs.end
          }
        };
        saveData(newData);
      }
    } else if (type === 'name') {
      updateShiftData(dateKey, shiftId, { name: inputValue.trim() });
    } else if (type === 'comment') {
      updateShiftData(dateKey, shiftId, { comment: inputValue.trim() });
    } else if (type === 'carePlan') {
      const { editType, editIndex } = carePlanInputs;
      const updated = JSON.parse(JSON.stringify(carePlan));
      const today = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (editType === 'daily') {
        updated.dailyStructure[editIndex] = {
          time: carePlanInputs.time,
          label: carePlanInputs.label,
          routine: carePlanInputs.routine,
          notes: carePlanInputs.notes,
        };
      } else if (editType === 'weeklyDay') {
        updated.weeklyOverview[editIndex] = {
          ...updated.weeklyOverview[editIndex],
          focus: carePlanInputs.focus,
          appointments: carePlanInputs.appointments.split('\n').map(s => s.trim()).filter(Boolean),
          notes: carePlanInputs.notes,
        };
      } else if (editType === 'goal') {
        updated.goals[editIndex] = {
          area: carePlanInputs.area,
          goal: carePlanInputs.goal,
          strategies: carePlanInputs.strategies.split('\n').map(s => s.trim()).filter(Boolean),
          notes: carePlanInputs.notes,
        };
      } else if (editType === 'communicationItem') {
        updated.communication[editIndex] = carePlanInputs.text;
      } else if (editType === 'topicsCategory') {
        const newTopics = {};
        Object.entries(carePlan.topicsAndInterests).forEach(([key, val], i) => {
          if (i === editIndex) {
            newTopics[carePlanInputs.category] = carePlanInputs.items.split(',').map(s => s.trim()).filter(Boolean);
          } else {
            newTopics[key] = val;
          }
        });
        updated.topicsAndInterests = newTopics;
      } else if (editType === 'householdItem') {
        updated.householdSupport[editIndex] = carePlanInputs.text;
      } else if (editType === 'rosterItem') {
        updated.rosterHours[editIndex] = carePlanInputs.text;
      }

      updated.updatedDate = today;
      saveCarePlan(updated);
    }

    closeModal();
  };

  const handleClear = () => {
    const { type, dateKey, shiftId } = modal;

    if (type === 'name') {
      updateShiftData(dateKey, shiftId, { name: '' });
    } else if (type === 'comment') {
      updateShiftData(dateKey, shiftId, { comment: '' });
    }

    closeModal();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <h1 className="text-xl sm:text-2xl font-bold text-center text-slate-800">
            {activeView === 'roster' && 'Conrad Carers Schedule'}
            {activeView === 'carePlan' && "Conrad's Care Plan"}
            {activeView === 'contacts' && 'Contacts'}
          </h1>
          <p className="text-xs sm:text-sm text-center text-slate-400 mt-1">
            {activeView === 'roster' && <>Tap to edit {syncing && <span className="text-blue-500">• Syncing...</span>}</>}
            {activeView === 'carePlan' && (
              <>
                Tap to edit {syncing && <span className="text-blue-500">• Syncing...</span>}
                {carePlan?.updatedDate && <span className="text-slate-300"> — Updated {carePlan.updatedDate}</span>}
              </>
            )}
            {activeView === 'contacts' && 'Tap to call'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>

        {/* ROSTER VIEW */}
        {activeView === 'roster' && (
          <>
            <button
              onClick={() => setPastDays(prev => prev + 7)}
              className="w-full py-4 bg-white rounded-xl sm:rounded-2xl shadow-sm text-blue-500 text-sm sm:text-base font-semibold hover:bg-blue-50 active:bg-blue-100 transition-colors mb-3"
            >
              ↑ Load previous days
            </button>

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs sm:text-sm text-slate-500 font-semibold">
                    <th className="py-3 px-2 sm:px-3 text-center border-b border-slate-200" style={{width: '72px'}}>Date</th>
                    <th className="py-3 px-2 sm:px-3 text-center border-b border-slate-200" style={{width: '110px'}}>Time</th>
                    <th className="py-3 px-2 sm:px-3 text-center border-b border-slate-200" style={{width: '90px'}}>Carer</th>
                    <th className="py-3 px-2 sm:px-3 text-left border-b border-slate-200">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {getDays().map((date) => {
                    const dateKey = formatDateKey(date);
                    const { day, num, month } = formatDisplayDate(date);
                    const today = isToday(date);
                    const weekend = isWeekend(date);
                    const past = isPast(date);
                    const eveningSuppressed = isEveningSuppressed(dateKey);

                    const shifts = getDefaultShifts(dateKey);
                    const shiftsToShow = eveningSuppressed
                      ? [shifts[0]]
                      : shifts;

                    return shiftsToShow.map((shift, idx) => {
                      const shiftData = getShiftData(dateKey, shift.id);
                      const name = shiftData.name || '';
                      const comment = shiftData.comment || '';
                      const colors = generateColor(name);
                      const times = getShiftTimes(dateKey, shift.id, shift);
                      const isLastShift = idx === shiftsToShow.length - 1;

                      return (
                        <tr
                          key={`${dateKey}-${shift.id}`}
                          className={`${today ? 'bg-blue-50' : weekend ? 'bg-slate-50' : 'bg-white'} ${isLastShift ? 'border-b-4 border-slate-200' : 'border-b border-slate-100'} ${past ? 'opacity-60' : ''}`}
                        >
                          {idx === 0 && (
                            <td
                              rowSpan={shiftsToShow.length}
                              className={`text-center align-middle border-r border-slate-200 ${today ? 'bg-blue-500' : weekend ? 'bg-slate-200' : 'bg-slate-100'}`}
                            >
                              <div className={`py-3 sm:py-4 ${today ? 'text-white' : 'text-slate-700'}`}>
                                <div className="text-2xl sm:text-3xl font-bold leading-none">{num}</div>
                                <div className={`text-xs sm:text-sm font-medium mt-1 ${today ? 'text-blue-100' : 'text-slate-500'}`}>{day}</div>
                                <div className={`text-xs ${today ? 'text-blue-200' : 'text-slate-400'}`}>{month}</div>
                                {today && (
                                  <div className="mt-1.5">
                                    <span className="text-xs font-bold bg-white text-blue-500 px-2 py-0.5 rounded-full">TODAY</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          <td
                            className="py-3 sm:py-4 px-2 sm:px-3 text-center border-r border-slate-100 cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors"
                            onClick={() => openModal('time', dateKey, shift.id, shift)}
                          >
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                              <span className="text-sm sm:text-base">{eveningSuppressed && shift.id === 'morning' ? '📅' : shift.icon}</span>
                              <div className="text-xs sm:text-sm">
                                <span className="font-semibold text-slate-700">{formatTime(times.start)}</span>
                                <span className="text-slate-400 mx-0.5">-</span>
                                <span className="font-semibold text-slate-700">{formatTime(times.end)}</span>
                              </div>
                            </div>
                          </td>

                          <td
                            className={`py-3 sm:py-4 px-2 sm:px-3 text-center border-r border-slate-100 cursor-pointer transition-colors ${name ? colors.bg + ' ' + colors.text : 'hover:bg-slate-100 active:bg-slate-200'}`}
                            onClick={() => openModal('name', dateKey, shift.id, shift)}
                          >
                            {name ? (
                              <span className="text-sm sm:text-base font-semibold">{name}</span>
                            ) : (
                              <span className="text-slate-300 text-xs sm:text-sm">+ Add</span>
                            )}
                          </td>

                          <td
                            className="py-3 sm:py-4 px-3 sm:px-4 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            onClick={() => openModal('comment', dateKey, shift.id, shift)}
                          >
                            {comment ? (
                              <span className="text-xs sm:text-sm text-slate-600">{comment}</span>
                            ) : (
                              <span className="text-slate-300 text-xs sm:text-sm">+ Note</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setDaysToShow(prev => prev + 14)}
              className="w-full py-4 bg-white rounded-xl sm:rounded-2xl shadow-sm text-blue-500 text-sm sm:text-base font-semibold hover:bg-blue-50 active:bg-blue-100 transition-colors mt-3 mb-6"
            >
              Load more days ↓
            </button>
          </>
        )}

        {/* CARE PLAN VIEW */}
        {activeView === 'carePlan' && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            {/* Sub-tab Bar */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 overflow-x-auto">
              <div className="flex gap-2 pb-3 min-w-max">
                {[
                  { id: 'daily', label: 'Daily', icon: '🕐' },
                  { id: 'weekly', label: 'Weekly', icon: '📅' },
                  { id: 'goals', label: 'Goals', icon: '🎯' },
                  { id: 'info', label: 'Info', icon: '📋' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setGuidelinesTab(tab.id)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                      guidelinesTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="px-4 sm:px-6 pb-5 sm:pb-6">

              {!carePlan ? (
                <div className="py-8 text-center text-slate-400">Loading care plan...</div>
              ) : (
                <>
                  {/* DAILY TAB */}
                  {guidelinesTab === 'daily' && (
                    <div className="space-y-2 sm:space-y-3">
                      <p className="text-xs sm:text-sm text-slate-500 mb-3">{carePlan.purpose}</p>
                      {carePlan.dailyStructure.map((item, i) => {
                        const borderColors = ['border-blue-400', 'border-emerald-400', 'border-amber-400', 'border-violet-400', 'border-rose-400'];
                        return (
                          <div
                            key={i}
                            onClick={() => openCarePlanModal('daily', i)}
                            className={`border-l-4 ${borderColors[i % borderColors.length]} bg-slate-50 rounded-r-lg p-3 sm:p-4 cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-colors`}
                          >
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs sm:text-sm font-bold text-slate-800">{item.time}</span>
                              <span className="text-xs font-semibold text-slate-500 uppercase">{item.label}</span>
                            </div>
                            <p className="text-sm text-slate-700">{item.routine}</p>
                            <div className="mt-1">
                              {renderNotes(
                                item.notes,
                                (lineIndex) => toggleDailyCheckbox(i, lineIndex),
                                Object.fromEntries(
                                  Object.keys(dailyChecks)
                                    .filter(k => k.startsWith(`${i}-`))
                                    .map(k => [parseInt(k.split('-')[1]), true])
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* WEEKLY TAB */}
                  {guidelinesTab === 'weekly' && (
                    <div className="space-y-2 sm:space-y-3">
                      {carePlan.weeklyOverview.map((item, i) => {
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const todayName = dayNames[new Date().getDay()];
                        const isTodayDay = item.day === todayName;
                        const focusColors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-slate-200 text-slate-600'];
                        return (
                          <div
                            key={i}
                            onClick={() => openCarePlanModal('weeklyDay', i)}
                            className={`rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${isTodayDay ? 'bg-blue-50 ring-2 ring-blue-200 hover:bg-blue-100 active:bg-blue-200' : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200'}`}
                          >
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-bold text-sm sm:text-base text-slate-800">{item.day}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${focusColors[i]}`}>{item.focus}</span>
                              {isTodayDay && <span className="text-xs font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">TODAY</span>}
                            </div>
                            {(item.appointments || []).length > 0 && (
                              <div className="mb-1.5">
                                {(item.appointments || []).map((appt, j) => (
                                  <div key={j} className="text-xs sm:text-sm text-blue-600 font-medium">📍 {appt}</div>
                                ))}
                              </div>
                            )}
                            <div>
                              {renderNotes(item.notes, (lineIndex) => toggleCarePlanCheckbox('weeklyOverview', i, 'notes', lineIndex))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* GOALS TAB */}
                  {guidelinesTab === 'goals' && (
                    <div className="space-y-2 sm:space-y-3">
                      {carePlan.goals.map((item, i) => {
                        const borderColors = ['border-blue-400', 'border-emerald-400', 'border-amber-400', 'border-violet-400', 'border-rose-400'];
                        return (
                          <div
                            key={i}
                            onClick={() => openCarePlanModal('goal', i)}
                            className={`border-l-4 ${borderColors[i]} bg-slate-50 rounded-r-lg p-3 sm:p-4 cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-colors`}
                          >
                            <h4 className="font-bold text-sm sm:text-base text-slate-800 mb-1">{item.area}</h4>
                            <p className="text-sm text-slate-700 font-medium mb-1.5">{item.goal}</p>
                            <ul className="space-y-0.5 mb-1.5">
                              {(item.strategies || []).map((s, j) => (
                                <li key={j} className="text-xs sm:text-sm text-slate-600 flex items-start gap-1.5">
                                  <span className="text-slate-400 mt-0.5">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-1">
                              {renderNotes(item.notes, (lineIndex) => toggleCarePlanCheckbox('goals', i, 'notes', lineIndex))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* INFO TAB */}
                  {guidelinesTab === 'info' && (
                    <div className="space-y-4 sm:space-y-5">
                      {/* Communication */}
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-800 mb-2">Communication & Coordination</h4>
                        <ul className="space-y-1.5">
                          {carePlan.communication.map((item, i) => (
                            <li
                              key={i}
                              onClick={() => openCarePlanModal('communicationItem', i)}
                              className="text-xs sm:text-sm text-slate-600 flex items-start gap-1.5 cursor-pointer hover:bg-slate-100 active:bg-slate-200 rounded-lg p-1.5 -mx-1.5 transition-colors"
                            >
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Topics & Interests */}
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-800 mb-2">Topics & Interests</h4>
                        <div className="space-y-2">
                          {Object.entries(carePlan.topicsAndInterests).map(([category, items], i) => (
                            <div
                              key={category}
                              onClick={() => openCarePlanModal('topicsCategory', i)}
                              className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-colors"
                            >
                              <span className="text-xs font-bold text-slate-500 uppercase">{category}</span>
                              <p className="text-xs sm:text-sm text-slate-700 mt-0.5">{items.join(', ')}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Household */}
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-800 mb-2">Household Support</h4>
                        <ul className="space-y-1.5">
                          {carePlan.householdSupport.map((item, i) => (
                            <li
                              key={i}
                              onClick={() => openCarePlanModal('householdItem', i)}
                              className="text-xs sm:text-sm text-slate-600 flex items-start gap-1.5 cursor-pointer hover:bg-slate-100 active:bg-slate-200 rounded-lg p-1.5 -mx-1.5 transition-colors"
                            >
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Roster */}
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-800 mb-2">Roster / Hours / Covers</h4>
                        <ul className="space-y-1.5">
                          {carePlan.rosterHours.map((item, i) => (
                            <li
                              key={i}
                              onClick={() => openCarePlanModal('rosterItem', i)}
                              className="text-xs sm:text-sm text-slate-600 flex items-start gap-1.5 cursor-pointer hover:bg-slate-100 active:bg-slate-200 rounded-lg p-1.5 -mx-1.5 transition-colors"
                            >
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* CONTACTS VIEW */}
        {activeView === 'contacts' && (
          <div className="space-y-3">
            {/* Primary */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
              <span className="text-xs font-bold text-blue-500 uppercase">Primary Contact</span>
              <div className="flex items-center justify-between mt-3">
                <span className="text-base sm:text-lg font-bold text-slate-800">{GUIDELINES.contacts.primary.name}</span>
                <a
                  href={`tel:${GUIDELINES.contacts.primary.phone}`}
                  className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {GUIDELINES.contacts.primary.display}
                </a>
              </div>
            </div>

            {/* Family */}
            <span className="text-xs font-bold text-slate-400 uppercase block px-1">Family Contacts</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {GUIDELINES.contacts.family.map((contact) => (
                <a
                  key={contact.name}
                  href={`tel:${contact.phone}`}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5 hover:bg-slate-50 active:bg-slate-100 transition-colors block"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm sm:text-base font-bold text-slate-800">{contact.name}</span>
                    <span className="text-xs text-slate-400">({contact.age})</span>
                  </div>
                  <span className="text-sm text-blue-500 font-semibold">{contact.display}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.show && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >

            {modal.type === 'time' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">Edit Time</h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-5">
                  {modal.shiftId === 'morning'
                    ? 'If day shift ends at 9pm or later, night shift is removed'
                    : 'Adjust shift hours (30 min steps)'}
                </p>

                <div className="flex gap-2 sm:gap-4 mb-6 justify-center items-center">
                  <div className="text-center">
                    <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-2">From</label>
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <button
                        onClick={() => adjustTime('start', -1)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        −
                      </button>
                      <div className="w-16 sm:w-20 py-2 text-lg sm:text-2xl font-bold text-slate-800">
                        {formatTime(timeInputs.start)}
                      </div>
                      <button
                        onClick={() => adjustTime('start', 1)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center text-slate-300 text-xl sm:text-2xl pt-6">→</div>

                  <div className="text-center">
                    <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-2">To</label>
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <button
                        onClick={() => adjustTime('end', -1)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        −
                      </button>
                      <div className="w-16 sm:w-20 py-2 text-lg sm:text-2xl font-bold text-slate-800">
                        {formatTime(timeInputs.end)}
                      </div>
                      <button
                        onClick={() => adjustTime('end', 1)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {modal.type === 'name' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">Assign Carer</h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-4">Who's covering this shift?</p>
                {knownCarers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 font-medium mb-2">Quick pick</p>
                    <div className="flex flex-wrap gap-2">
                      {knownCarers.map((name) => {
                        const colors = generateColor(name);
                        return (
                          <div key={name} className={`${colors.bg} ${colors.text} rounded-full flex items-center`}>
                            <button
                              onClick={() => {
                                updateShiftData(modal.dateKey, modal.shiftId, { name });
                                closeModal();
                              }}
                              className="pl-3 py-1.5 text-sm font-semibold hover:opacity-80 active:opacity-60 transition-opacity"
                            >
                              {name}
                            </button>
                            <button
                              onClick={() => hideCarer(name)}
                              className="pl-1 pr-2 py-1.5 text-sm opacity-40 hover:opacity-80 active:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={knownCarers.length > 0 ? "Or type a name..." : "Enter name"}
                  className="w-full px-4 py-3 sm:py-4 border border-slate-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base sm:text-lg"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </>
            )}

            {modal.type === 'comment' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">Add Note</h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-4">Any details for this shift</p>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="e.g. confirmed, pending..."
                  className="w-full px-4 py-3 sm:py-4 border border-slate-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base sm:text-lg"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </>
            )}

            {modal.type === 'carePlan' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4">
                  {carePlanInputs.editType === 'daily' && 'Edit Routine'}
                  {carePlanInputs.editType === 'weeklyDay' && `Edit ${carePlanInputs.day}`}
                  {carePlanInputs.editType === 'goal' && 'Edit Goal'}
                  {carePlanInputs.editType === 'communicationItem' && 'Edit Communication'}
                  {carePlanInputs.editType === 'topicsCategory' && 'Edit Topics'}
                  {carePlanInputs.editType === 'householdItem' && 'Edit Household Task'}
                  {carePlanInputs.editType === 'rosterItem' && 'Edit Roster Info'}
                </h2>

                {carePlanInputs.editType === 'daily' && (
                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Time</label>
                      <input
                        value={carePlanInputs.time || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Label</label>
                      <input
                        value={carePlanInputs.label || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, label: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Routine</label>
                      <textarea
                        value={carePlanInputs.routine || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, routine: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Notes</label>
                      <textarea
                        value={carePlanInputs.notes || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      />
                    </div>
                  </div>
                )}

                {carePlanInputs.editType === 'weeklyDay' && (
                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Focus</label>
                      <input
                        value={carePlanInputs.focus || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, focus: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Appointments (one per line)</label>
                      <textarea
                        value={carePlanInputs.appointments || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, appointments: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Notes</label>
                      <textarea
                        value={carePlanInputs.notes || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      />
                    </div>
                  </div>
                )}

                {carePlanInputs.editType === 'goal' && (
                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Area</label>
                      <input
                        value={carePlanInputs.area || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, area: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Goal</label>
                      <input
                        value={carePlanInputs.goal || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, goal: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Strategies (one per line)</label>
                      <textarea
                        value={carePlanInputs.strategies || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, strategies: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Notes</label>
                      <textarea
                        value={carePlanInputs.notes || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      />
                    </div>
                  </div>
                )}

                {(carePlanInputs.editType === 'communicationItem' || carePlanInputs.editType === 'householdItem' || carePlanInputs.editType === 'rosterItem') && (
                  <div className="mb-6">
                    <textarea
                      value={carePlanInputs.text || ''}
                      onChange={e => setCarePlanInputs({ ...carePlanInputs, text: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      autoFocus
                    />
                  </div>
                )}

                {carePlanInputs.editType === 'topicsCategory' && (
                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Category</label>
                      <input
                        value={carePlanInputs.category || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, category: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm text-slate-500 font-medium block mb-1">Items (comma separated)</label>
                      <textarea
                        value={carePlanInputs.items || ''}
                        onChange={e => setCarePlanInputs({ ...carePlanInputs, items: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              {(modal.type === 'name' || modal.type === 'comment') && inputValue && (
                <button onClick={handleClear} className="px-4 py-3 text-red-500 bg-red-50 rounded-xl text-sm sm:text-base font-semibold hover:bg-red-100 active:bg-red-200 transition-colors">
                  Clear
                </button>
              )}
              <button
                onClick={closeModal}
                className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-xl text-sm sm:text-base font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 text-white bg-blue-500 rounded-xl text-sm sm:text-base font-semibold hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-3xl mx-auto flex">
          {[
            {
              id: 'roster',
              label: 'Roster',
              icon: (active) => (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                </svg>
              ),
            },
            {
              id: 'carePlan',
              label: 'Care Plan',
              icon: (active) => (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
              ),
            },
            {
              id: 'contacts',
              label: 'Contacts',
              icon: (active) => (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              ),
            },
          ].map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 pt-3 transition-colors ${
                  isActive ? 'text-blue-500' : 'text-slate-400'
                }`}
              >
                {tab.icon(isActive)}
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
