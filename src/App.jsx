import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, onValue, set } from 'firebase/database';

const DEFAULT_SHIFTS = [
  { id: 'morning', timeStart: '08:00', timeEnd: '17:00', icon: '☀️', label: 'Day' },
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

export default function App() {
  const [daysToShow, setDaysToShow] = useState(21);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [modal, setModal] = useState({ show: false, type: '', dateKey: '', shiftId: '' });
  const [inputValue, setInputValue] = useState('');
  const [timeInputs, setTimeInputs] = useState({ start: '', end: '' });

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
    
    for (let i = 0; i < daysToShow; i++) {
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
    const morningEnd = morningData.timeEnd || DEFAULT_SHIFTS[0].timeEnd;
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
    }
    
    setModal({ show: false, type: '', dateKey: '', shiftId: '' });
  };

  const handleClear = () => {
    const { type, dateKey, shiftId } = modal;
    
    if (type === 'name') {
      updateShiftData(dateKey, shiftId, { name: '' });
    } else if (type === 'comment') {
      updateShiftData(dateKey, shiftId, { comment: '' });
    }
    
    setModal({ show: false, type: '', dateKey: '', shiftId: '' });
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
            Conrad Carers Schedule
          </h1>
          <p className="text-xs sm:text-sm text-center text-slate-400 mt-1">
            Tap to edit {syncing && <span className="text-blue-500">• Syncing...</span>}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4">
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
                const eveningSuppressed = isEveningSuppressed(dateKey);
                
                const shiftsToShow = eveningSuppressed 
                  ? [DEFAULT_SHIFTS[0]]
                  : DEFAULT_SHIFTS;

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
                      className={`${today ? 'bg-blue-50' : weekend ? 'bg-slate-50' : 'bg-white'} ${isLastShift ? 'border-b-4 border-slate-200' : 'border-b border-slate-100'}`}
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
      </div>

      {/* Modal */}
      {modal.show && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" 
          onClick={() => setModal({ show: false, type: '', dateKey: '', shiftId: '' })}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md shadow-xl" 
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
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter name"
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

            <div className="flex gap-3">
              {(modal.type === 'name' || modal.type === 'comment') && inputValue && (
                <button onClick={handleClear} className="px-4 py-3 text-red-500 bg-red-50 rounded-xl text-sm sm:text-base font-semibold hover:bg-red-100 active:bg-red-200 transition-colors">
                  Clear
                </button>
              )}
              <button
                onClick={() => setModal({ show: false, type: '', dateKey: '', shiftId: '' })}
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
    </div>
  );
}
