import React from 'react';

export const getPlatformIcon = (platform: string, sizeClass: string = "h-4 w-4") => {
  switch (platform.toUpperCase()) {
    case 'TWITTER': 
    case 'X':
      return <img src="/x.png" alt="X (Twitter)" className={sizeClass} />
    case 'LINKEDIN': 
      return <img src="/linkdin.png" alt="LinkedIn" className={sizeClass} />
    case 'INSTAGRAM': 
      return <img src="/insta.png" alt="Instagram" className={sizeClass} />
    case 'YOUTUBE': 
      return <img src="/youtube.png" alt="YouTube" className={sizeClass} />
    case 'FACEBOOK': 
      return <img src="/facebook.png" alt="Facebook" className={sizeClass} />
    case 'TIKTOK': 
      return <img src="/tiktok.png" alt="TikTok" className={sizeClass} />
    case 'WHATSAPP': 
      return <img src="/whatsapp.png" alt="WhatsApp" className={sizeClass} />
    case 'TELEGRAM': 
      return <img src="/telegram.png" alt="Telegram" className={sizeClass} />
    case 'THREADS': 
      return <img src="/threads.png" alt="Threads" className={sizeClass} />
    default: 
      return <img src="/globe.svg" alt="Platform" className={sizeClass} />
  }
};

export const getPlatformColor = (platform: string) => {
  switch (platform.toUpperCase()) {
    case 'TWITTER': 
    case 'X':
      return 'text-blue-400'
    case 'LINKEDIN': return 'text-blue-700'
    case 'INSTAGRAM': return 'text-pink-500'
    case 'YOUTUBE': return 'text-red-500'
    case 'FACEBOOK': return 'text-blue-600'
    default: return 'text-gray-500'
  }
};

export const generateAISuggestedTimes = (date: Date | string, platform: string): string[] => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Platform-specific optimal posting times in 24-hour format
  const platformTimes: { [key: string]: { weekday: string[], weekend: string[] } } = {
    'TWITTER': {
      weekday: ['09:00', '12:00', '17:00', '19:00'],
      weekend: ['09:00', '14:00', '18:00']
    },
    'X': {
      weekday: ['09:00', '12:00', '17:00', '19:00'],
      weekend: ['09:00', '14:00', '18:00']
    },
    'LINKEDIN': {
      weekday: ['08:00', '09:00', '12:00', '17:00'],
      weekend: ['08:00', '11:00', '15:00']
    },
    'INSTAGRAM': {
      weekday: ['11:00', '13:00', '15:00', '19:00'],
      weekend: ['10:00', '14:00', '17:00', '20:00']
    },
    'FACEBOOK': {
      weekday: ['09:00', '13:00', '15:00', '19:00'],
      weekend: ['10:00', '14:00', '18:00']
    },
    'YOUTUBE': {
      weekday: ['14:00', '17:00', '20:00'],
      weekend: ['11:00', '15:00', '19:00']
    }
  };
  
  const times = platformTimes[platform.toUpperCase()] || platformTimes['TWITTER'];
  return isWeekend ? times.weekend : times.weekday;
};
