// Conrad Weekly Care Plan — All content from the PDF (Updated October 2025)
// Edit this file to update guidelines content without touching UI code.

export const GUIDELINES = {
  updatedDate: 'October 2025',

  purpose:
    "This plan provides structure, clarity, and consistency for Conrad's weekly support schedule. It ensures carers have an overview of focus areas, appointments, activities, and communication guidelines.",

  welcomeCarers:
    "This document provides a shared guide for Conrad's care and weekly routine. It helps ensure a steady, flexible, and communicative team approach.",

  dailyStructure: [
    {
      time: '8:00 am',
      label: 'Morning',
      routine: 'Breakfast & morning medications, apply Exelon patches',
      notes: 'Light classical or jazz music, minimal conversation',
    },
    {
      time: '10:00 am',
      label: 'Mid-Morning',
      routine: 'Mid-morning meds, light exercise or craft',
      notes: 'Adjust if tired or engaged in another quiet activity',
    },
    {
      time: '12:00 pm',
      label: 'Lunch',
      routine: 'Lunch',
      notes: 'Allow time for rest afterward',
    },
    {
      time: '1:00–5:00 pm',
      label: 'Afternoon',
      routine: 'Appointments or nap/rest',
      notes: 'Adapt according to day, quiet environment',
    },
    {
      time: '5:00–9:00 pm',
      label: 'Evening',
      routine: 'Dinner, medications, leisure activities',
      notes: 'TV, music, reading. Prepare next day meds',
    },
  ],

  weeklyOverview: [
    {
      day: 'Monday',
      focus: 'Speech & Communication',
      appointments: ['1:00 pm Speech Therapy (Mona Vale)'],
      notes:
        'Morning rest, gentle start. After therapy, stop for coffee. Quiet activities, nap in afternoon, check meds',
    },
    {
      day: 'Tuesday',
      focus: 'Therapy & Movement',
      appointments: [
        '9:00 am Psychologist (Silver Minds)',
        '1:30 pm Physio (MGS Physiotherapy, Manly)',
      ],
      notes:
        'Morning walk after psychology if energy allows. Lunch, afternoon nap after physio. Music, evening activity, read, speech therapy exercises, colouring. Summer: mild sunset walk',
    },
    {
      day: 'Wednesday',
      focus: 'Therapy & Movement',
      appointments: ['10:00 am Gardening with neighbours'],
      notes:
        'Morning stretch/balance exercises, meditation, nap or gardening. Lunch, nap, grocery shop. Afternoon painting, baking, music. Optional outdoor reading. Watch The Front Bar. Check meds',
    },
    {
      day: 'Thursday',
      focus: 'Movement & Social',
      appointments: ['10:30 am Physio (MGS Physiotherapy, Manly)'],
      notes:
        'Meditation after breakfast. Walk to MGS if weather and energy allows. Ask if coffee after physio. Rest after physio. Afternoon reading or speech therapy exercises. Check meds',
    },
    {
      day: 'Friday',
      focus: 'Social & Communication',
      appointments: [],
      notes:
        'Swimming, walk or lunch out. Art gallery or sightseeing drive. Afternoon rest or creative activity. Reading, conversation, and speech therapy exercises. Check meds',
    },
    {
      day: 'Saturday',
      focus: 'Leisure & Routine',
      appointments: [],
      notes:
        'Read the Sydney Morning Herald, morning coffee ritual. Light activity (painting or short walk). Attend game or an outdoor sport if possible. Swimming if the weather and energy allow. Lunch, light afternoon activities. Check meds',
    },
    {
      day: 'Sunday',
      focus: 'Rest & Reflection',
      appointments: [],
      notes:
        'Flexible quiet day — reading, music, or movie. Optional walk or call with family. Check meds',
    },
  ],

  goals: [
    {
      area: 'Speech & Cognition',
      goal: 'Support progress with speech therapy and maintain engagement',
      strategies: [
        'Daily speech exercises (15–20 min)',
        'Happy Neuron or cognitive games',
        'Breathing exercises',
      ],
      notes: 'Adapt according to fatigue and mood',
    },
    {
      area: 'Mobility & Physical Strength',
      goal: 'Maintain mobility, flexibility, and confidence walking',
      strategies: [
        'Daily short walk (with supervision)',
        'Physio exercises (Tues/Thu)',
        'Gentle stretching or Yin yoga',
      ],
      notes: 'Prioritise safety and gradual movement',
    },
    {
      area: 'Creativity & Engagement',
      goal: 'Encourage joy, focus, and self-expression',
      strategies: [
        'Painting, craft, baking, music',
        'Support him in initiating ideas',
      ],
      notes: 'Use activities as opportunities for calm focus',
    },
    {
      area: 'Emotional Wellbeing',
      goal: 'Foster calm, comfort, and social connection',
      strategies: [
        'Quiet companionship',
        'Reading, music, or shared conversation',
      ],
      notes: 'Be mindful of energy; give space when needed',
    },
    {
      area: 'Independence & Routine',
      goal: 'Encourage autonomy while providing subtle support',
      strategies: [
        'Let Conrad lead where possible',
        'Support consistent medication and meal times',
      ],
      notes: 'Offer gentle prompting, not rushing',
    },
  ],

  communication: [
    'Communicate briefly but with continuity via the Mable platform daily invoicing under notes.',
    'Keep text messages during the shift with Juliet short and only if she asks.',
  ],

  topicsAndInterests: {
    Sports: ['AFL', 'Cricket', 'Tennis'],
    General: [
      'Gardening',
      'Botanical knowledge',
      'Travelling',
      'Cultural topics',
      'Trivia',
      'Quiz',
      'Crosswords',
    ],
    Music: ['Jazz', 'Classical Rock', 'Folk'],
    Mindfulness: ['Science', 'World topics'],
  },

  rosterHours: [
    'Maintain steady hours while remaining flexible and communicative with the team.',
    'Responsibility and care are key in supporting consistency for Conrad.',
    'Roster is kept privately; check weekly for any changes.',
  ],

  householdSupport: [
    'Meal preparation and tidy up after meals',
    'Take rubbish and compost bins out as needed',
    'Assist with laundry if requested by Juliet',
    'Josie attends for house cleaning every Thursday',
    'Josie to change Conrad\'s bedding every Thursday',
  ],

  contacts: {
    primary: { name: 'Juliet', phone: '0409287768', display: '0409 287 768' },
    family: [
      { name: 'Jack', age: 33, phone: '0438653753', display: '0438 653 753' },
      { name: 'Abby', age: 31, phone: '0407913331', display: '0407 913 331' },
      { name: 'Liv', age: 29, phone: '0407434226', display: '0407 434 226' },
      {
        name: 'Georgi',
        age: 22,
        phone: '0447337720',
        display: '0447 337 720',
      },
    ],
  },
};
